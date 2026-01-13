/**
 * FBA Fee Calculator Utilities
 * FBA 配送费自动计算工具函数
 * 
 * 基于亚马逊 2024 年费用标准 (美国站)
 * https://sellercentral.amazon.com/help/hub/reference/G201112670
 */

// ============ 尺寸参数接口 ============
export interface FBADimensions {
    length: number;  // cm
    width: number;   // cm
    height: number;  // cm
    weight: number;  // kg
}

// ============ 产品分层 ============
export type ProductTier = 'small_standard' | 'large_standard' | 'large_bulky' | 'extra_large';

/**
 * 将 cm 转换为 inch
 */
const cmToInch = (cm: number): number => cm / 2.54;

/**
 * 将 kg 转换为 lb
 */
const kgToLb = (kg: number): number => kg * 2.20462;

/**
 * 计算体积重量 (Dimensional Weight)
 * 公式: (L × W × H) / 139
 */
const getDimensionalWeight = (lengthIn: number, widthIn: number, heightIn: number): number => {
    return (lengthIn * widthIn * heightIn) / 139;
};

/**
 * 获取产品分层 (Product Size Tier)
 * 根据亚马逊 2024 标准判断产品属于哪个尺寸级别
 */
export const getProductTier = (dims: FBADimensions): ProductTier => {
    const lengthIn = cmToInch(dims.length);
    const widthIn = cmToInch(dims.width);
    const heightIn = cmToInch(dims.height);
    const weightLb = kgToLb(dims.weight);

    // 按长边排序
    const sides = [lengthIn, widthIn, heightIn].sort((a, b) => b - a);
    const longest = sides[0];
    const median = sides[1];
    const shortest = sides[2];

    // Small Standard: <= 15oz, <= 18" x 14" x 8"
    if (weightLb <= 0.9375 && longest <= 18 && median <= 14 && shortest <= 8) {
        return 'small_standard';
    }

    // Large Standard: <= 20 lb, <= 18" longest side
    if (weightLb <= 20 && longest <= 18) {
        return 'large_standard';
    }

    // Large Bulky: <= 50 lb, <= 59" longest side, <= 130" (L + girth)
    const girth = 2 * (median + shortest);
    if (weightLb <= 50 && longest <= 59 && (longest + girth) <= 130) {
        return 'large_bulky';
    }

    return 'extra_large';
};

/**
 * 计算 FBA 配送费
 * 根据产品尺寸和重量自动计算 FBA 费用 (USD)
 * 
 * @param dims 产品尺寸和重量
 * @returns FBA 配送费 (USD)
 */
export const calculateFBAFee = (dims: FBADimensions): number => {
    const lengthIn = cmToInch(dims.length);
    const widthIn = cmToInch(dims.width);
    const heightIn = cmToInch(dims.height);
    const weightLb = kgToLb(dims.weight);

    const tier = getProductTier(dims);
    const dimWeight = getDimensionalWeight(lengthIn, widthIn, heightIn);
    const billableWeight = Math.max(weightLb, dimWeight);

    switch (tier) {
        case 'small_standard':
            // Small Standard 2024 费率
            if (weightLb <= 0.25) return 3.22;
            if (weightLb <= 0.5) return 3.40;
            if (weightLb <= 0.75) return 3.58;
            return 4.15; // 12-16 oz

        case 'large_standard':
            // Large Standard 2024 费率 (基于计费重量)
            if (billableWeight <= 0.5) return 3.86;
            if (billableWeight <= 1) return 4.30;
            if (billableWeight <= 1.5) return 4.78;
            if (billableWeight <= 2) return 5.17;
            if (billableWeight <= 2.5) return 5.39;
            if (billableWeight <= 3) return 5.81;
            // 3+ lb: 基础费 + 每磅增量
            return 5.81 + Math.ceil(billableWeight - 3) * 0.16;

        case 'large_bulky':
            // Large Bulky: $9.61 + 每磅额外费用
            return 9.61 + Math.max(0, billableWeight - 1) * 0.42;

        case 'extra_large':
            // Extra Large: 更高的基础费
            if (billableWeight <= 50) {
                return 26.33 + Math.max(0, billableWeight - 1) * 0.42;
            }
            if (billableWeight <= 70) {
                return 40.12 + Math.max(0, billableWeight - 51) * 0.80;
            }
            if (billableWeight <= 90) {
                return 54.88 + Math.max(0, billableWeight - 71) * 0.80;
            }
            // > 90 lb
            return 89.98 + Math.max(0, billableWeight - 91) * 0.80;

        default:
            return 5.00; // 默认估算值
    }
};

/**
 * 获取产品分层的中文描述
 */
export const getTierLabel = (tier: ProductTier): string => {
    const labels: Record<ProductTier, string> = {
        'small_standard': '小号标准',
        'large_standard': '大号标准',
        'large_bulky': '大件',
        'extra_large': '超大件',
    };
    return labels[tier];
};

/**
 * 根据产品信息计算 FBA 费用 (便捷方法)
 * 可直接传入 ProductSpec 对象
 */
export const calculateFBAFeeFromProduct = (product: {
    length: number;
    width: number;
    height: number;
    weight: number;
}): number => {
    return calculateFBAFee({
        length: product.length,
        width: product.width,
        height: product.height,
        weight: product.weight,
    });
};
