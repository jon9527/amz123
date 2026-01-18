/**
 * ExchangeRateContext
 * 统一汇率上下文 - 全项目共享同一个汇率数据源
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getExchangeRate, setManualExchangeRate, resetExchangeRate } from '../services/exchangeRateService';

interface ExchangeRateContextValue {
    /** 当前汇率 (USD → CNY) */
    rate: number;
    /** 是否为用户手动设置的汇率 */
    isManual: boolean;
    /** 手动设置汇率 */
    setRate: (rate: number) => void;
    /** 重置为API实时汇率 */
    resetToLive: () => Promise<void>;
    /** 是否正在加载 */
    isLoading: boolean;
}

const ExchangeRateContext = createContext<ExchangeRateContextValue | null>(null);

export const ExchangeRateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [rate, setRateState] = useState(7.2); // 默认值，会在 mount 时更新
    const [isManual, setIsManual] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 初始化：从 service 获取汇率
    useEffect(() => {
        const init = async () => {
            try {
                const result = await getExchangeRate();
                setRateState(result.rate);
                setIsManual(result.source === 'cache'); // cache 可能是 manual 或 api
                // 更精确判断：读取 localStorage 中的 exchange_rate_cache
                const cached = localStorage.getItem('exchange_rate_cache');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setIsManual(parsed.source === 'manual');
                }
            } catch {
                // 保持默认值
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    // 手动设置汇率
    const setRate = useCallback((newRate: number) => {
        const rounded = Math.round(newRate * 100) / 100;
        setRateState(rounded);
        setIsManual(true);
        setManualExchangeRate(rounded);
    }, []);

    // 重置为 API 实时汇率
    const resetToLive = useCallback(async () => {
        setIsLoading(true);
        try {
            const newRate = await resetExchangeRate();
            setRateState(newRate);
            setIsManual(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const value = useMemo(() => ({
        rate,
        isManual,
        setRate,
        resetToLive,
        isLoading,
    }), [rate, isManual, setRate, resetToLive, isLoading]);

    return (
        <ExchangeRateContext.Provider value={value}>
            {children}
        </ExchangeRateContext.Provider>
    );
};

/**
 * Hook: 获取统一汇率
 */
export const useExchangeRate = (): ExchangeRateContextValue => {
    const context = useContext(ExchangeRateContext);
    if (!context) {
        throw new Error('useExchangeRate must be used within ExchangeRateProvider');
    }
    return context;
};

/**
 * Hook: 仅获取汇率数值（用于不需要完整控制的组件）
 */
export const useExchangeRateValue = (): number => {
    const { rate } = useExchangeRate();
    return rate;
};
