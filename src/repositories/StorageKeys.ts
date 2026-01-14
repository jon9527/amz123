/**
 * Storage Keys
 * 统一管理所有 LocalStorage 键名
 */

export const STORAGE_KEYS = {
    // 产品数据
    PRODUCTS: 'amz_products',

    // 利润模型
    PROFIT_MODELS: 'amz_profit_models',

    // 物流渠道
    LOGISTICS_CHANNELS: 'amz_logistics_channels',

    // 补货设置
    RESTOCK_SETTINGS: 'amz_restock_settings',

    // 推广计划
    PROMOTION_PLANS: 'amz_promotion_plans',

    // 补货规划状态
    REPLENISHMENT_STATE: 'amz_replenishment_state',

    // 补货规划方案
    REPLENISHMENT_PLANS: 'amz_replenishment_plans',

    // 用户设置
    EXCHANGE_RATE: 'amz_exchange_rate',
    THEME: 'amz_theme',

    // 日志
    LOGGER_LOGS: 'amz_logger_logs',
    LOGGER_SETTINGS: 'amz_logger_settings',

    // 认证（不参与数据备份）
    AUTH_PIN: 'amz_auth_pin',
    AUTH_LOCKED: 'amz_auth_locked',
    AUTH_ATTEMPTS: 'amz_auth_attempts',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// 备份时排除的键
export const BACKUP_EXCLUDED_KEYS: StorageKey[] = [
    STORAGE_KEYS.AUTH_PIN,
    STORAGE_KEYS.AUTH_LOCKED,
    STORAGE_KEYS.AUTH_ATTEMPTS,
];
