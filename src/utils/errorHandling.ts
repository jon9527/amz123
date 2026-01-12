/**
 * Error Handling Utilities
 * 错误处理工具函数
 */

// ============ 自定义错误类型 ============
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: Record<string, any>
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, field?: string) {
        super(message, 'VALIDATION_ERROR', { field });
        this.name = 'ValidationError';
    }
}

export class StorageError extends AppError {
    constructor(message: string, key?: string) {
        super(message, 'STORAGE_ERROR', { key });
        this.name = 'StorageError';
    }
}

export class CalculationError extends AppError {
    constructor(message: string, calculation?: string) {
        super(message, 'CALCULATION_ERROR', { calculation });
        this.name = 'CalculationError';
    }
}

// ============ 错误处理器 ============

/**
 * 安全执行函数，捕获错误并返回默认值
 */
export function tryCatch<T>(
    fn: () => T,
    fallback: T,
    onError?: (error: Error) => void
): T {
    try {
        return fn();
    } catch (error) {
        if (onError && error instanceof Error) {
            onError(error);
        }
        return fallback;
    }
}

/**
 * 异步安全执行
 */
export async function tryCatchAsync<T>(
    fn: () => Promise<T>,
    fallback: T,
    onError?: (error: Error) => void
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (onError && error instanceof Error) {
            onError(error);
        }
        return fallback;
    }
}

/**
 * 重试执行
 */
export async function retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * 格式化错误消息用于显示
 */
export function formatErrorMessage(error: unknown): string {
    if (error instanceof AppError) {
        return `${error.message} (${error.code})`;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

/**
 * 判断是否为特定类型的错误
 */
export function isErrorType<T extends AppError>(
    error: unknown,
    ErrorClass: new (...args: any[]) => T
): error is T {
    return error instanceof ErrorClass;
}
