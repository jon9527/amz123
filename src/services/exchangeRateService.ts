/**
 * Exchange Rate Service
 * 汇率服务 - 带缓存和离线容错
 */

const CACHE_KEY = 'exchange_rate_cache';
const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4小时缓存

interface CachedRate {
    rate: number;
    timestamp: number;
    source: 'api' | 'manual' | 'fallback';
}

const DEFAULT_RATE = 7.2; // 默认汇率 (离线fallback)
const API_URL = 'https://open.er-api.com/v6/latest/USD';

/**
 * 从缓存获取汇率
 */
const getCachedRate = (): CachedRate | null => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch { }
    return null;
};

/**
 * 保存汇率到缓存
 */
const setCachedRate = (rate: number, source: 'api' | 'manual' | 'fallback'): void => {
    const data: CachedRate = {
        rate,
        timestamp: Date.now(),
        source,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
};

/**
 * 判断缓存是否有效
 */
const isCacheValid = (cached: CachedRate | null): boolean => {
    if (!cached) return false;
    // 手动设置的汇率永不过期（除非用户刷新）
    if (cached.source === 'manual') return true;
    return (Date.now() - cached.timestamp) < CACHE_DURATION_MS;
};

/**
 * 从 API 获取实时汇率
 */
const fetchRateFromAPI = async (): Promise<number | null> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const res = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (data?.rates?.CNY) {
            return Math.round(data.rates.CNY * 100) / 100; // 保留2位小数
        }
    } catch (e) {
        console.warn('[ExchangeRate] API fetch failed:', e);
    }
    return null;
};

/**
 * 获取汇率 (带缓存策略)
 * 优先级: 有效缓存 > API > 过期缓存 > 默认值
 */
export const getExchangeRate = async (): Promise<{ rate: number; source: 'cache' | 'api' | 'fallback' }> => {
    const cached = getCachedRate();

    // 1. 如果缓存有效,直接返回
    if (isCacheValid(cached)) {
        return { rate: cached!.rate, source: 'cache' };
    }

    // 2. 尝试从API获取
    const apiRate = await fetchRateFromAPI();
    if (apiRate !== null) {
        setCachedRate(apiRate, 'api');
        return { rate: apiRate, source: 'api' };
    }

    // 3. API 失败，使用过期缓存
    if (cached) {
        console.warn('[ExchangeRate] Using stale cache');
        return { rate: cached.rate, source: 'fallback' };
    }

    // 4. 无缓存，使用默认值
    setCachedRate(DEFAULT_RATE, 'fallback');
    return { rate: DEFAULT_RATE, source: 'fallback' };
};

/**
 * 手动设置汇率 (用户覆盖)
 */
export const setManualExchangeRate = (rate: number): void => {
    setCachedRate(rate, 'manual');
};

/**
 * 清除手动设置，重新从API获取
 */
export const resetExchangeRate = async (): Promise<number> => {
    localStorage.removeItem(CACHE_KEY);
    const result = await getExchangeRate();
    return result.rate;
};

/**
 * 获取汇率缓存信息 (用于UI显示)
 */
export const getExchangeRateInfo = (): {
    rate: number;
    source: 'api' | 'manual' | 'fallback';
    lastUpdated: Date | null;
    isStale: boolean;
} => {
    const cached = getCachedRate();
    if (!cached) {
        return {
            rate: DEFAULT_RATE,
            source: 'fallback',
            lastUpdated: null,
            isStale: true,
        };
    }
    return {
        rate: cached.rate,
        source: cached.source,
        lastUpdated: new Date(cached.timestamp),
        isStale: !isCacheValid(cached),
    };
};
