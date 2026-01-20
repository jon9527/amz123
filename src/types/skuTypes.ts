/**
 * 服装SKU相关类型定义
 * 用于CSV导入和父子体分级显示
 */

// CSV原始行数据
export interface SkuItem {
    id: string;           // 自动生成的UUID
    简称: string;
    店铺: string;
    款号: string;
    父ASIN: string;
    ASIN: string;
    SKU: string;
    MSKU: string;
    品名: string;
    Color: string;        // 英文颜色
    颜色: string;         // 中文颜色
    尺码: string;
    运营: string;
    salesWeight?: number; // 销售权重 (颜色占比 * 尺码占比)
    salesInfo?: {
        colorSales: number;
        sizeSales: number;
        totalSales: number;
    };
    manualType?: string; // 手动指定的类型 (CSV读取)
}

// 颜色分组
export interface SkuColorGroup {
    color: string;        // 英文颜色 (用于分组key)
    颜色: string;         // 中文颜色 (用于显示)
    items: SkuItem[];     // 该颜色下的所有尺码SKU
    isExpanded?: boolean; // 展开状态
}

// 父体分组 (按父ASIN分组)
export interface SkuParentGroup {
    parentAsin: string;   // 父ASIN (唯一标识)
    款号: string;
    品名: string;         // 取第一条记录的品名
    简称: string;
    店铺: string;
    运营: string;
    colorGroups: SkuColorGroup[];
    totalSkuCount: number;
    isExpanded?: boolean; // 展开状态

    // --- 扩展属性 (用于父体维度编辑) ---
    length?: number;
    width?: number;
    height?: number;
    weight?: number;

    // 整箱
    boxLength?: number;
    boxWidth?: number;
    boxHeight?: number;
    boxWeight?: number;
    pcsPerBox?: number;

    // 价格
    unitCost?: number;
    defaultPrice?: number;

    // 其他
    tags?: string;
    notes?: string;

    // FBA配置
    category?: 'standard' | 'apparel';  // FBA费率：标准/服装
    fbaFeeManual?: number;
    inboundPlacementMode?: 'minimal' | 'partial' | 'optimized';
    defaultStorageMonth?: 'jan_sep' | 'oct_dec';
    defaultInventoryAge?: number;

    // 产品类型（Tab分类用）
    displayType?: 'standard' | 'apparel' | 'multi' | 'single';  // 标品/服装/多变体/单变体

    // 分类信息（遗留字段，保持兼容）
    variantType?: SkuVariantType;
    productType?: SkuProductType;
    classificationReason?: string;
}

// CSV表头映射 (分类在第一列)
export const SKU_CSV_HEADERS = [
    '分类', '简称', '店铺', '款号', '父ASIN', 'ASIN', 'SKU', 'MSKU', '品名', 'Color', '颜色', '尺码', '运营'
] as const;

/**
 * 将原始SKU列表按父ASIN分组
 */
export function groupSkuByParent(items: SkuItem[]): SkuParentGroup[] {
    const parentMap = new Map<string, SkuItem[]>();

    // 按父ASIN分组
    items.forEach(item => {
        const key = item.父ASIN || item.款号; // 如果无父ASIN则用款号
        if (!parentMap.has(key)) {
            parentMap.set(key, []);
        }
        parentMap.get(key)!.push(item);
    });

    // 转换为ParentGroup结构
    const groups: SkuParentGroup[] = [];

    parentMap.forEach((groupItems, parentAsin) => {
        const first = groupItems[0];

        // 按颜色分组 (优先使用中文颜色作为分组Key，以聚合 "Black01", "Black02" 等)
        const colorMap = new Map<string, SkuItem[]>();
        groupItems.forEach(item => {
            // 策略调整：优先使用中文颜色，因为用户反馈英文Color字段常含杂乱后缀导致无法聚合
            const colorKey = item.颜色 || item.Color || '未知颜色';
            if (!colorMap.has(colorKey)) {
                colorMap.set(colorKey, []);
            }
            colorMap.get(colorKey)!.push(item);
        });

        const colorGroups: SkuColorGroup[] = [];
        colorMap.forEach((colorItems, key) => {
            // 尺码排序
            const sortedItems = sortBySize(colorItems);
            const first = sortedItems[0];

            colorGroups.push({
                color: first.Color || key, // English field: attempt to use the first item's English color, else fallback to key
                颜色: first.颜色 || key,   // Chinese field: attempt to use first item's Chinese color, else fallback to key
                items: sortedItems,
                isExpanded: false,
            });
        });

        const group: SkuParentGroup = {
            parentAsin,
            款号: first.款号,
            品名: extractBaseName(first.品名),
            简称: first.简称 || '',
            店铺: first.店铺,
            运营: first.运营,
            colorGroups,
            totalSkuCount: groupItems.length,
            isExpanded: false,
        };

        // 计算分类
        const classification = classifySkuGroup(group);
        group.variantType = classification.variantType;
        group.productType = classification.productType;
        group.classificationReason = classification.reason;

        // Explicitly set displayType relative to product/variant type
        if (group.productType === 'apparel') {
            group.displayType = 'apparel';
        } else if (group.variantType === 'single') {
            group.displayType = 'single';
        } else if (group.variantType === 'multi') {
            group.displayType = 'multi';
        } else {
            group.displayType = 'standard';
        }

        groups.push(group);
    });

    return groups;
}

/**
 * 从品名中提取基础名称（去掉颜色尺码后缀）
 */
function extractBaseName(name: string): string {
    // 常见尺码后缀
    const sizeSuffixes = /\s*[XSML23456]+$|S码|M码|L码|XL码|2XL码|3XL码|XXL码$/i;
    return name.replace(sizeSuffixes, '').trim();
}

/**
 * 按尺码排序
 */
function sortBySize(items: SkuItem[]): SkuItem[] {
    const sizeOrder: Record<string, number> = {
        'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5,
        '2XL': 6, 'XXL': 6, '3XL': 7, '4XL': 8, '5XL': 9,
        '28': 10, '29': 11, '30': 12, '31': 13, '32': 14,
    };

    return [...items].sort((a, b) => {
        const orderA = sizeOrder[a.尺码?.toUpperCase()] ?? 99;
        const orderB = sizeOrder[b.尺码?.toUpperCase()] ?? 99;
        return orderA - orderB;
    });
}

/**
 * 检测变体维度
 */
export function detectVariantDimensions(items: SkuItem[]): ('Color' | '尺码')[] {
    const colors = new Set(items.map(i => i.Color || i.颜色));
    const sizes = new Set(items.map(i => i.尺码));

    const dims: ('Color' | '尺码')[] = [];
    if (colors.size > 1) dims.push('Color');
    if (sizes.size > 1) dims.push('尺码');
    return dims;
}

/**
 * 变体类型定义
 */
export type SkuVariantType = 'single' | 'multi'; // 单变体 | 多变体
export type SkuProductType = 'standard' | 'apparel'; // 标品 | 服装 (这里作为大类，虽然标品也可能有单/多变体，但在UI上通常标品很少有多变体)

/**
 * 完整的分类结果
 */
export interface SkuClassification {
    variantType: SkuVariantType;
    productType: SkuProductType;
    reason: string; //由于什么原因被归类
}

/**
 * 服装关键词 (用于启发式判断)
 */
const APPAREL_KEYWORDS = [
    'shirt', 'pant', 'dress', 'short', 'bra', 'sock', 'underwear', 'shoe',
    '瑜伽', '裤', '衫', '裙', '鞋', '衣', '套', '装', '袜', 'T恤'
];

/**
 * 检测是否有真正的父子关系 (父ASIN ≠ 子ASIN)
 */
function hasParentChildRelation(items: SkuItem[]): boolean {
    return items.some(item => item.父ASIN && item.ASIN && item.父ASIN !== item.ASIN);
}

/**
 * 检测是否所有子ASIN都等于父ASIN (标品特征)
 */
function isStandardProduct(items: SkuItem[]): boolean {
    if (items.length !== 1) return false;
    const item = items[0];
    // 标品: 只有1个SKU 且 (无父ASIN 或 父ASIN==子ASIN)
    return !item.父ASIN || item.父ASIN === item.ASIN;
}

/**
 * 对Sku组进行分类
 * 
 * 分类逻辑 (ASIN关系优先):
 * 1. 标准: 父ASIN == 子ASIN 且 只有1个SKU
 * 2. 服装: 有父子关系 + 颜色+尺码双属性 + 服装关键词
 * 3. 多变体: 有父子关系 + 颜色+尺码双属性 + 无服装关键词
 * 4. 单变体: 有父子关系 + 只有单一属性变化 (≥2个SKU)
 */
export function classifySkuGroup(group: SkuParentGroup): SkuClassification {
    const items = group.colorGroups.flatMap(g => g.items);

    // 1. 优先检查手动类型 (取第一个有值的)
    const manualType = items.find(i => i.manualType)?.manualType?.trim().toLowerCase();
    if (manualType) {
        if (['标品', 'standard', '标准'].includes(manualType)) {
            return { variantType: 'single', productType: 'standard', reason: '手动指定: 标准' };
        }
        if (['服装', 'apparel'].includes(manualType)) {
            return { variantType: 'multi', productType: 'apparel', reason: '手动指定: 服装' };
        }
        if (['单变体', 'single'].includes(manualType)) {
            return { variantType: 'single', productType: 'standard', reason: '手动指定: 单变体' };
        }
        if (['多变体', 'multi'].includes(manualType)) {
            return { variantType: 'multi', productType: 'standard', reason: '手动指定: 多变体' };
        }
    }

    // ========== 2. 优先特征检测 (服装) ==========
    // 即使是单个SKU，如果特征符合服装，也应归为服装
    const nameLower = group.品名.toLowerCase();
    const isApparelKeyword = APPAREL_KEYWORDS.some(kw => nameLower.includes(kw.toLowerCase()));

    // 检查是否有服装相关的列数据 (非空)
    const hasColorData = items.some(i => i.Color || i.颜色);
    const hasSizeData = items.some(i => i.尺码);
    const hasApparelAttributes = hasColorData || hasSizeData;

    if (isApparelKeyword && hasApparelAttributes) {
        // 判定变体类型: 只有1个SKU且无父子关系才算single，否则视为multi结构(即使当前只导入了1个)
        let vType: SkuVariantType = 'multi';
        if (items.length === 1 && (!items[0].父ASIN || items[0].父ASIN === items[0].ASIN)) {
            vType = 'single';
        }
        return { variantType: vType, productType: 'apparel', reason: '特征检测: 服装关键词 + 属性列' };
    }


    // ========== ASIN关系判断 (优先) ==========

    // 3. 标准 (Standard): 只有1个SKU 且 父ASIN==子ASIN (或无父ASIN)
    if (isStandardProduct(items)) {
        return { variantType: 'single', productType: 'standard', reason: '标准: 单SKU且父子ASIN相同' };
    }

    // 4. 变体商品: 有父子关系 (父ASIN ≠ 子ASIN)
    const hasVariants = hasParentChildRelation(items);
    if (!hasVariants && items.length > 1) {
        // 多个SKU但没有父子关系，可能是数据异常，归为标准
        return { variantType: 'single', productType: 'standard', reason: '标准: 多SKU但无父子关系' };
    }

    // ========== 属性变化检测 ==========
    const dims = detectVariantDimensions(items);
    const hasColor = dims.includes('Color');
    const hasSize = dims.includes('尺码');
    const hasDualAttributes = hasColor && hasSize; // 双属性 (颜色+尺码)
    const hasSingleAttribute = dims.length === 1;  // 单一属性


    // 5. 多变体: 有父子关系 + 双属性(颜色+尺码) + 无服装关键词
    if (hasDualAttributes && !isApparelKeyword) {
        return { variantType: 'multi', productType: 'standard', reason: '多变体: 颜色+尺码双属性 (非服装)' };
    }

    // 6. 单变体: 有父子关系 + 只有单一属性变化 + ≥2个SKU
    if (hasSingleAttribute && items.length >= 2) {
        const attrName = hasColor ? '颜色' : '尺码';
        return { variantType: 'single', productType: 'standard', reason: `单变体: 仅${attrName}变化` };
    }

    // 7. 默认情况 (其他场景，可能是数据异常)
    return { variantType: 'multi', productType: 'standard', reason: '默认: 无法明确分类' };
}
