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
    category?: 'standard' | 'apparel';
    fbaFeeManual?: number;
    inboundPlacementMode?: 'minimal' | 'partial' | 'optimized';
    defaultStorageMonth?: 'jan_sep' | 'oct_dec';
    defaultInventoryAge?: number;
}

// CSV表头映射
export const SKU_CSV_HEADERS = [
    '简称', '店铺', '款号', '父ASIN', 'ASIN', 'SKU', 'MSKU', '品名', 'Color', '颜色', '尺码', '运营'
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

        // 按颜色分组
        const colorMap = new Map<string, SkuItem[]>();
        groupItems.forEach(item => {
            const colorKey = item.Color || item.颜色 || '未知颜色';
            if (!colorMap.has(colorKey)) {
                colorMap.set(colorKey, []);
            }
            colorMap.get(colorKey)!.push(item);
        });

        const colorGroups: SkuColorGroup[] = [];
        colorMap.forEach((colorItems, color) => {
            // 尺码排序
            const sortedItems = sortBySize(colorItems);
            colorGroups.push({
                color,
                颜色: colorItems[0]?.颜色 || color,
                items: sortedItems,
                isExpanded: false,
            });
        });

        groups.push({
            parentAsin,
            款号: first.款号,
            品名: extractBaseName(first.品名),
            简称: first.简称 || '',
            店铺: first.店铺,
            运营: first.运营,
            colorGroups,
            totalSkuCount: groupItems.length,
            isExpanded: false,
        });
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
