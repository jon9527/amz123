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
/**
 * 将 cm 转换为 inch
 */
export const cmToInch = (cm: number): number => cm / 2.54;

/**
 * 将 kg 转换为 lb
 */
export const kgToLb = (kg: number): number => kg * 2.20462;

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
/**
 * 获取产品分层 (Product Size Tier)
 * 根据亚马逊 2024 标准判断产品属于哪个尺寸级别
 * 
 * @param dims 尺寸信息
 * @returns 尺寸分层
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

    // Small Standard: <= 12oz (approx 0.75 lb), <= 15" x 12" x 0.75"
    // 注意：Apparel 的定义略有不同，但为了简化，这里先复用通用逻辑，主要区别在重量和费率
    if (weightLb <= 0.75 && longest <= 15 && median <= 12 && shortest <= 0.75) {
        return 'small_standard';
    }

    // Large Standard: <= 20 lb, <= 18" longest side
    if (weightLb <= 20 && longest <= 18 && median <= 14 && shortest <= 8) {
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
 * 基于亚马逊 2026 最新费用标准 (预估)
 * 包含了基于价格段的费率调整 (Price-Based Tiers)
 * 
 * @param dims 产品尺寸和重量
 * @param category 产品类目 ('standard' | 'apparel')
 * @param price 产品售价 (影响费率分段: <$10, $10-$50, >$50)
 * @returns FBA 配送费 (USD)
 */
// ============ 2026 Official Fee Tables (Effective Jan 15, 2026) ============

// 1. Low-Price FBA Rates (<$10) - Non-Peak
const FBA_2026_LOW_PRICE_RATES = {
    small_standard: [
        { maxWeight: 0.125, fee: 2.43 }, // 2 oz
        { maxWeight: 0.25, fee: 2.49 }, // 4 oz
        { maxWeight: 0.375, fee: 2.56 }, // 6 oz
        { maxWeight: 0.50, fee: 2.66 }, // 8 oz
        { maxWeight: 0.625, fee: 2.77 }, // 10 oz
        { maxWeight: 0.75, fee: 2.82 }, // 12 oz
        { maxWeight: 0.875, fee: 2.92 }, // 14 oz
        { maxWeight: 1.0, fee: 2.95 }, // 16 oz
    ],
    large_standard: [
        { maxWeight: 0.25, fee: 2.91 },  // 4 oz
        { maxWeight: 0.50, fee: 3.13 },  // 8 oz
        { maxWeight: 0.75, fee: 3.38 },  // 12 oz
        { maxWeight: 1.0, fee: 3.78 },  // 16 oz
        { maxWeight: 1.25, fee: 4.22 },
        { maxWeight: 1.50, fee: 4.60 },
        { maxWeight: 1.75, fee: 4.75 },
        { maxWeight: 2.00, fee: 5.00 },
        { maxWeight: 2.25, fee: 5.10 },
        { maxWeight: 2.50, fee: 5.28 },
        { maxWeight: 2.75, fee: 5.44 },
        { maxWeight: 3.00, fee: 5.85 },
    ]
};

// 2. Standard FBA Rates ($10 - $50) - Non-Peak
const FBA_2026_STANDARD_RATES = {
    non_apparel: {
        small_standard: [
            { maxWeight: 0.125, fee: 3.32 },
            { maxWeight: 0.25, fee: 3.42 },
            { maxWeight: 0.375, fee: 3.45 },
            { maxWeight: 0.50, fee: 3.50 },
            { maxWeight: 0.625, fee: 3.64 },
            { maxWeight: 0.75, fee: 3.75 },
            { maxWeight: 0.875, fee: 3.89 },
            { maxWeight: 1.0, fee: 4.08 },
        ],
        large_standard: [
            { maxWeight: 0.25, fee: 3.32 },
            { maxWeight: 0.50, fee: 3.52 },
            { maxWeight: 0.75, fee: 3.75 },
            { maxWeight: 1.00, fee: 4.10 },
            { maxWeight: 1.25, fee: 4.47 },
            { maxWeight: 1.50, fee: 4.85 },
            { maxWeight: 1.75, fee: 5.08 },
            { maxWeight: 2.00, fee: 5.33 },
            { maxWeight: 2.50, fee: 5.60 },
            { maxWeight: 3.00, fee: 5.92 },
        ]
    },
    apparel: {
        small_standard: [
            { maxWeight: 0.125, fee: 3.68 },
            { maxWeight: 0.25, fee: 3.78 },
            { maxWeight: 0.375, fee: 3.85 },
            { maxWeight: 0.50, fee: 3.85 },
            { maxWeight: 0.625, fee: 4.05 },
            { maxWeight: 0.75, fee: 4.05 },
            { maxWeight: 0.875, fee: 4.60 },
            { maxWeight: 1.0, fee: 4.60 },
        ],
        large_standard: [
            { maxWeight: 0.25, fee: 4.08 },
            { maxWeight: 0.50, fee: 4.30 },
            { maxWeight: 0.75, fee: 4.56 },
            { maxWeight: 1.00, fee: 4.95 },
            { maxWeight: 1.25, fee: 5.04 },
            { maxWeight: 1.50, fee: 5.42 },
            { maxWeight: 2.00, fee: 6.05 },
            { maxWeight: 2.50, fee: 6.45 },
            { maxWeight: 3.00, fee: 6.81 },
        ]
    }
};

// NOTE: INBOUND_PLACEMENT_MINIMAL_2026 data removed - use getInboundPlacementFee() instead

// 4. Monthly Storage Fees (2026)
const MONTHLY_STORAGE_RATES = {
    jan_sep: { standard: 0.78, oversize: 0.56 },
    oct_dec: { standard: 2.40, oversize: 1.40 }
};

// 5. Aged Inventory Surcharge (Long Term Storage)
// Age > 181 days. Apparel Exempt 181-270.
const AGED_INVENTORY_RATES = [
    { minDays: 181, maxDays: 210, fee: 0.50, apparelExempt: true },
    { minDays: 211, maxDays: 240, fee: 1.00, apparelExempt: true },
    { minDays: 241, maxDays: 270, fee: 1.50, apparelExempt: true },
    { minDays: 271, maxDays: 300, fee: 5.45, apparelExempt: false },
    { minDays: 301, maxDays: 330, fee: 5.70, apparelExempt: false },
    { minDays: 331, maxDays: 365, fee: 5.90, apparelExempt: false },
    { minDays: 366, maxDays: 9999, fee: 7.90, apparelExempt: false },
];

// 6. Removal & Disposal Fees (2026)
// Small (<0.5lb) Reduced to $0.84
const REMOVAL_DISPOSAL_RATES = {
    standard: [
        { maxWeight: 0.5, fee: 0.84 },
        { maxWeight: 1.0, fee: 1.53 },
        { maxWeight: 2.0, fee: 2.27 },
        { maxWeight: 100, fee: 2.89, perLb: 1.06, baseWeight: 2.0 } // 2.89 + 1.06/lb > 2lb
    ]
};

// 7. Returns Processing Fees (2026)
const RETURNS_PROCESSING_RATES = {
    apparel: {
        small_standard: [
            { maxWeight: 0.25, fee: 1.65 }, // < 4oz
            { maxWeight: 0.50, fee: 1.70 },
            { maxWeight: 0.75, fee: 1.80 },
            { maxWeight: 1.00, fee: 1.95 },
        ],
        large_standard: [
            { maxWeight: 0.25, fee: 2.04 },
            { maxWeight: 0.50, fee: 2.15 },
            { maxWeight: 1.00, fee: 2.27 },
            { maxWeight: 1.50, fee: 2.47 },
            { maxWeight: 2.00, fee: 2.98 },
            { maxWeight: 3.00, fee: 3.33 }, // Est
        ]
    }
    // Non-apparel only applies if High Return Rate, user usually wants standard logic or apparel logic.
    // We will support Apparel primarily as per user App context.
};


// ============ Helper Functions ============

const getFeeFromList = (weightLb: number, list: { maxWeight: number, fee: number, perLb?: number, baseWeight?: number }[]): number => {
    for (const item of list) {
        if (weightLb <= item.maxWeight) return item.fee;
    }
    // Handle overflow if defined
    const last = list[list.length - 1];
    if (last.perLb && last.baseWeight) {
        const excess = Math.max(0, weightLb - last.baseWeight);
        return last.fee + (Math.ceil(excess) * last.perLb); // Usually per lb or fraction
    }
    return last.fee;
};

/**
 * Calculate Inbound Placement Fee
 */
export const getInboundPlacementFee = (tier: ProductTier, weightLb: number, mode: 'minimal' | 'partial' | 'optimized' = 'optimized'): number => {
    if (mode === 'optimized') return 0;
    if (mode === 'partial') return 0; // Simplified for now, usually needs separate table

    // Minimal Split (Most expensive)
    if (tier === 'small_standard') {
        // Simplified Map
        if (weightLb <= 0.5) return 0.23;
        return 0.32;
    }
    if (tier === 'large_standard') {
        if (weightLb <= 1.0) return 0.36;
        if (weightLb <= 2.0) return 0.42;
        return 0.60; // Avg for heavier
    }
    return 1.50; // Oversize estimate
};

/**
 * Calculate Monthly Storage Fee
 */
export const getMonthlyStorageFee = (tier: ProductTier, lengthIn: number, widthIn: number, heightIn: number, season: 'jan_sep' | 'oct_dec' = 'jan_sep'): number => {
    const volumeCuFt = (lengthIn * widthIn * heightIn) / 1728;
    const isOversize = tier === 'large_bulky' || tier === 'extra_large'; // Simplified check
    const rate = isOversize ? MONTHLY_STORAGE_RATES[season].oversize : MONTHLY_STORAGE_RATES[season].standard;
    return parseFloat((volumeCuFt * rate).toFixed(2));
};

/**
 * Calculate Removal / Disposal Fee
 */
export const getRemovalDisposalFee = (_tier: ProductTier, weightLb: number): number => {
    // Assuming Standard Size for most apparel
    return getFeeFromList(weightLb, REMOVAL_DISPOSAL_RATES.standard);
};

/**
 * Calculate Returns Processing Fee
 */
export const getReturnsProcessingFee = (tier: ProductTier, weightLb: number, category: 'standard' | 'apparel'): number => {
    if (category !== 'apparel') return 0; // Only charge for Apparel by default (unless High Return Rate non-apparel)

    if (tier === 'small_standard') {
        return getFeeFromList(weightLb, RETURNS_PROCESSING_RATES.apparel.small_standard);
    }
    if (tier === 'large_standard') {
        return getFeeFromList(weightLb, RETURNS_PROCESSING_RATES.apparel.large_standard);
    }
    return 0; // Config for oversize apparel if any
};

/**
 * Calculate Aged Inventory Surcharge
 * Based on inventory age in days and product volume
 * @param tier Product tier
 * @param lengthIn Length in inches
 * @param widthIn Width in inches
 * @param heightIn Height in inches
 * @param inventoryDays Age of inventory in days
 * @param category Product category (apparel exempt 181-270 days)
 */
export const getAgedInventorySurcharge = (
    _tier: ProductTier,
    lengthIn: number,
    widthIn: number,
    heightIn: number,
    inventoryDays: number,
    category: 'standard' | 'apparel' = 'standard'
): number => {
    if (inventoryDays < 181) return 0;

    const volumeCuFt = (lengthIn * widthIn * heightIn) / 1728;

    // Find applicable rate bracket
    for (const bracket of AGED_INVENTORY_RATES) {
        if (inventoryDays >= bracket.minDays && inventoryDays <= bracket.maxDays) {
            // Check apparel exemption
            if (bracket.apparelExempt && category === 'apparel') {
                return 0;
            }

            // For 366+ days, calculate max of (per-cuft OR per-unit)
            if (bracket.minDays >= 366) {
                const cuFtFee = volumeCuFt * bracket.fee;
                const perUnitFee = inventoryDays >= 456 ? 0.35 : 0.30; // 2026 rates
                return parseFloat(Math.max(cuFtFee, perUnitFee).toFixed(2));
            }

            return parseFloat((volumeCuFt * bracket.fee).toFixed(2));
        }
    }
    return 0;
};

/**
 * Calculate Disposal Fee (same as Removal)
 */
export const getDisposalFee = (_tier: ProductTier, weightLb: number): number => {
    return getRemovalDisposalFee(_tier, weightLb);
};

/**
 * Master function: Calculate all FBA fees for a product
 * Returns all 7 fee types calculated based on product dimensions and configs
 */
export interface AllProductFees {
    fbaShippingFee: number;      // Core fulfillment fee
    inboundPlacementFee: number; // Inbound placement service fee
    monthlyStorageFee: number;   // Monthly storage fee (per month)
    agedInventoryFee: number;    // Aged inventory surcharge (per month)
    removalFee: number;          // Removal fee (per unit)
    disposalFee: number;         // Disposal fee (per unit)
    returnsProcessingFee: number;// Returns processing fee (per return)
    totalMonthlyFees: number;    // Combined monthly recurring fees
    tier: ProductTier;           // Product size tier
}

export const calculateAllProductFees = (
    dims: FBADimensions,
    options: {
        category?: 'standard' | 'apparel';
        price?: number;
        placementMode?: 'minimal' | 'partial' | 'optimized';
        storageMonth?: 'jan_sep' | 'oct_dec';
        inventoryDays?: number;
    } = {}
): AllProductFees => {
    const {
        category = 'standard',
        price = 20,
        placementMode = 'optimized',
        storageMonth = 'jan_sep',
        inventoryDays = 0,
    } = options;

    const lengthIn = cmToInch(dims.length);
    const widthIn = cmToInch(dims.width);
    const heightIn = cmToInch(dims.height);
    const weightLb = kgToLb(dims.weight);
    const tier = getProductTier(dims);

    const fbaShippingFee = calculateFBAFee(dims, category, price);
    const inboundPlacementFee = getInboundPlacementFee(tier, weightLb, placementMode);
    const monthlyStorageFee = getMonthlyStorageFee(tier, lengthIn, widthIn, heightIn, storageMonth);
    const agedInventoryFee = getAgedInventorySurcharge(tier, lengthIn, widthIn, heightIn, inventoryDays, category);
    const removalFee = getRemovalDisposalFee(tier, weightLb);
    const disposalFee = removalFee; // Same rates
    const returnsProcessingFee = getReturnsProcessingFee(tier, weightLb, category);

    const totalMonthlyFees = monthlyStorageFee + agedInventoryFee;

    return {
        fbaShippingFee,
        inboundPlacementFee,
        monthlyStorageFee,
        agedInventoryFee,
        removalFee,
        disposalFee,
        returnsProcessingFee,
        totalMonthlyFees,
        tier,
    };
};



/**
 * 计算 FBA 配送费 (2026 Official)
 * @param dims 产品尺寸
 * @param category 类目
 * @param price 售价
 */
export const calculateFBAFee = (dims: FBADimensions, category: 'standard' | 'apparel' = 'standard', price: number = 20): number => {
    const lengthIn = cmToInch(dims.length);
    const widthIn = cmToInch(dims.width);
    const heightIn = cmToInch(dims.height);
    const weightLb = kgToLb(dims.weight);
    const tier = getProductTier(dims);
    const dimWeight = getDimensionalWeight(lengthIn, widthIn, heightIn);
    const billableWeight = Math.max(weightLb, dimWeight);

    // 1. Low-Price FBA (< $10)
    if (price < 10 && (tier === 'small_standard' || tier === 'large_standard')) {
        const rates = FBA_2026_LOW_PRICE_RATES[tier];
        return getFeeFromList(billableWeight, rates);
    }

    // 2. Standard FBA ($10 - $50)
    let baseFee = 0;

    if (category === 'apparel') {
        if (tier === 'small_standard') {
            baseFee = getFeeFromList(billableWeight, FBA_2026_STANDARD_RATES.apparel.small_standard);
        } else if (tier === 'large_standard') {
            baseFee = getFeeFromList(billableWeight, FBA_2026_STANDARD_RATES.apparel.large_standard);
        } else if (tier === 'large_bulky') {
            baseFee = 9.88 + Math.ceil(Math.max(0, billableWeight - 1)) * 0.42; // Verified 2026 Bulky: 9.61 + 0.27
        } else {
            baseFee = 24.25 + Math.ceil(Math.max(0, billableWeight - 1)) * 0.42;
        }

    } else {
        // Non-Apparel
        if (tier === 'small_standard') {
            baseFee = getFeeFromList(billableWeight, FBA_2026_STANDARD_RATES.non_apparel.small_standard);
        } else if (tier === 'large_standard') {
            baseFee = getFeeFromList(billableWeight, FBA_2026_STANDARD_RATES.non_apparel.large_standard);
        } else if (tier === 'large_bulky') {
            baseFee = 9.88 + Math.ceil(Math.max(0, billableWeight - 1)) * 0.42;
        } else {
            baseFee = 24.25 + Math.ceil(Math.max(0, billableWeight - 1)) * 0.42;
        }
    }

    // 3. Premium Surcharge (Price > $50)
    if (price > 50 && (tier === 'small_standard' || tier === 'large_standard')) {
        baseFee += 0.26;
    }

    return parseFloat(baseFee.toFixed(2));
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
    category?: 'standard' | 'apparel';
    defaultPrice?: number;
}): number => {
    return calculateFBAFee({
        length: product.length,
        width: product.width,
        height: product.height,
        weight: product.weight,
    }, product.category, product.defaultPrice || 20);
};
