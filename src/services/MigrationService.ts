/**
 * Migration Service
 * 数据迁移服务 - 将旧 storage key 数据迁移到新 key
 * 
 * 安全措施:
 * 1. 迁移前自动创建完整备份
 * 2. 仅在旧 key 有数据且新 key 无数据时迁移
 * 3. 迁移成功后保留旧数据（不删除）
 * 4. 提供回滚功能
 * 5. 详细日志记录
 */

import { STORAGE_KEYS } from '../repositories/StorageKeys';

// 旧 key -> 新 key 映射
const MIGRATION_MAP: Record<string, string> = {
    // Products
    'amazon_product_library': STORAGE_KEYS.PRODUCTS,

    // Logistics
    'amazon_logistics_channels_v1': STORAGE_KEYS.LOGISTICS_CHANNELS,

    // Profit Models
    'amazon_profit_models': STORAGE_KEYS.PROFIT_MODELS,

    // Restock Settings
    'amazon_restock_settings': STORAGE_KEYS.RESTOCK_SETTINGS,

    // Promotion Plans
    'amazon_promotion_plans': STORAGE_KEYS.PROMOTION_PLANS,

    // Exchange Rate
    'exchangeRate': STORAGE_KEYS.EXCHANGE_RATE,

    // Replenishment State
    'amazon_replenishment_advisor_v1': STORAGE_KEYS.REPLENISHMENT_STATE,
    'replenishment_advice_state': STORAGE_KEYS.REPLENISHMENT_STATE,

    // SKU Groups (Order matters: sku_groups_data is primary)
    'skuGroups': STORAGE_KEYS.SKU_GROUPS,
    'sku_groups_data': STORAGE_KEYS.SKU_GROUPS,

    // Manual Exchange Rate
    'isManualExchangeRate': STORAGE_KEYS.IS_MANUAL_EXCHANGE_RATE,

    // Logger
    'amz123_logs': STORAGE_KEYS.LOGGER_LOGS,
    'amz123_log_settings': STORAGE_KEYS.LOGGER_SETTINGS,
};

// 迁移版本号（用于标记已完成的迁移）
const MIGRATION_VERSION_KEY = 'amz_migration_version';
const CURRENT_MIGRATION_VERSION = 1;

// 备份 key 前缀
const BACKUP_PREFIX = 'amz_backup_';

export interface MigrationResult {
    success: boolean;
    migratedKeys: string[];
    skippedKeys: string[];
    errors: string[];
    backupKey?: string;
}

export const MigrationService = {
    /**
     * 检查是否需要迁移
     */
    needsMigration(): boolean {
        const version = localStorage.getItem(MIGRATION_VERSION_KEY);
        if (version && parseInt(version) >= CURRENT_MIGRATION_VERSION) {
            return false;
        }

        // 检查是否有旧数据需要迁移
        for (const oldKey of Object.keys(MIGRATION_MAP)) {
            const oldData = localStorage.getItem(oldKey);
            if (oldData) {
                return true;
            }
        }

        return false;
    },

    /**
     * 创建迁移前备份
     */
    createBackup(): string {
        const timestamp = Date.now();
        const backupKey = `${BACKUP_PREFIX}${timestamp}`;
        const backup: Record<string, string> = {};

        // 备份所有相关 key
        const allKeys = new Set([
            ...Object.keys(MIGRATION_MAP),
            ...Object.values(MIGRATION_MAP),
        ]);

        allKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                backup[key] = value;
            }
        });

        localStorage.setItem(backupKey, JSON.stringify({
            version: CURRENT_MIGRATION_VERSION,
            timestamp,
            date: new Date().toISOString(),
            data: backup,
        }));

        console.log(`[Migration] Backup created: ${backupKey}`);
        return backupKey;
    },

    /**
     * 执行迁移
     */
    migrate(): MigrationResult {
        const result: MigrationResult = {
            success: true,
            migratedKeys: [],
            skippedKeys: [],
            errors: [],
        };

        console.log('[Migration] Starting migration...');

        // 1. 创建备份
        try {
            result.backupKey = this.createBackup();
        } catch (error) {
            result.success = false;
            result.errors.push(`Backup failed: ${error}`);
            console.error('[Migration] Backup failed:', error);
            return result;
        }

        // 2. 执行迁移
        for (const [oldKey, newKey] of Object.entries(MIGRATION_MAP)) {
            try {
                const oldData = localStorage.getItem(oldKey);
                const newData = localStorage.getItem(newKey);

                // 仅在旧有数据且新无数据时迁移
                if (oldData && !newData) {
                    localStorage.setItem(newKey, oldData);
                    result.migratedKeys.push(`${oldKey} -> ${newKey}`);
                    console.log(`[Migration] Migrated: ${oldKey} -> ${newKey}`);
                } else if (oldData && newData) {
                    result.skippedKeys.push(`${oldKey} (new key already has data)`);
                    console.log(`[Migration] Skipped: ${oldKey} (new key already has data)`);
                } else {
                    result.skippedKeys.push(`${oldKey} (no old data)`);
                }
            } catch (error) {
                result.errors.push(`Failed to migrate ${oldKey}: ${error}`);
                console.error(`[Migration] Error migrating ${oldKey}:`, error);
            }
        }

        // 3. 标记迁移完成
        if (result.errors.length === 0) {
            localStorage.setItem(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION.toString());
            console.log('[Migration] Migration completed successfully');
        } else {
            result.success = false;
            console.warn('[Migration] Migration completed with errors');
        }

        return result;
    },

    /**
     * 从备份回滚
     */
    rollback(backupKey: string): boolean {
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                console.error(`[Migration] Backup not found: ${backupKey}`);
                return false;
            }

            const backup = JSON.parse(backupData);

            // 清除所有迁移相关的 key
            const allKeys = new Set([
                ...Object.keys(MIGRATION_MAP),
                ...Object.values(MIGRATION_MAP),
            ]);

            allKeys.forEach(key => {
                localStorage.removeItem(key);
            });

            // 恢复备份数据
            Object.entries(backup.data as Record<string, string>).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });

            // 清除迁移版本标记
            localStorage.removeItem(MIGRATION_VERSION_KEY);

            console.log(`[Migration] Rollback completed from: ${backupKey}`);
            return true;
        } catch (error) {
            console.error('[Migration] Rollback failed:', error);
            return false;
        }
    },

    /**
     * 获取所有备份
     */
    getBackups(): string[] {
        const backups: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(BACKUP_PREFIX)) {
                backups.push(key);
            }
        }
        return backups.sort().reverse(); // 最新的在前
    },

    /**
     * 清理旧数据（迁移成功后可选调用）
     */
    cleanupOldKeys(): string[] {
        const cleaned: string[] = [];
        for (const oldKey of Object.keys(MIGRATION_MAP)) {
            const oldData = localStorage.getItem(oldKey);
            if (oldData) {
                localStorage.removeItem(oldKey);
                cleaned.push(oldKey);
                console.log(`[Migration] Cleaned up: ${oldKey}`);
            }
        }
        return cleaned;
    },

    /**
     * 获取迁移状态
     */
    getStatus(): {
        version: number | null;
        needsMigration: boolean;
        oldKeysWithData: string[];
        newKeysWithData: string[];
    } {
        const version = localStorage.getItem(MIGRATION_VERSION_KEY);
        const oldKeysWithData: string[] = [];
        const newKeysWithData: string[] = [];

        for (const [oldKey, newKey] of Object.entries(MIGRATION_MAP)) {
            if (localStorage.getItem(oldKey)) {
                oldKeysWithData.push(oldKey);
            }
            if (localStorage.getItem(newKey)) {
                newKeysWithData.push(newKey);
            }
        }

        return {
            version: version ? parseInt(version) : null,
            needsMigration: this.needsMigration(),
            oldKeysWithData,
            newKeysWithData,
        };
    },
};

export default MigrationService;
