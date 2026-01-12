/**
 * Form Validation Utilities
 * 表单验证工具函数
 */

// ============ 验证规则类型 ============
export type ValidationRule<T> = (value: T) => string | null;

export interface FieldValidation<T> {
    value: T;
    rules: ValidationRule<T>[];
}

// ============ 内置验证规则 ============

/**
 * 必填验证
 */
export const required = (message = '此字段为必填项'): ValidationRule<any> =>
    (value) => {
        if (value === null || value === undefined || value === '') {
            return message;
        }
        if (Array.isArray(value) && value.length === 0) {
            return message;
        }
        return null;
    };

/**
 * 最小值验证
 */
export const min = (minValue: number, message?: string): ValidationRule<number> =>
    (value) => {
        if (value < minValue) {
            return message || `不能小于 ${minValue}`;
        }
        return null;
    };

/**
 * 最大值验证
 */
export const max = (maxValue: number, message?: string): ValidationRule<number> =>
    (value) => {
        if (value > maxValue) {
            return message || `不能大于 ${maxValue}`;
        }
        return null;
    };

/**
 * 范围验证
 */
export const range = (minValue: number, maxValue: number, message?: string): ValidationRule<number> =>
    (value) => {
        if (value < minValue || value > maxValue) {
            return message || `必须在 ${minValue} 到 ${maxValue} 之间`;
        }
        return null;
    };

/**
 * 最小长度验证
 */
export const minLength = (length: number, message?: string): ValidationRule<string> =>
    (value) => {
        if (value.length < length) {
            return message || `长度不能少于 ${length} 个字符`;
        }
        return null;
    };

/**
 * 最大长度验证
 */
export const maxLength = (length: number, message?: string): ValidationRule<string> =>
    (value) => {
        if (value.length > length) {
            return message || `长度不能超过 ${length} 个字符`;
        }
        return null;
    };

/**
 * 正则验证
 */
export const pattern = (regex: RegExp, message = '格式不正确'): ValidationRule<string> =>
    (value) => regex.test(value) ? null : message;

/**
 * ASIN 格式验证
 */
export const asin = (message = 'ASIN 格式不正确'): ValidationRule<string> =>
    (value) => {
        if (!value) return null; // 可选字段
        return /^B0[A-Z0-9]{8}$/.test(value) ? null : message;
    };

/**
 * 正数验证
 */
export const positive = (message = '必须为正数'): ValidationRule<number> =>
    (value) => value > 0 ? null : message;

/**
 * 非负数验证
 */
export const nonNegative = (message = '不能为负数'): ValidationRule<number> =>
    (value) => value >= 0 ? null : message;

/**
 * 百分比验证 (0-100)
 */
export const percentage = (message = '必须在 0-100 之间'): ValidationRule<number> =>
    range(0, 100, message);

// ============ 验证执行器 ============

/**
 * 验证单个字段
 */
export const validateField = <T>(value: T, rules: ValidationRule<T>[]): string | null => {
    for (const rule of rules) {
        const error = rule(value);
        if (error) return error;
    }
    return null;
};

/**
 * 验证表单
 */
export const validateForm = <T extends Record<string, any>>(
    values: T,
    schema: { [K in keyof T]?: ValidationRule<T[K]>[] }
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } => {
    const errors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const key in schema) {
        const rules = schema[key];
        if (rules) {
            const error = validateField(values[key], rules);
            if (error) {
                errors[key] = error;
                isValid = false;
            }
        }
    }

    return { isValid, errors };
};
