/**
 * Replenishment Plan Repository
 * 补货规划方案数据访问层
 */

import { SavedReplenishmentPlan } from '../types';
import { IStorage, defaultStorage } from './Storage';
import { STORAGE_KEYS } from './StorageKeys';

export interface IReplenishmentPlanRepository {
    getAll(): SavedReplenishmentPlan[];
    getById(id: string): SavedReplenishmentPlan | undefined;
    getByProductId(productId: string): SavedReplenishmentPlan[];
    getByStrategyId(strategyId: string): SavedReplenishmentPlan[];
    save(plan: SavedReplenishmentPlan): boolean;
    update(id: string, updates: Partial<SavedReplenishmentPlan>): boolean;
    delete(id: string): boolean;
}

export class ReplenishmentPlanRepository implements IReplenishmentPlanRepository {
    private storage: IStorage;

    constructor(storage: IStorage = defaultStorage) {
        this.storage = storage;
    }

    getAll(): SavedReplenishmentPlan[] {
        return this.storage.get<SavedReplenishmentPlan[]>(STORAGE_KEYS.REPLENISHMENT_PLANS) || [];
    }

    getById(id: string): SavedReplenishmentPlan | undefined {
        return this.getAll().find(p => p.id === id);
    }

    getByProductId(productId: string): SavedReplenishmentPlan[] {
        return this.getAll().filter(p => p.productId === productId);
    }

    getByStrategyId(strategyId: string): SavedReplenishmentPlan[] {
        return this.getAll().filter(p => p.strategyId === strategyId);
    }

    save(plan: SavedReplenishmentPlan): boolean {
        try {
            const all = this.getAll();
            all.push(plan);
            this.storage.set(STORAGE_KEYS.REPLENISHMENT_PLANS, all);
            return true;
        } catch {
            return false;
        }
    }

    update(id: string, updates: Partial<SavedReplenishmentPlan>): boolean {
        try {
            const all = this.getAll();
            const index = all.findIndex(p => p.id === id);
            if (index === -1) return false;

            all[index] = { ...all[index], ...updates, updatedAt: Date.now() };
            this.storage.set(STORAGE_KEYS.REPLENISHMENT_PLANS, all);
            return true;
        } catch {
            return false;
        }
    }

    delete(id: string): boolean {
        try {
            const all = this.getAll();
            const filtered = all.filter(p => p.id !== id);
            this.storage.set(STORAGE_KEYS.REPLENISHMENT_PLANS, filtered);
            return true;
        } catch {
            return false;
        }
    }

    static generateId(): string {
        return `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export const replenishmentPlanRepository = new ReplenishmentPlanRepository();
