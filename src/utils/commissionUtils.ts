/**
 * Commission and Cost Calculation Utilities
 * 亚马逊佣金和退货成本计算的统一工具函数
 */

import { r2 } from './formatters';

// ============ 佣金费率参数 ============
export interface CommissionConfig {
    autoComm: boolean;     // 是否使用自动阶梯佣金
    manualComm: number;    // 手动佣金率 (百分比值，如 15 表示 15%)
}

// ============ 退货成本参数 ============
export interface ReturnCostParams {
    retProcFee: number;       // 退货处理费
    retRemFee: number;        // 移除费
    fbaFee: number;           // FBA配送费
    prodCostUSD: number;      // 采购成本 (USD)
    shippingUSD: number;      // 头程运费 (USD)
    returnRate: number;       // 退货率 (百分比值，如 5 表示 5%)
    unsellableRate: number;   // 不可售率 (百分比值，如 20 表示 20%)
}

// ============ 佣金费率计算 ============

/**
 * 获取亚马逊阶梯佣金费率
 * @param price 售价 (USD)
 * @param config 佣金配置
 * @returns 佣金费率 (0-1之间的小数)
 * 
 * 阶梯规则:
 * - price > $20: 17%
 * - $15 <= price <= $20: 10%
 * - price < $15: 5%
 */
export const getCommRate = (price: number, config: CommissionConfig): number => {
    if (!config.autoComm) {
        return config.manualComm / 100;
    }
    if (price > 20) return 0.17;
    if (price >= 15) return 0.10;
    return 0.05;
};

/**
 * 计算佣金金额
 * @param price 售价 (USD)
 * @param config 佣金配置
 * @returns 佣金金额 (USD)
 */
export const getCommValue = (price: number, config: CommissionConfig): number => {
    return r2(price * getCommRate(price, config));
};

// ============ 退货成本计算 ============

/**
 * 计算退货管理费 (Admin Fee)
 * 固定为佣金的 20%，封顶 $5.00
 * @param price 售价 (USD)
 * @param commRate 佣金费率 (0-1之间的小数)
 * @returns 退货管理费 (USD)
 */
export const getRefundAdminFee = (price: number, commRate: number): number => {
    if (price <= 0) return 0;
    return Math.min(5.00, (price * commRate) * 0.20);
};

/**
 * 计算综合退货损耗
 * 考虑可售和不可售两种情况的加权平均
 * @param price 售价 (USD)
 * @param commRate 佣金费率 (0-1之间的小数)
 * @param params 退货成本参数
 * @returns 单位退货损耗 (USD)
 */
export const getReturnCost = (
    price: number,
    commRate: number,
    params: ReturnCostParams
): number => {
    const { retProcFee, retRemFee, fbaFee, prodCostUSD, shippingUSD, returnRate, unsellableRate } = params;
    
    const adminFee = getRefundAdminFee(price, commRate);
    
    // 可售退货损失 = 退货处理费 + 管理费 + FBA费
    const lossSellable = retProcFee + adminFee + fbaFee;
    
    // 不可售退货损失 = 可售损失 + 采购成本 + 头程 + 移除费
    const lossUnsellable = lossSellable + prodCostUSD + shippingUSD + retRemFee;
    
    // 加权平均损失
    const unsellableRatio = unsellableRate / 100;
    const avgLoss = (lossSellable * (1 - unsellableRatio)) + (lossUnsellable * unsellableRatio);
    
    // 乘以退货率得到单位退货成本
    return r2(avgLoss * (returnRate / 100));
};

// ============ 盈亏平衡计算 ============

export interface BreakEvenParams extends ReturnCostParams {
    miscFee: number;      // 杂费
    storageFee: number;   // 仓储费
}

/**
 * 二分法求解盈亏平衡售价
 * @param params 成本参数
 * @param commConfig 佣金配置
 * @returns 盈亏平衡售价 (USD)
 */
export const findBreakEvenPrice = (
    params: BreakEvenParams,
    commConfig: CommissionConfig
): number => {
    const { prodCostUSD, shippingUSD, fbaFee, miscFee, storageFee } = params;
    
    let low = prodCostUSD + shippingUSD + fbaFee; // 绝对下限
    let high = 1000;

    for (let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;
        const rate = getCommRate(mid, commConfig);
        const commVal = mid * rate;
        const retCost = getReturnCost(mid, rate, params);
        const totalCost = prodCostUSD + shippingUSD + miscFee + storageFee + fbaFee + commVal + retCost;
        const profit = mid - totalCost;

        if (profit > 0) {
            high = mid;
        } else {
            low = mid;
        }
    }

    return r2(high);
};
