/**
 * API 层抽象 - 基础设施
 * 
 * 此模块提供统一的数据访问接口，当前使用 localStorage 作为存储后端。
 * 未来可无缝切换到真实的后端 API。
 */

import { ProductSpec, LogisticsChannel, SavedProfitModel } from '../types';

// Storage Keys
const STORAGE_KEYS = {
    PRODUCTS: 'products',
    LOGISTICS: 'logisticsChannels',
    PROFIT_MODELS: 'profitModels',
    EXCHANGE_RATE: 'exchangeRate',
} as const;

// Generic CRUD helpers for localStorage
const storage = {
    get<T>(key: string, defaultValue: T): T {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    set<T>(key: string, value: T): void {
        localStorage.setItem(key, JSON.stringify(value));
    },

    remove(key: string): void {
        localStorage.removeItem(key);
    },
};

// --- Products API ---
export const productsApi = {
    getAll(): ProductSpec[] {
        return storage.get<ProductSpec[]>(STORAGE_KEYS.PRODUCTS, []);
    },

    getById(id: string): ProductSpec | undefined {
        return this.getAll().find(p => p.id === id);
    },

    create(data: Omit<ProductSpec, 'id' | 'createdAt'>): ProductSpec {
        const products = this.getAll();
        const newProduct: ProductSpec = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
        };
        products.push(newProduct);
        storage.set(STORAGE_KEYS.PRODUCTS, products);
        return newProduct;
    },

    update(id: string, data: Partial<ProductSpec>): ProductSpec | null {
        const products = this.getAll();
        const index = products.findIndex(p => p.id === id);
        if (index === -1) return null;

        products[index] = { ...products[index], ...data };
        storage.set(STORAGE_KEYS.PRODUCTS, products);
        return products[index];
    },

    delete(id: string): boolean {
        const products = this.getAll();
        const filtered = products.filter(p => p.id !== id);
        if (filtered.length === products.length) return false;

        storage.set(STORAGE_KEYS.PRODUCTS, filtered);
        return true;
    },
};

// --- Logistics Channels API ---
export const logisticsApi = {
    getAll(): LogisticsChannel[] {
        return storage.get<LogisticsChannel[]>(STORAGE_KEYS.LOGISTICS, []);
    },

    getById(id: string): LogisticsChannel | undefined {
        return this.getAll().find(c => c.id === id);
    },

    create(data: Omit<LogisticsChannel, 'id'>): LogisticsChannel {
        const channels = this.getAll();
        const newChannel: LogisticsChannel = {
            ...data,
            id: crypto.randomUUID(),
        };
        channels.push(newChannel);
        storage.set(STORAGE_KEYS.LOGISTICS, channels);
        return newChannel;
    },

    update(id: string, data: Partial<LogisticsChannel>): LogisticsChannel | null {
        const channels = this.getAll();
        const index = channels.findIndex(c => c.id === id);
        if (index === -1) return null;

        channels[index] = { ...channels[index], ...data };
        storage.set(STORAGE_KEYS.LOGISTICS, channels);
        return channels[index];
    },

    delete(id: string): boolean {
        const channels = this.getAll();
        const filtered = channels.filter(c => c.id !== id);
        if (filtered.length === channels.length) return false;

        storage.set(STORAGE_KEYS.LOGISTICS, filtered);
        return true;
    },
};

// --- Profit Models API ---
export const profitModelsApi = {
    getAll(): SavedProfitModel[] {
        return storage.get<SavedProfitModel[]>(STORAGE_KEYS.PROFIT_MODELS, []);
    },

    getById(id: string): SavedProfitModel | undefined {
        return this.getAll().find(m => m.id === id);
    },

    getByProductId(productId: string): SavedProfitModel[] {
        return this.getAll().filter(m => m.productId === productId);
    },

    save(model: SavedProfitModel): boolean {
        const models = this.getAll();
        models.push(model);
        storage.set(STORAGE_KEYS.PROFIT_MODELS, models);
        return true;
    },

    update(id: string, data: Partial<SavedProfitModel>): boolean {
        const models = this.getAll();
        const index = models.findIndex(m => m.id === id);
        if (index === -1) return false;

        models[index] = { ...models[index], ...data };
        storage.set(STORAGE_KEYS.PROFIT_MODELS, models);
        return true;
    },

    delete(id: string): boolean {
        const models = this.getAll();
        const filtered = models.filter(m => m.id !== id);
        if (filtered.length === models.length) return false;

        storage.set(STORAGE_KEYS.PROFIT_MODELS, filtered);
        return true;
    },

    generateId(): string {
        return crypto.randomUUID();
    },
};

// --- Settings API ---
export const settingsApi = {
    getExchangeRate(): number {
        const cached = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE);
        return cached ? parseFloat(cached) : 7.1;
    },

    setExchangeRate(rate: number): void {
        localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATE, rate.toString());
    },
};

// Export grouped API
export const api = {
    products: productsApi,
    logistics: logisticsApi,
    profitModels: profitModelsApi,
    settings: settingsApi,
};

export default api;
