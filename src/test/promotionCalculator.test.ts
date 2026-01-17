import { describe, it, expect } from 'vitest';
import {
    calculateMonthResult,
    calculateCumulativeProfit,
    calculateBreakevenMonth,
    MonthConfig,
    PromotionBaseData
} from '../utils/promotionCalculator.utils';

describe('promotionCalculator.utils', () => {
    // Use category string directly instead of CommissionConfig
    const category: 'standard' | 'apparel' = 'apparel';

    const baseData: PromotionBaseData = {
        prod: 2.77,
        firstMile: 0.9,
        misc: 0,
        fba: 5.69,
        storage: 0.5,
        retProc: 2.62,
        retRem: 2.24,
        retRate: 0.10,    // 10%
        unsellable: 0.20, // 20%
    };

    const createMonth = (overrides: Partial<MonthConfig> = {}): MonthConfig => ({
        id: 1,
        label: 'M1',
        price: 19.99,
        dailyUnits: 50,
        adShare: 30,
        cpc: 0.8,
        cvr: 10,
        ...overrides,
    });

    describe('calculateMonthResult', () => {
        it('应正确计算月度结果', () => {
            const month = createMonth();
            const result = calculateMonthResult(month, baseData, category);

            expect(result.totalUnits).toBe(1500); // 50 * 30
            expect(result.adUnits).toBe(450);     // 30% of 1500
            expect(result.orgUnits).toBe(1050);   // 1500 - 450
        });

        it('应正确计算收入', () => {
            const month = createMonth({ price: 20, dailyUnits: 100 });
            const result = calculateMonthResult(month, baseData, category);

            expect(result.revenue).toBe(60000); // 100 * 30 * 20
        });

        it('应正确计算 CPA', () => {
            const month = createMonth({ cpc: 1.0, cvr: 10 });
            const result = calculateMonthResult(month, baseData, category);

            expect(result.unit.cpa).toBe(10); // 1.0 / 0.10
        });

        it('应正确计算 TACOS', () => {
            const month = createMonth();
            const result = calculateMonthResult(month, baseData, category);

            expect(result.tacos).toBeGreaterThan(0);
            expect(result.tacos).toBeLessThan(1);
        });

        it('广告占比为0时应只有自然单利润', () => {
            const month = createMonth({ adShare: 0 });
            const result = calculateMonthResult(month, baseData, category);

            expect(result.adUnits).toBe(0);
            expect(result.adSpend).toBe(0);
            expect(result.totalProfit).toBe(result.orgUnits * result.unit.grossOrganic);
        });
    });

    describe('calculateCumulativeProfit', () => {
        it('应正确累计多月利润', () => {
            const months = [
                createMonth({ id: 1, label: 'M1' }),
                createMonth({ id: 2, label: 'M2' }),
                createMonth({ id: 3, label: 'M3' }),
            ];
            const cumulative = calculateCumulativeProfit(months, baseData, category);

            // 单月利润 * 3
            const singleMonth = calculateMonthResult(months[0], baseData, category);
            expect(cumulative).toBeCloseTo(singleMonth.totalProfit * 3, 0);
        });
    });

    describe('calculateBreakevenMonth', () => {
        it('应找到回本月份', () => {
            const months = Array.from({ length: 6 }, (_, i) =>
                createMonth({ id: i, label: `M${i + 1}`, dailyUnits: 100 })
            );

            const singleMonth = calculateMonthResult(months[0], baseData, category);
            const investment = singleMonth.totalProfit * 2; // 2个月利润的投资

            const breakevenMonth = calculateBreakevenMonth(months, baseData, category, investment);

            expect(breakevenMonth).toBe(1); // 第2个月回本 (索引1)
        });

        it('应返回-1当无法回本时', () => {
            const months = [createMonth({ dailyUnits: 1 })]; // 很少的销量
            const breakevenMonth = calculateBreakevenMonth(months, baseData, category, 100000);

            expect(breakevenMonth).toBe(-1);
        });
    });
});
