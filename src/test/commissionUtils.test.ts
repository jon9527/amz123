import { describe, it, expect } from 'vitest';
import { getCommRate, getReturnCost, getRefundAdminFee, CommissionConfig, ReturnCostParams } from '../utils/commissionUtils';

describe('commissionUtils', () => {
    describe('getCommRate', () => {
        const autoConfig: CommissionConfig = { autoComm: true, manualComm: 15 };
        const manualConfig: CommissionConfig = { autoComm: false, manualComm: 12 };

        it('应返回手动佣金率当 autoComm 为 false', () => {
            expect(getCommRate(25, manualConfig)).toBe(0.12);
            expect(getCommRate(10, manualConfig)).toBe(0.12);
        });

        it('应返回 17% 当价格 > $20', () => {
            expect(getCommRate(25, autoConfig)).toBe(0.17);
            expect(getCommRate(100, autoConfig)).toBe(0.17);
            expect(getCommRate(20.01, autoConfig)).toBe(0.17);
        });

        it('应返回 10% 当价格在 $15-$20', () => {
            expect(getCommRate(15, autoConfig)).toBe(0.10);
            expect(getCommRate(18, autoConfig)).toBe(0.10);
            expect(getCommRate(20, autoConfig)).toBe(0.10);
        });

        it('应返回 5% 当价格 < $15', () => {
            expect(getCommRate(14.99, autoConfig)).toBe(0.05);
            expect(getCommRate(10, autoConfig)).toBe(0.05);
            expect(getCommRate(1, autoConfig)).toBe(0.05);
        });
    });

    describe('getRefundAdminFee', () => {
        it('应返回 0 当价格 <= 0', () => {
            expect(getRefundAdminFee(0, 0.15)).toBe(0);
            expect(getRefundAdminFee(-10, 0.15)).toBe(0);
        });

        it('应返回佣金的 20%', () => {
            // price=20, rate=0.15 => comm=3 => adminFee=0.6
            expect(getRefundAdminFee(20, 0.15)).toBeCloseTo(0.6);
        });

        it('应封顶在 $5.00', () => {
            // price=200, rate=0.17 => comm=34 => 20%=6.8 => cap at 5
            expect(getRefundAdminFee(200, 0.17)).toBe(5.00);
        });
    });

    describe('getReturnCost', () => {
        const baseParams: ReturnCostParams = {
            retProcFee: 2.62,
            retRemFee: 2.24,
            fbaFee: 5.69,
            prodCostUSD: 2.77,
            shippingUSD: 0.9,
            returnRate: 10,
            unsellableRate: 20,
        };

        it('应计算综合退货成本', () => {
            const cost = getReturnCost(20, 0.15, baseParams);
            // 验证返回值是数字且为正
            expect(typeof cost).toBe('number');
            expect(cost).toBeGreaterThan(0);
        });

        it('退货率越高，成本越高', () => {
            const lowReturnParams = { ...baseParams, returnRate: 5 };
            const highReturnParams = { ...baseParams, returnRate: 20 };

            const lowCost = getReturnCost(20, 0.15, lowReturnParams);
            const highCost = getReturnCost(20, 0.15, highReturnParams);

            expect(highCost).toBeGreaterThan(lowCost);
        });
    });
});
