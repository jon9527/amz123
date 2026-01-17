/**
 * Profit Calculation Utilities
 * 利润计算核心工具函数
 */

import { r2 } from './formatters';
import { getCommRate, getReturnCost, ReturnCostParams } from './commissionUtils';

// ============ 成本结构参数 ============
export interface CostStructure {
    prodCostUSD: number;       // 采购成本 (USD)
    shippingUSD: number;       // 头程运费 (USD)
    fbaFee: number;            // FBA配送费
    miscFee: number;           // 杂费
    storageFee: number;        // 仓储费
}

// ============ 利润计算参数 ============
export interface ProfitCalcParams extends CostStructure {
    price: number;             // 售价 (USD)
    category?: 'standard' | 'apparel';
    returnParams: ReturnCostParams;
    targetAcos?: number;       // 目标 ACOS (百分比值, 如 15)
}

// ============ 利润计算结果 ============
export interface ProfitResult {
    price: number;             // 售价
    commRate: number;          // 佣金率
    commValue: number;         // 佣金金额
    returnCost: number;        // 退货损耗
    adsCost: number;           // 广告费
    sellCost: number;          // 销售成本 (不含广告)
    totalCost: number;         // 总成本 (含广告)
    grossProfit: number;       // 毛利润 (不含广告)
    netProfit: number;         // 净利润 (含广告)
    grossMargin: number;       // 毛利率 (0-1)
    netMargin: number;         // 净利率 (0-1)
}

/**
 * 计算单品利润明细
 * @param params 利润计算参数
 * @returns 利润计算结果
 */
export const calculateProfit = (params: ProfitCalcParams): ProfitResult => {
    const {
        price,
        prodCostUSD,
        shippingUSD,
        fbaFee,
        miscFee,
        storageFee,
        category = 'standard',
        returnParams,
        targetAcos = 0,
    } = params;

    // 1. 佣金
    const commRate = getCommRate(price, category);
    const commValue = r2(price * commRate);

    // 2. 退货损耗
    const returnCost = getReturnCost(price, commRate, returnParams);

    // 3. 广告费
    const adsCost = r2(price * (targetAcos / 100));

    // 4. 销售成本 (不含广告)
    const sellCost = r2(prodCostUSD + shippingUSD + fbaFee + miscFee + storageFee + commValue + returnCost);

    // 5. 总成本 (含广告)
    const totalCost = r2(sellCost + adsCost);

    // 6. 利润
    const grossProfit = r2(price - sellCost);
    const netProfit = r2(price - totalCost);

    // 7. 利润率
    const grossMargin = price > 0 ? grossProfit / price : 0;
    const netMargin = price > 0 ? netProfit / price : 0;

    return {
        price,
        commRate,
        commValue,
        returnCost,
        adsCost,
        sellCost,
        totalCost,
        grossProfit,
        netProfit,
        grossMargin,
        netMargin,
    };
};

/**
 * 计算目标售价 (给定目标利润率)
 * @param targetMargin 目标净利润率 (0-1, 如 0.15 表示 15%)
 * @param params 除价格外的计算参数
 * @returns 目标售价
 */
export const calculateTargetPrice = (
    targetMargin: number,
    params: Omit<ProfitCalcParams, 'price'>
): number => {
    // 二分法求解
    let low = 1;
    let high = 500;

    for (let i = 0; i < 30; i++) {
        const mid = (low + high) / 2;
        const result = calculateProfit({ ...params, price: mid });

        if (result.netMargin > targetMargin) {
            high = mid;
        } else {
            low = mid;
        }
    }

    return r2(high);
};

/**
 * 批量计算不同价格点的利润
 * @param prices 价格数组
 * @param params 其他计算参数
 * @returns 利润结果数组
 */
export const calculateProfitRange = (
    prices: number[],
    params: Omit<ProfitCalcParams, 'price'>
): ProfitResult[] => {
    return prices.map(price => calculateProfit({ ...params, price }));
};
