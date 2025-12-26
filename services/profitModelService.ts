
import { SavedProfitModel } from '../types';

const STORAGE_KEY = 'amz_profit_models';

/**
 * 产品利润模型数据服务
 * 使用 LocalStorage 进行数据持久化
 */
export class ProfitModelService {
    /**
     * 获取所有保存的利润模型
     */
    static getAll(): SavedProfitModel[] {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return [];
            return JSON.parse(data) as SavedProfitModel[];
        } catch (error) {
            console.error('Failed to load profit models:', error);
            return [];
        }
    }

    /**
     * 根据 ID 获取单个利润模型
     */
    static getById(id: string): SavedProfitModel | null {
        const all = this.getAll();
        return all.find(model => model.id === id) || null;
    }

    /**
     * 保存新的利润模型
     */
    static save(model: SavedProfitModel): boolean {
        try {
            const all = this.getAll();
            all.push(model);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
            return true;
        } catch (error) {
            console.error('Failed to save profit model:', error);
            return false;
        }
    }

    /**
     * 更新已存在的利润模型
     */
    static update(id: string, updates: Partial<SavedProfitModel>): boolean {
        try {
            const all = this.getAll();
            const index = all.findIndex(model => model.id === id);
            if (index === -1) return false;

            all[index] = { ...all[index], ...updates };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
            return true;
        } catch (error) {
            console.error('Failed to update profit model:', error);
            return false;
        }
    }

    /**
     * 删除利润模型
     */
    static delete(id: string): boolean {
        try {
            const all = this.getAll();
            const filtered = all.filter(model => model.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Failed to delete profit model:', error);
            return false;
        }
    }

    /**
     * 批量删除
     */
    static batchDelete(ids: string[]): boolean {
        try {
            const all = this.getAll();
            const filtered = all.filter(model => !ids.includes(model.id));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Failed to batch delete profit models:', error);
            return false;
        }
    }

    /**
     * 按产品名或 ASIN 搜索
     */
    static search(query: string): SavedProfitModel[] {
        const all = this.getAll();
        const lowerQuery = query.toLowerCase();
        return all.filter(model =>
            model.productName.toLowerCase().includes(lowerQuery) ||
            model.asin.toLowerCase().includes(lowerQuery) ||
            model.label.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * 按产品分组
     */
    static groupByProduct(): Map<string, SavedProfitModel[]> {
        const all = this.getAll();
        const grouped = new Map<string, SavedProfitModel[]>();

        all.forEach(model => {
            const key = `${model.productName}_${model.asin}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(model);
        });

        return grouped;
    }

    /**
     * 导出数据为 JSON
     */
    static exportToJSON(ids?: string[]): string {
        const data = ids ? this.getAll().filter(m => ids.includes(m.id)) : this.getAll();
        return JSON.stringify(data, null, 2);
    }

    /**
     * 导入数据
     */
    static importFromJSON(jsonString: string): boolean {
        try {
            const imported = JSON.parse(jsonString) as SavedProfitModel[];
            const all = this.getAll();

            // 合并数据，避免 ID 冲突
            const existingIds = new Set(all.map(m => m.id));
            const toImport = imported.filter(m => !existingIds.has(m.id));

            const merged = [...all, ...toImport];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return true;
        } catch (error) {
            console.error('Failed to import profit models:', error);
            return false;
        }
    }

    /**
     * 清空所有数据
     */
    static clear(): boolean {
        try {
            localStorage.removeItem(STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Failed to clear profit models:', error);
            return false;
        }
    }

    /**
     * 生成唯一 ID
     */
    static generateId(): string {
        return `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
