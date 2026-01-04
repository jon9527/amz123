// DataService - Unified data import/export for all localStorage data

const STORAGE_KEYS = [
    'amazon_product_library',
    'amazon_logistics_channels_v1',
    'amazon_profit_models',
    'exchangeRate',
    'amazon_replenishment_advisor_v1'
];

// Auth keys are excluded from backup to prevent PIN conflicts
const EXCLUDED_KEYS = [
    'amz123_auth_pin_hash',
    'amz123_lock_state',
    'amz123_last_activity'
];

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

        STORAGE_KEYS.forEach(key => {
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
                // Skip excluded keys
                if (EXCLUDED_KEYS.includes(key)) return;

                if (STORAGE_KEYS.includes(key)) {
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
        STORAGE_KEYS.forEach(key => {
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
            const products = localStorage.getItem('amazon_product_library');
            if (products) productCount = JSON.parse(products).length;
        } catch { }

        try {
            const models = localStorage.getItem('amazon_profit_models');
            if (models) modelCount = JSON.parse(models).length;
        } catch { }

        try {
            const channels = localStorage.getItem('amazon_logistics_channels_v1');
            if (channels) channelCount = JSON.parse(channels).length;
        } catch { }

        return { productCount, modelCount, channelCount };
    }
};
