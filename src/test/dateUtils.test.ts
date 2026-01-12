import { describe, it, expect } from 'vitest';
import { fmtDate, fmtDateISO, fmtDateCN, daysBetween, addDays, parseDateISO, getMonthFromOffset, getDaysPerMonth } from '../utils/dateUtils';

describe('dateUtils', () => {
    const testDate = new Date(2024, 5, 15); // 2024-06-15

    describe('fmtDate', () => {
        it('应格式化为 MM/DD 格式', () => {
            expect(fmtDate(testDate)).toBe('06/15');
        });

        it('应处理单位数月份和日期', () => {
            expect(fmtDate(new Date(2024, 0, 5))).toBe('01/05');
        });
    });

    describe('fmtDateISO', () => {
        it('应格式化为 YYYY-MM-DD 格式', () => {
            const result = fmtDateISO(testDate);
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('fmtDateCN', () => {
        it('应格式化为中文日期', () => {
            expect(fmtDateCN(testDate)).toBe('6月15日');
        });
    });

    describe('daysBetween', () => {
        it('应计算两个日期之间的天数', () => {
            const start = new Date(2024, 5, 1);
            const end = new Date(2024, 5, 15);
            expect(daysBetween(start, end)).toBe(14);
        });

        it('应返回负数当结束日期早于开始日期', () => {
            const start = new Date(2024, 5, 15);
            const end = new Date(2024, 5, 1);
            expect(daysBetween(start, end)).toBe(-14);
        });
    });

    describe('addDays', () => {
        it('应正确添加天数', () => {
            const result = addDays(testDate, 10);
            expect(result.getDate()).toBe(25);
        });

        it('应正确处理跨月', () => {
            const result = addDays(testDate, 20);
            expect(result.getMonth()).toBe(6); // July
        });

        it('应支持负数天数', () => {
            const result = addDays(testDate, -10);
            expect(result.getDate()).toBe(5);
        });
    });

    describe('parseDateISO', () => {
        it('应解析 YYYY-MM-DD 格式', () => {
            const result = parseDateISO('2024-06-15');
            expect(result.getFullYear()).toBe(2024);
            expect(result.getMonth()).toBe(5); // June (0-indexed)
            expect(result.getDate()).toBe(15);
        });
    });

    describe('getMonthFromOffset', () => {
        it('应返回正确的月份', () => {
            const start = new Date(2024, 5, 15); // June 15
            expect(getMonthFromOffset(start, 0)).toBe(5);  // June
            expect(getMonthFromOffset(start, 20)).toBe(6); // July
        });
    });

    describe('getDaysPerMonth', () => {
        it('应计算每月天数分布', () => {
            const start = new Date(2024, 5, 15); // June 15
            const result = getDaysPerMonth(start, 30);

            expect(result[5]).toBeGreaterThan(0); // June
            expect(result[6]).toBeGreaterThan(0); // July
        });
    });
});
