/**
 * Logger Service - 应用日志系统
 * 
 * 功能：
 * - 4个日志级别: DEBUG, INFO, WARN, ERROR
 * - localStorage 持久化 (默认保留500条)
 * - 可导出为JSON文件
 * - 可在设置页面查看和清除
 */

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    category: string;
    message: string;
    data?: any;
}

const STORAGE_KEY = 'amz123_logs';
const SETTINGS_KEY = 'amz123_log_settings';
const MAX_LOGS = 500;

interface LogSettings {
    enabled: boolean;
    minLevel: LogLevel;
}

const DEFAULT_SETTINGS: LogSettings = {
    enabled: true,
    minLevel: LogLevel.INFO
};

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3
};

class LoggerService {
    private settings: LogSettings;

    constructor() {
        this.settings = this.loadSettings();
    }

    private loadSettings(): LogSettings {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load log settings:', e);
        }
        return DEFAULT_SETTINGS;
    }

    saveSettings(settings: Partial<LogSettings>) {
        this.settings = { ...this.settings, ...settings };
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save log settings:', e);
        }
    }

    getSettings(): LogSettings {
        return { ...this.settings };
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.settings.enabled) return false;
        return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.settings.minLevel];
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    private log(level: LogLevel, category: string, message: string, data?: any) {
        // Console output (always)
        const consoleMethod = level === LogLevel.ERROR ? 'error' :
            level === LogLevel.WARN ? 'warn' :
                level === LogLevel.DEBUG ? 'debug' : 'log';
        console[consoleMethod](`[${level}][${category}]`, message, data ?? '');

        // Storage (if enabled and meets level threshold)
        if (!this.shouldLog(level)) return;

        const entry: LogEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data: data !== undefined ? JSON.parse(JSON.stringify(data)) : undefined
        };

        try {
            const logs = this.getAll();
            logs.push(entry);

            // Trim to max size
            while (logs.length > MAX_LOGS) {
                logs.shift();
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        } catch (e) {
            console.warn('Failed to persist log:', e);
        }
    }

    debug(category: string, message: string, data?: any) {
        this.log(LogLevel.DEBUG, category, message, data);
    }

    info(category: string, message: string, data?: any) {
        this.log(LogLevel.INFO, category, message, data);
    }

    warn(category: string, message: string, data?: any) {
        this.log(LogLevel.WARN, category, message, data);
    }

    error(category: string, message: string, data?: any) {
        this.log(LogLevel.ERROR, category, message, data);
    }

    getAll(): LogEntry[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load logs:', e);
        }
        return [];
    }

    getRecent(count: number = 50): LogEntry[] {
        const logs = this.getAll();
        return logs.slice(-count);
    }

    getByLevel(level: LogLevel): LogEntry[] {
        return this.getAll().filter(l => l.level === level);
    }

    getByCategory(category: string): LogEntry[] {
        return this.getAll().filter(l => l.category === category);
    }

    clear() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('Failed to clear logs:', e);
        }
    }

    export(): string {
        const logs = this.getAll();
        return JSON.stringify({
            exportedAt: new Date().toISOString(),
            count: logs.length,
            logs
        }, null, 2);
    }

    downloadExport() {
        const json = this.export();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `amz123-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    getStats(): { total: number; byLevel: Record<LogLevel, number> } {
        const logs = this.getAll();
        const byLevel = {
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 0,
            [LogLevel.WARN]: 0,
            [LogLevel.ERROR]: 0
        };
        logs.forEach(l => byLevel[l.level]++);
        return { total: logs.length, byLevel };
    }
}

// Singleton instance
export const Logger = new LoggerService();

// Quick access functions
export const logDebug = (category: string, message: string, data?: any) => Logger.debug(category, message, data);
export const logInfo = (category: string, message: string, data?: any) => Logger.info(category, message, data);
export const logWarn = (category: string, message: string, data?: any) => Logger.warn(category, message, data);
export const logError = (category: string, message: string, data?: any) => Logger.error(category, message, data);
