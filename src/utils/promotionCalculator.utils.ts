/**
 * Promotion Calculation Utilities
 * 推广推演核心计算逻辑
 */

import { r2 } from './formatters';
import { getCommRate, getReturnCost, CommissionConfig, ReturnCostParams } from './commissionUtils';

// ============ 月度配置 ============
export interface MonthConfig {
    id: number;
    label: string;
    price: number;
    dailyUnits: number;
    adShare: number;
    cpc: number;
    cvr: number;
}

// ============ 基础数据 ============
export interface PromotionBaseData {
    prod: number;       // 采购成本 USD
    firstMile: number;  // 头程运费 USD
    misc: number;       // 杂费
    fba: number;        // FBA 配送费
    storage: number;    // 月仓储费
    retProc: number;    // 退货处理费
    retRem: number;     // 移除费
    retRate: number;    // 退货率 (0-1)
    unsellable: number; // 不可售率 (0-1)
}

// ============ 月度计算结果 ============
export interface MonthResult {
    totalUnits: number;
    adUnits: number;
    orgUnits: number;
    revenue: number;
    adSpend: number;
    totalProfit: number;
    tacos: number;
    unit: {
        price: number;
        prod: number;
        firstMile: number;
        misc: number;
        fba: number;
        storage: number;
        comm: number;
        commRate: number;
        ret: number;
        cpa: number;
        grossOrganic: number;
        netAd: number;
    };
}

/**
 * 计算月度推广结果
 * @param month 月度配置
 * @param baseData 基础成本数据
 * @param commConfig 佣金配置
 * @returns 月度计算结果
 */
export const calculateMonthResult = (
    month: MonthConfig,
    baseData: PromotionBaseData,
    commConfig: CommissionConfig
): MonthResult => {
    const days = 30;
    const totalUnits = month.dailyUnits * days;
    const adUnits = Math.ceil(totalUnits * (month.adShare / 100));
    const orgUnits = totalUnits - adUnits;

    // 动态单位经济
    const commRate = getCommRate(month.price, commConfig);
    const comm = r2(month.price * commRate);

    // 退货成本
    const returnParams: ReturnCostParams = {
        retProcFee: baseData.retProc,
        retRemFee: baseData.retRem,
        fbaFee: baseData.fba,
        prodCostUSD: baseData.prod,
        shippingUSD: baseData.firstMile,
        returnRate: baseData.retRate * 100,
        unsellableRate: baseData.unsellable * 100,
    };
    const ret = getReturnCost(month.price, commRate, returnParams);

    // 总 COGS
    const totalCOGS = baseData.prod + baseData.firstMile + baseData.misc + baseData.fba + baseData.storage + comm + ret;
    const grossOrganic = r2(month.price - totalCOGS);

    // CPA 和广告单位利润
    const cpa = month.cvr > 0 ? r2(month.cpc / (month.cvr / 100)) : 0;
    const netAd = r2(grossOrganic - cpa);

    // 汇总
    const revenue = r2(totalUnits * month.price);
    const adSpend = r2(adUnits * cpa);
    const totalProfit = r2((orgUnits * grossOrganic) + (adUnits * netAd));
    const tacos = revenue > 0 ? r2(adSpend / revenue) : 0;

    return {
        totalUnits,
        adUnits,
        orgUnits,
        revenue,
        adSpend,
        totalProfit,
        tacos,
        unit: {
            price: month.price,
            prod: baseData.prod,
            firstMile: baseData.firstMile,
            misc: baseData.misc,
            fba: baseData.fba,
            storage: baseData.storage,
            comm,
            commRate,
            ret,
            cpa,
            grossOrganic,
            netAd,
        },
    };
};

/**
 * 计算多月累计利润
 * @param months 月度配置数组
 * @param baseData 基础成本数据
 * @param commConfig 佣金配置
 * @returns 累计利润
 */
export const calculateCumulativeProfit = (
    months: MonthConfig[],
    baseData: PromotionBaseData,
    commConfig: CommissionConfig
): number => {
    return months.reduce((sum, month) => {
        const result = calculateMonthResult(month, baseData, commConfig);
        return sum + result.totalProfit;
    }, 0);
};

/**
 * 计算回本月份
 * @param months 月度配置数组
 * @param baseData 基础成本数据
 * @param commConfig 佣金配置
 * @param initialInvestment 初始投资
 * @returns 回本月份索引，-1 表示未回本
 */
export const calculateBreakevenMonth = (
    months: MonthConfig[],
    baseData: PromotionBaseData,
    commConfig: CommissionConfig,
    initialInvestment: number
): number => {
    let cumulative = -initialInvestment;

    for (let i = 0; i < months.length; i++) {
        const result = calculateMonthResult(months[i], baseData, commConfig);
        cumulative += result.totalProfit;
        if (cumulative >= 0) {
            return i;
        }
    }

    return -1; // 未回本
};
