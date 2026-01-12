/**
 * Profit Model Repository
 * 利润模型数据访问层
 */

import { SavedProfitModel } from '../types';
import { IStorage, defaultStorage } from './Storage';
import { STORAGE_KEYS } from './StorageKeys';

export interface IProfitModelRepository {
    getAll(): SavedProfitModel[];
    getById(id: string): SavedProfitModel | undefined;
    getByProductId(productId: string): SavedProfitModel[];
    save(model: SavedProfitModel): boolean;
    update(id: string, updates: Partial<SavedProfitModel>): boolean;
    delete(id: string): boolean;
    search(query: string): SavedProfitModel[];
}

export class ProfitModelRepository implements IProfitModelRepository {
    private storage: IStorage;

    constructor(storage: IStorage = defaultStorage) {
        this.storage = storage;
    }

    getAll(): SavedProfitModel[] {
        return this.storage.get<SavedProfitModel[]>(STORAGE_KEYS.PROFIT_MODELS) || [];
    }

    getById(id: string): SavedProfitModel | undefined {
        return this.getAll().find(m => m.id === id);
    }

    getByProductId(productId: string): SavedProfitModel[] {
        return this.getAll().filter(m => m.productId === productId);
    }

    save(model: SavedProfitModel): boolean {
        try {
            const all = this.getAll();
            all.push(model);
            this.storage.set(STORAGE_KEYS.PROFIT_MODELS, all);
            return true;
        } catch {
            return false;
        }
    }

    update(id: string, updates: Partial<SavedProfitModel>): boolean {
        try {
            const all = this.getAll();
            const index = all.findIndex(m => m.id === id);
            if (index === -1) return false;

            all[index] = { ...all[index], ...updates };
            this.storage.set(STORAGE_KEYS.PROFIT_MODELS, all);
            return true;
        } catch {
            return false;
        }
    }

    delete(id: string): boolean {
        try {
            const all = this.getAll();
            const filtered = all.filter(m => m.id !== id);
            this.storage.set(STORAGE_KEYS.PROFIT_MODELS, filtered);
            return true;
        } catch {
            return false;
        }
    }

    search(query: string): SavedProfitModel[] {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(m =>
            m.productName.toLowerCase().includes(lowerQuery) ||
            (m.asin?.toLowerCase() || '').includes(lowerQuery) ||
            m.label.toLowerCase().includes(lowerQuery)
        );
    }

    static generateId(): string {
        return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export const profitModelRepository = new ProfitModelRepository();
