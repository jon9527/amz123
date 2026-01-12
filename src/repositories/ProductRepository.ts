/**
 * Product Repository
 * 产品数据访问层
 */

import { ProductSpec } from '../types';
import { IStorage, defaultStorage } from './Storage';
import { STORAGE_KEYS } from './StorageKeys';

export interface IProductRepository {
    getAll(): ProductSpec[];
    getById(id: string): ProductSpec | undefined;
    add(product: Omit<ProductSpec, 'id' | 'createdAt' | 'displayId'>): ProductSpec;
    update(id: string, updates: Partial<ProductSpec>): ProductSpec | undefined;
    delete(id: string): boolean;
    clear(): void;
}

export class ProductRepository implements IProductRepository {
    private storage: IStorage;
    private nextDisplayId: number = 1;

    constructor(storage: IStorage = defaultStorage) {
        this.storage = storage;
        this.initDisplayId();
    }

    private initDisplayId(): void {
        const products = this.getAll();
        if (products.length > 0) {
            const maxId = products.reduce((max, p) => {
                const num = parseInt(p.displayId?.replace('P-', '') || '0');
                return num > max ? num : max;
            }, 0);
            this.nextDisplayId = maxId + 1;
        }
    }

    private generateDisplayId(): string {
        return `P-${String(this.nextDisplayId++).padStart(4, '0')}`;
    }

    private generateId(): string {
        return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getAll(): ProductSpec[] {
        return this.storage.get<ProductSpec[]>(STORAGE_KEYS.PRODUCTS) || [];
    }

    getById(id: string): ProductSpec | undefined {
        return this.getAll().find(p => p.id === id);
    }

    add(product: Omit<ProductSpec, 'id' | 'createdAt' | 'displayId'>): ProductSpec {
        const products = this.getAll();
        const newProduct: ProductSpec = {
            ...product,
            id: this.generateId(),
            displayId: this.generateDisplayId(),
            createdAt: Date.now(),
        };
        products.push(newProduct);
        this.storage.set(STORAGE_KEYS.PRODUCTS, products);
        return newProduct;
    }

    update(id: string, updates: Partial<ProductSpec>): ProductSpec | undefined {
        const products = this.getAll();
        const index = products.findIndex(p => p.id === id);
        if (index === -1) return undefined;

        products[index] = { ...products[index], ...updates };
        this.storage.set(STORAGE_KEYS.PRODUCTS, products);
        return products[index];
    }

    delete(id: string): boolean {
        const products = this.getAll();
        const filtered = products.filter(p => p.id !== id);
        if (filtered.length === products.length) return false;

        this.storage.set(STORAGE_KEYS.PRODUCTS, filtered);
        return true;
    }

    clear(): void {
        this.storage.set(STORAGE_KEYS.PRODUCTS, []);
        this.nextDisplayId = 1;
    }
}

// 默认实例
export const productRepository = new ProductRepository();
