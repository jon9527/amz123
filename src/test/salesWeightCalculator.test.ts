import { describe, it, expect } from 'vitest';
import { calculateWeightsForGroups } from '../utils/salesWeightCalculator';
import { SkuParentGroup, SkuItem } from '../types/skuTypes';

describe('calculateWeightsForGroups', () => {
    // Helper to create basic group
    const createGroup = (
        variantType: 'multi' | 'single',
        productType: 'apparel' | 'standard' = 'apparel'
    ): SkuParentGroup => ({
        parentAsin: 'P1',
        款号: 'K1',
        品名: 'Test Product',
        简称: 'Test',
        店铺: 'Store',
        运营: 'Ops',
        colorGroups: [],
        totalSkuCount: 0,
        isExpanded: false,
        length: 10, width: 10, height: 10, weight: 1,
        boxLength: 10, boxWidth: 10, boxHeight: 10, boxWeight: 1,
        pcsPerBox: 10, unitCost: 10, defaultPrice: 20,
        tags: '', notes: '', category: 'apparel',
        fbaFeeManual: 0, inboundPlacementMode: 'optimized',
        defaultStorageMonth: 'jan_sep', defaultInventoryAge: 0,
        variantType,
        productType
    });

    const createItem = (sku: string, color: string, size: string, asin: string): SkuItem => ({
        id: sku,
        简称: 'Test',
        店铺: 'Store',
        款号: 'K1',
        父ASIN: 'P1',
        ASIN: asin,
        SKU: sku,
        MSKU: sku,
        品名: `Test ${color} ${size}`,
        Color: color,
        颜色: color,
        尺码: size,
        运营: 'Ops',
        salesWeight: 0,
        salesInfo: { colorSales: 0, sizeSales: 0, totalSales: 0 }
    });

    it('should calculate weights for Apparel (Color * Size)', () => {
        // Setup scenarios
        // Red: S(10), M(0) -> Color Sales: 10
        // Blue: S(10), M(20) -> Color Sales: 30
        // Total Sales: 40
        // Size S Total: 20 (Red 10 + Blue 10)
        // Size M Total: 20 (Red 0 + Blue 20)

        const items = [
            createItem('R-S', 'Red', 'S', 'A1'),
            createItem('R-M', 'Red', 'M', 'A2'),
            createItem('B-S', 'Blue', 'S', 'A3'),
            createItem('B-M', 'Blue', 'M', 'A4'),
        ];

        const group = createGroup('multi', 'apparel');
        group.colorGroups = [
            { color: 'Red', 颜色: 'Red', items: [items[0], items[1]] },
            { color: 'Blue', 颜色: 'Blue', items: [items[2], items[3]] }
        ];
        group.totalSkuCount = 4;

        // Sales Map
        const salesMap = new Map<string, number>();
        salesMap.set('A1', 10);
        salesMap.set('A2', 0);
        salesMap.set('A3', 10);
        salesMap.set('A4', 20);

        const result = calculateWeightsForGroups(salesMap, [group]);
        const resultItems = result[0].colorGroups.flatMap(cg => cg.items);

        // Verify Calculations
        // Color Ratio: Red = 10/40 = 0.25, Blue = 30/40 = 0.75
        // Size Ratio: S = 20/40 = 0.5, M = 20/40 = 0.5

        // Expected R-S: 0.25 * 0.5 = 0.125
        const itemRS = resultItems.find(i => i.SKU === 'R-S');
        expect(itemRS?.salesWeight).toBe(0.125);
        expect(itemRS?.salesInfo?.colorSales).toBe(10);
        expect(itemRS?.salesInfo?.sizeSales).toBe(20);

        // Expected R-M: 0.25 * 0.5 = 0.125 (Even though sales is 0, weight logic uses Attribute Ratios)
        const itemRM = resultItems.find(i => i.SKU === 'R-M');
        expect(itemRM?.salesWeight).toBe(0.125); // Interesting logic check: Should it be 0 if item has no sales? logic implies attribute based estimation.
        // Current logic: weight = colorRatio * sizeRatio. So even if item sales is 0, if color and size exist elsewhere, it gets weight.
        // This is "Sales Estimation for OOS/New items" logic often used in apparel.

        // Expected B-M: 0.75 * 0.5 = 0.375
        const itemBM = resultItems.find(i => i.SKU === 'B-M');
        expect(itemBM?.salesWeight).toBe(0.375);
    });

    it('should calculate weights for Single Variant (Item Sales / Total)', () => {
        // Setup: 3 Items, Sales: 10, 20, 70. Total 100.
        const items = [
            createItem('S1', '', '', 'A1'),
            createItem('S2', '', '', 'A2'),
            createItem('S3', '', '', 'A3'),
        ];

        const group = createGroup('single', 'standard');
        // Force displayType to 'single' to bypass the 'standard' skip check and trigger isSingleVariant logic
        group.displayType = 'single';
        group.variantType = 'single';
        group.totalSkuCount = 3;
        group.colorGroups = [{ color: 'default', 颜色: 'default', items: items }];

        const salesMap = new Map<string, number>();
        salesMap.set('A1', 10);
        salesMap.set('A2', 20);
        salesMap.set('A3', 70);

        const result = calculateWeightsForGroups(salesMap, [group]);
        const resultItems = result[0].colorGroups.flatMap(cg => cg.items);

        expect(resultItems.find(i => i.SKU === 'S1')?.salesWeight).toBe(0.1);
        expect(resultItems.find(i => i.SKU === 'S2')?.salesWeight).toBe(0.2);
        expect(resultItems.find(i => i.SKU === 'S3')?.salesWeight).toBe(0.7);
    });

    it('should ignore Standard Products (Single SKU)', () => {
        const items = [createItem('S1', '', '', 'A1')];
        const group = createGroup('single', 'standard');
        group.variantType = 'single';
        group.totalSkuCount = 1; // Standard single product
        group.colorGroups = [{ color: 'default', 颜色: 'default', items: items }];

        const salesMap = new Map<string, number>();
        salesMap.set('A1', 100);

        const result = calculateWeightsForGroups(salesMap, [group]);
        // Should return unmodified or at least not weigh calculation logic application for 'standard' display type
        // The logic says: if displayType === 'standard' ... return group;

        const item = result[0].colorGroups[0].items[0];
        expect(item.salesWeight).toBe(0); // Should remain default (0) or undefined if not touched
    });
});
