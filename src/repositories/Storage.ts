/**
 * Storage Abstraction Layer
 * 存储抽象层 - 统一数据访问接口
 */

// ============ 通用存储接口 ============
export interface IStorage {
    get<T>(key: string): T | null;
    set<T>(key: string, value: T): void;
    remove(key: string): void;
    keys(): string[];
}

// ============ LocalStorage 实现 ============
export class LocalStorageAdapter implements IStorage {
    get<T>(key: string): T | null {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.warn(`Failed to get item ${key} from localStorage:`, e);
            return null;
        }
    }

    set<T>(key: string, value: T): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error(`Failed to set item ${key} in localStorage:`, e);
        }
    }

    remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn(`Failed to remove item ${key} from localStorage:`, e);
        }
    }

    keys(): string[] {
        const allKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) allKeys.push(key);
        }
        return allKeys;
    }
}

// ============ 默认存储实例 ============
export const defaultStorage = new LocalStorageAdapter();
