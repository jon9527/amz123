import { describe, it, expect } from 'vitest';
import {
    required, min, max, range, minLength, maxLength,
    pattern, asin, positive, nonNegative, percentage,
    validateField, validateForm
} from '../utils/validation';

describe('validation', () => {
    describe('required', () => {
        const rule = required();

        it('应拒绝空字符串', () => {
            expect(rule('')).toBeTruthy();
        });

        it('应拒绝 null 和 undefined', () => {
            expect(rule(null)).toBeTruthy();
            expect(rule(undefined)).toBeTruthy();
        });

        it('应接受非空值', () => {
            expect(rule('hello')).toBeNull();
            expect(rule(0)).toBeNull();
            expect(rule(false)).toBeNull();
        });

        it('应拒绝空数组', () => {
            expect(rule([])).toBeTruthy();
        });
    });

    describe('min', () => {
        const rule = min(5);

        it('应拒绝小于最小值', () => {
            expect(rule(4)).toBeTruthy();
        });

        it('应接受等于或大于最小值', () => {
            expect(rule(5)).toBeNull();
            expect(rule(10)).toBeNull();
        });
    });

    describe('max', () => {
        const rule = max(10);

        it('应拒绝大于最大值', () => {
            expect(rule(11)).toBeTruthy();
        });

        it('应接受等于或小于最大值', () => {
            expect(rule(10)).toBeNull();
            expect(rule(5)).toBeNull();
        });
    });

    describe('range', () => {
        const rule = range(5, 10);

        it('应拒绝范围外的值', () => {
            expect(rule(4)).toBeTruthy();
            expect(rule(11)).toBeTruthy();
        });

        it('应接受范围内的值', () => {
            expect(rule(5)).toBeNull();
            expect(rule(7)).toBeNull();
            expect(rule(10)).toBeNull();
        });
    });

    describe('minLength', () => {
        const rule = minLength(3);

        it('应拒绝过短字符串', () => {
            expect(rule('ab')).toBeTruthy();
        });

        it('应接受足够长的字符串', () => {
            expect(rule('abc')).toBeNull();
            expect(rule('abcdef')).toBeNull();
        });
    });

    describe('maxLength', () => {
        const rule = maxLength(5);

        it('应拒绝过长字符串', () => {
            expect(rule('abcdef')).toBeTruthy();
        });

        it('应接受不超长的字符串', () => {
            expect(rule('abc')).toBeNull();
            expect(rule('abcde')).toBeNull();
        });
    });

    describe('pattern', () => {
        const emailRule = pattern(/^[\w-]+@[\w-]+\.\w+$/, '邮箱格式不正确');

        it('应验证正则匹配', () => {
            expect(emailRule('test@example.com')).toBeNull();
            expect(emailRule('invalid-email')).toBeTruthy();
        });
    });

    describe('asin', () => {
        const rule = asin();

        it('应接受有效 ASIN', () => {
            expect(rule('B0ABCD1234')).toBeNull();
        });

        it('应拒绝无效 ASIN', () => {
            expect(rule('INVALID')).toBeTruthy();
            expect(rule('A0ABCD1234')).toBeTruthy();
        });

        it('应接受空值（可选）', () => {
            expect(rule('')).toBeNull();
        });
    });

    describe('positive', () => {
        const rule = positive();

        it('应拒绝非正数', () => {
            expect(rule(0)).toBeTruthy();
            expect(rule(-1)).toBeTruthy();
        });

        it('应接受正数', () => {
            expect(rule(1)).toBeNull();
            expect(rule(0.01)).toBeNull();
        });
    });

    describe('nonNegative', () => {
        const rule = nonNegative();

        it('应拒绝负数', () => {
            expect(rule(-1)).toBeTruthy();
        });

        it('应接受零和正数', () => {
            expect(rule(0)).toBeNull();
            expect(rule(1)).toBeNull();
        });
    });

    describe('percentage', () => {
        const rule = percentage();

        it('应拒绝范围外的值', () => {
            expect(rule(-1)).toBeTruthy();
            expect(rule(101)).toBeTruthy();
        });

        it('应接受 0-100 范围', () => {
            expect(rule(0)).toBeNull();
            expect(rule(50)).toBeNull();
            expect(rule(100)).toBeNull();
        });
    });

    describe('validateField', () => {
        it('应按顺序执行规则并返回第一个错误', () => {
            const error = validateField('', [required(), minLength(3)]);
            expect(error).toContain('必填');
        });

        it('应返回 null 当所有规则通过', () => {
            const error = validateField('hello', [required(), minLength(3)]);
            expect(error).toBeNull();
        });
    });

    describe('validateForm', () => {
        it('应验证整个表单', () => {
            const values = { name: '', price: -5 };
            const schema = {
                name: [required()],
                price: [positive()],
            };

            const result = validateForm(values, schema);

            expect(result.isValid).toBe(false);
            expect(result.errors.name).toBeTruthy();
            expect(result.errors.price).toBeTruthy();
        });

        it('应返回 isValid=true 当表单有效', () => {
            const values = { name: 'Test', price: 10 };
            const schema = {
                name: [required()],
                price: [positive()],
            };

            const result = validateForm(values, schema);

            expect(result.isValid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
        });
    });
});
