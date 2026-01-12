/**
 * System Logger
 * Wraps console methods to provide consistent timestamped logs.
 * Used for tracking component lifecycle and calculation events during refactoring.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

class SystemLogger {
    private static getTimestamp(): string {
        return new Date().toISOString();
    }

    private static formatMessage(level: LogLevel, message: string, data?: any): void {
        const timestamp = SystemLogger.getTimestamp();
        const prefix = `[${timestamp}] [${level}]`;

        if (data) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    }

    static info(message: string, data?: any) {
        SystemLogger.formatMessage('INFO', message, data);
    }

    static warn(message: string, data?: any) {
        SystemLogger.formatMessage('WARN', message, data);
    }

    static error(message: string, error?: any) {
        SystemLogger.formatMessage('ERROR', message, error);
    }

    static debug(message: string, data?: any) {
        if (import.meta.env.MODE === 'development') {
            SystemLogger.formatMessage('DEBUG', message, data);
        }
    }
}

export const logger = SystemLogger;
