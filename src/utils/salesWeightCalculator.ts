import Papa from 'papaparse';
import { SkuParentGroup, SkuItem } from '../types/skuTypes';

interface SalesRow {
    '（父）ASIN': string;
    '（子）ASIN': string;
    '已订购商品数量': string;
    [key: string]: any;
}

/**
 * 根据销售报表计算SKU权重
 * 权重 = (该颜色销量占比) * (该尺码销量占比)
 */
export const calculateSalesWeights = async (
    files: File[],
    groups: SkuParentGroup[]
): Promise<SkuParentGroup[]> => {
    // 1. 合并所有文件的销量数据
    // Map<ChildASIN, TotalUnits>
    const salesMap = new Map<string, number>();

    for (const file of files) {
        await new Promise<void>((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const data = results.data as any[];
                    // 动态查找列名，防止BOM或细微差异
                    let childKey = '';
                    let unitsKey = '';

                    if (data.length > 0) {
                        const keys = Object.keys(data[0]);
                        childKey = keys.find(k => k.includes('子') && k.includes('ASIN')) || '';
                        unitsKey = keys.find(k => k.includes('已订购商品数量')) || '';
                    }

                    if (childKey && unitsKey) {
                        data.forEach(row => {
                            const asin = row[childKey];
                            const unitsStr = row[unitsKey];
                            // Remove commas and parse
                            const units = parseInt(String(unitsStr || '0').replace(/,/g, ''), 10) || 0;

                            if (asin) {
                                salesMap.set(asin, (salesMap.get(asin) || 0) + units);
                            }
                        });
                    }
                    resolve();
                },
                error: (err) => reject(err)
            });
        });
    }

    console.log('Sales Data Parsed:', salesMap.size, 'SKUs with sales.');

    // 2. 遍历SkuGroups计算权重
    const newGroups = groups.map(group => {
        // 收集该父体下所有子体
        const groupItems: SkuItem[] = [];
        group.colorGroups.forEach(cg => groupItems.push(...cg.items));

        if (groupItems.length === 0) return group;

        // 计算该父体的总销量，以及各颜色、各尺码的销量
        let totalGroupSales = 0;
        const colorSales = new Map<string, number>(); // Color -> Sales
        const sizeSales = new Map<string, number>(); // Size -> Sales
        const itemSales = new Map<string, number>(); // ChildASIN -> Sales

        groupItems.forEach(item => {
            const sales = salesMap.get(item.ASIN) || 0;
            itemSales.set(item.ASIN, sales);
            totalGroupSales += sales;

            if (sales > 0) {
                // 有销量才累计
                // 优先使用英文Color，其次中文颜色
                const colorKey = item.Color || item.颜色 || 'Unknown';
                const sizeKey = item.尺码 || 'Unknown';

                colorSales.set(colorKey, (colorSales.get(colorKey) || 0) + sales);
                sizeSales.set(sizeKey, (sizeSales.get(sizeKey) || 0) + sales);
            }
        });

        // 如果该父体没有任何销量数据，权重设为0 (或者保持undefined?)
        // 用户希望有权重。没销量就是0。
        if (totalGroupSales === 0) {
            const updatedColorGroups = group.colorGroups.map(cg => ({
                ...cg,
                items: cg.items.map(item => ({ ...item, salesWeight: 0 }))
            }));
            return { ...group, colorGroups: updatedColorGroups };
        }

        // 3. 计算每个子体的权重 = ColorRatio * SizeRatio
        const updatedColorGroups = group.colorGroups.map(cg => ({
            ...cg,
            items: cg.items.map(item => {
                const colorKey = item.Color || item.颜色 || 'Unknown';
                const sizeKey = item.尺码 || 'Unknown';

                const colorTotal = colorSales.get(colorKey) || 0;
                const sizeTotal = sizeSales.get(sizeKey) || 0;

                const colorRatio = colorTotal / totalGroupSales;
                const sizeRatio = sizeTotal / totalGroupSales;

                const weight = colorRatio * sizeRatio;

                return {
                    ...item,
                    salesWeight: parseFloat(weight.toFixed(4)), // 保留4位小数
                    salesInfo: {
                        colorSales: colorTotal,
                        sizeSales: sizeTotal,
                        totalSales: totalGroupSales
                    }
                };
            })
        }));

        return {
            ...group,
            colorGroups: updatedColorGroups,
        };
    });

    return newGroups;
};
