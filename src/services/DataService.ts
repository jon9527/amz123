// DataService - Unified data import/export for all localStorage data

import { STORAGE_KEYS, BACKUP_EXCLUDED_KEYS } from '../repositories/StorageKeys';

// Build backup keys from STORAGE_KEYS, excluding auth-related keys
const BACKUP_KEYS = Object.values(STORAGE_KEYS).filter(
    key => !BACKUP_EXCLUDED_KEYS.includes(key as typeof BACKUP_EXCLUDED_KEYS[number])
);

export interface BackupData {
    version: string;
    timestamp: number;
    exportDate: string;
    data: Record<string, unknown>;
}

export const DataService = {
    /**
     * Export all app data as a JSON backup
     */
    exportAllData(): BackupData {
        const data: Record<string, unknown> = {};

        BACKUP_KEYS.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    data[key] = JSON.parse(value);
                } catch {
                    data[key] = value; // Store as-is if not JSON
                }
            }
        });

        return {
            version: '1.0',
            timestamp: Date.now(),
            exportDate: new Date().toISOString(),
            data
        };
    },

    /**
     * Download backup as JSON file
     */
    downloadBackup(): void {
        const backup = this.exportAllData();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `amz123-backup-${date}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Import data from a backup file
     */
    async importFromFile(file: File): Promise<{ success: boolean; message: string; itemCount?: number }> {
        try {
            const text = await file.text();
            const backup: BackupData = JSON.parse(text);

            // Validate backup format
            if (!backup.version || !backup.data) {
                return { success: false, message: '无效的备份文件格式' };
            }

            let itemCount = 0;

            // Restore each key
            Object.entries(backup.data).forEach(([key, value]) => {
                // Only restore keys in BACKUP_KEYS
                if ((BACKUP_KEYS as readonly string[]).includes(key)) {
                    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                    itemCount++;
                }
            });

            return {
                success: true,
                message: `成功导入 ${itemCount} 项数据`,
                itemCount
            };
        } catch (e) {
            console.error('Import error:', e);
            return { success: false, message: '文件解析失败，请检查文件格式' };
        }
    },

    /**
     * Clear all app data (except auth)
     */
    clearAllData(): void {
        BACKUP_KEYS.forEach(key => {
            localStorage.removeItem(key);
        });
    },

    /**
     * Get data statistics
     */
    getStats(): { productCount: number; modelCount: number; channelCount: number } {
        let productCount = 0;
        let modelCount = 0;
        let channelCount = 0;

        try {
            const products = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
            if (products) productCount = JSON.parse(products).length;
        } catch { }

        try {
            const models = localStorage.getItem(STORAGE_KEYS.PROFIT_MODELS);
            if (models) modelCount = JSON.parse(models).length;
        } catch { }

        try {
            const channels = localStorage.getItem(STORAGE_KEYS.LOGISTICS_CHANNELS);
            if (channels) channelCount = JSON.parse(channels).length;
        } catch { }

        return { productCount, modelCount, channelCount };
    }
};
