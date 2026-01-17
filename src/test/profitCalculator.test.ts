import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateTargetPrice, ProfitCalcParams } from '../utils/profitCalculator.utils';
import { ReturnCostParams } from '../utils/commissionUtils';

describe('profitCalculator.utils', () => {
    const returnParams: ReturnCostParams = {
        retProcFee: 2.62,
        retRemFee: 2.24,
        fbaFee: 5.69,
        prodCostUSD: 2.77,
        shippingUSD: 0.9,
        returnRate: 10,
        unsellableRate: 20,
    };

    const baseParams: Omit<ProfitCalcParams, 'price'> = {
        prodCostUSD: 2.77,
        shippingUSD: 0.9,
        fbaFee: 5.69,
        miscFee: 0,
        storageFee: 0.5,
        category: 'apparel', // Use category string instead of CommissionConfig
        returnParams,
        targetAcos: 15,
    };

    describe('calculateProfit', () => {
        it('应正确计算利润明细', () => {
            const result = calculateProfit({ ...baseParams, price: 19.99 });

            expect(result.price).toBe(19.99);
            expect(result.commRate).toBe(0.10);  // $15-20 区间 (Apparel)
            expect(result.commValue).toBeCloseTo(2.00, 1);
            expect(result.netProfit).toBeLessThan(result.grossProfit);
        });

        it('应处理不同价格区间的佣金率 (Apparel)', () => {
            const low = calculateProfit({ ...baseParams, price: 10 });
            const mid = calculateProfit({ ...baseParams, price: 18 });
            const high = calculateProfit({ ...baseParams, price: 25 });

            expect(low.commRate).toBe(0.05);
            expect(mid.commRate).toBe(0.10);
            expect(high.commRate).toBe(0.17);
        });

        it('应计算正确的利润率', () => {
            const result = calculateProfit({ ...baseParams, price: 25, targetAcos: 0 });

            expect(result.grossMargin).toBeGreaterThan(0);
            expect(result.grossMargin).toBeLessThanOrEqual(1);
            expect(result.netMargin).toBeGreaterThan(0);
        });

        it('广告费应增加总成本', () => {
            const noAds = calculateProfit({ ...baseParams, price: 20, targetAcos: 0 });
            const withAds = calculateProfit({ ...baseParams, price: 20, targetAcos: 15 });

            expect(withAds.totalCost).toBeGreaterThan(noAds.totalCost);
            expect(withAds.netProfit).toBeLessThan(noAds.netProfit);
        });

        it('Standard category 应使用 15% 固定佣金', () => {
            const standardParams = { ...baseParams, category: 'standard' as const };
            const result = calculateProfit({ ...standardParams, price: 10 });

            expect(result.commRate).toBe(0.15); // Standard uses flat 15%
        });
    });

    describe('calculateTargetPrice', () => {
        it('应计算达到目标利润率的售价', () => {
            const targetMargin = 0.15; // 15%
            const targetPrice = calculateTargetPrice(targetMargin, baseParams);

            // 验证计算出的价格确实能达到目标利润率
            const result = calculateProfit({ ...baseParams, price: targetPrice });
            expect(result.netMargin).toBeCloseTo(targetMargin, 1);
        });

        it('更高的利润率目标需要更高的售价', () => {
            const price10 = calculateTargetPrice(0.10, baseParams);
            const price20 = calculateTargetPrice(0.20, baseParams);

            expect(price20).toBeGreaterThan(price10);
        });
    });
});
