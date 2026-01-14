/**
 * Operations Repository
 * 补货设置和推广计划数据访问层
 */

import { RestockSetting, PromotionPlan } from '../types';
import { IStorage, defaultStorage } from './Storage';
import { STORAGE_KEYS } from './StorageKeys';

// ============ Restock Settings Repository ============
export interface IRestockRepository {
    getAll(): RestockSetting[];
    getById(id: string): RestockSetting | undefined;
    getByProductId(productId: string): RestockSetting | undefined;
    add(setting: Omit<RestockSetting, 'id' | 'createdAt' | 'updatedAt'>): RestockSetting;
    update(id: string, updates: Partial<RestockSetting>): RestockSetting | undefined;
    delete(id: string): boolean;
    clear(): void;
}

export class RestockRepository implements IRestockRepository {
    private storage: IStorage;

    constructor(storage: IStorage = defaultStorage) {
        this.storage = storage;
    }

    private generateId(): string {
        return `rst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getAll(): RestockSetting[] {
        return this.storage.get<RestockSetting[]>(STORAGE_KEYS.RESTOCK_SETTINGS) || [];
    }

    getById(id: string): RestockSetting | undefined {
        return this.getAll().find(s => s.id === id);
    }

    getByProductId(productId: string): RestockSetting | undefined {
        return this.getAll().find(s => s.productId === productId);
    }

    add(setting: Omit<RestockSetting, 'id' | 'createdAt' | 'updatedAt'>): RestockSetting {
        const all = this.getAll();
        const now = Date.now();
        const newSetting: RestockSetting = {
            ...setting,
            id: this.generateId(),
            createdAt: now,
            updatedAt: now,
        };
        all.push(newSetting);
        this.storage.set(STORAGE_KEYS.RESTOCK_SETTINGS, all);
        return newSetting;
    }

    update(id: string, updates: Partial<RestockSetting>): RestockSetting | undefined {
        const all = this.getAll();
        const index = all.findIndex(s => s.id === id);
        if (index === -1) return undefined;

        all[index] = { ...all[index], ...updates, updatedAt: Date.now() };
        this.storage.set(STORAGE_KEYS.RESTOCK_SETTINGS, all);
        return all[index];
    }

    delete(id: string): boolean {
        const all = this.getAll();
        const filtered = all.filter(s => s.id !== id);
        if (filtered.length === all.length) return false;

        this.storage.set(STORAGE_KEYS.RESTOCK_SETTINGS, filtered);
        return true;
    }

    clear(): void {
        this.storage.set(STORAGE_KEYS.RESTOCK_SETTINGS, []);
    }
}

// ============ Promotion Plans Repository ============
export interface IPromotionRepository {
    getAll(): PromotionPlan[];
    getById(id: string): PromotionPlan | undefined;
    getByProductId(productId: string): PromotionPlan[];
    add(plan: Omit<PromotionPlan, 'id' | 'createdAt' | 'updatedAt'>): PromotionPlan;
    update(id: string, updates: Partial<PromotionPlan>): PromotionPlan | undefined;
    delete(id: string): boolean;
    clear(): void;
}

export class PromotionRepository implements IPromotionRepository {
    private storage: IStorage;

    constructor(storage: IStorage = defaultStorage) {
        this.storage = storage;
    }

    private generateId(): string {
        return `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getAll(): PromotionPlan[] {
        return this.storage.get<PromotionPlan[]>(STORAGE_KEYS.PROMOTION_PLANS) || [];
    }

    getById(id: string): PromotionPlan | undefined {
        return this.getAll().find(p => p.id === id);
    }

    getByProductId(productId: string): PromotionPlan[] {
        return this.getAll().filter(p => p.productId === productId);
    }

    add(plan: Omit<PromotionPlan, 'id' | 'createdAt' | 'updatedAt'>): PromotionPlan {
        const all = this.getAll();
        const now = Date.now();
        const newPlan: PromotionPlan = {
            ...plan,
            id: this.generateId(),
            createdAt: now,
            updatedAt: now,
        };
        all.push(newPlan);
        this.storage.set(STORAGE_KEYS.PROMOTION_PLANS, all);
        return newPlan;
    }

    update(id: string, updates: Partial<PromotionPlan>): PromotionPlan | undefined {
        const all = this.getAll();
        const index = all.findIndex(p => p.id === id);
        if (index === -1) return undefined;

        all[index] = { ...all[index], ...updates, updatedAt: Date.now() };
        this.storage.set(STORAGE_KEYS.PROMOTION_PLANS, all);
        return all[index];
    }

    delete(id: string): boolean {
        const all = this.getAll();
        const filtered = all.filter(p => p.id !== id);
        if (filtered.length === all.length) return false;

        this.storage.set(STORAGE_KEYS.PROMOTION_PLANS, filtered);
        return true;
    }

    clear(): void {
        this.storage.set(STORAGE_KEYS.PROMOTION_PLANS, []);
    }
}

// 默认实例
export const restockRepository = new RestockRepository();
export const promotionRepository = new PromotionRepository();
