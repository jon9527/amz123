import { describe, it, expect, beforeEach } from 'vitest';
import { ProductRepository, IProductRepository } from '../repositories/ProductRepository';
import { IStorage } from '../repositories/Storage';

// Mock Storage 实现
class MockStorage implements IStorage {
    private store: Record<string, any> = {};

    get<T>(key: string): T | null {
        return this.store[key] ?? null;
    }

    set<T>(key: string, value: T): void {
        this.store[key] = value;
    }

    remove(key: string): void {
        delete this.store[key];
    }

    keys(): string[] {
        return Object.keys(this.store);
    }

    clear(): void {
        this.store = {};
    }
}

describe('ProductRepository', () => {
    let repo: IProductRepository;
    let mockStorage: MockStorage;

    beforeEach(() => {
        mockStorage = new MockStorage();
        repo = new ProductRepository(mockStorage);
    });

    describe('getAll', () => {
        it('应返回空数组当没有产品时', () => {
            expect(repo.getAll()).toEqual([]);
        });

        it('应返回所有已添加的产品', () => {
            repo.add({
                name: '测试产品',
                sku: 'TEST-001',
                length: 10,
                width: 10,
                height: 10,
                weight: 1,
                pcsPerBox: 20,
                unitCost: 10,
                defaultPrice: 19.99,
                updatedAt: 123
            });

            const products = repo.getAll();
            expect(products).toHaveLength(1);
            expect(products[0].name).toBe('测试产品');
        });
    });

    describe('add', () => {
        it('应生成唯一ID和displayId', () => {
            const product = repo.add({
                name: '新产品',
                sku: 'NEW-001',
                length: 5,
                width: 5,
                height: 5,
                weight: 0.5,
                pcsPerBox: 50,
                unitCost: 5,
                defaultPrice: 9.99,
                updatedAt: 123
            });

            expect(product.id).toMatch(/^prod_/);
            expect(product.displayId).toMatch(/^P-\d{4}$/);
            expect(product.createdAt).toBeGreaterThan(0);
        });

        it('应递增 displayId', () => {
            const p1 = repo.add({ name: 'P1', sku: '', length: 1, width: 1, height: 1, weight: 1, pcsPerBox: 1, unitCost: 1, defaultPrice: 1, updatedAt: 123 });
            const p2 = repo.add({ name: 'P2', sku: '', length: 1, width: 1, height: 1, weight: 1, pcsPerBox: 1, unitCost: 1, defaultPrice: 1, updatedAt: 123 });

            expect(p1.displayId).toBe('P-0001');
            expect(p2.displayId).toBe('P-0002');
        });
    });

    describe('getById', () => {
        it('应返回指定ID的产品', () => {
            const added = repo.add({ name: '查找测试', sku: '', length: 1, width: 1, height: 1, weight: 1, pcsPerBox: 1, unitCost: 1, defaultPrice: 1, updatedAt: 123 });
            const found = repo.getById(added.id);

            expect(found).toBeDefined();
            expect(found?.name).toBe('查找测试');
        });

        it('应返回 undefined 当产品不存在时', () => {
            expect(repo.getById('non-existent')).toBeUndefined();
        });
    });

    describe('update', () => {
        it('应更新指定产品的属性', () => {
            const product = repo.add({ name: '原名称', sku: '', length: 1, width: 1, height: 1, weight: 1, pcsPerBox: 1, unitCost: 1, defaultPrice: 1, updatedAt: 123 });
            const updated = repo.update(product.id, { name: '新名称', defaultPrice: 29.99 });

            expect(updated?.name).toBe('新名称');
            expect(updated?.defaultPrice).toBe(29.99);
        });

        it('应返回 undefined 当产品不存在时', () => {
            expect(repo.update('non-existent', { name: 'test' })).toBeUndefined();
        });
    });

    describe('delete', () => {
        it('应成功删除产品', () => {
            const product = repo.add({ name: '待删除', sku: '', length: 1, width: 1, height: 1, weight: 1, pcsPerBox: 1, unitCost: 1, defaultPrice: 1, updatedAt: 123 });
            const result = repo.delete(product.id);

            expect(result).toBe(true);
            expect(repo.getAll()).toHaveLength(0);
        });

        it('应返回 false 当产品不存在时', () => {
            expect(repo.delete('non-existent')).toBe(false);
        });
    });

    describe('clear', () => {
        it('应清空所有产品', () => {
            repo.add({ name: 'P1', sku: '', length: 1, width: 1, height: 1, weight: 1, pcsPerBox: 1, unitCost: 1, defaultPrice: 1, updatedAt: 123 });
            repo.add({ name: 'P2', sku: '', length: 1, width: 1, height: 1, weight: 1, pcsPerBox: 1, unitCost: 1, defaultPrice: 1, updatedAt: 123 });

            repo.clear();

            expect(repo.getAll()).toHaveLength(0);
        });
    });
});
