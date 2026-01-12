/**
 * Logistics Calculation Utilities
 * 物流成本计算工具函数
 */

import { r2 } from './formatters';

// ============ 物流渠道类型 ============
export interface LogisticsChannel {
    id: string;
    name: string;
    type: 'sea' | 'air' | 'express';
    pricePerCbm?: number;    // 海运 $/CBM
    pricePerKg: number;      // 空运/快递 $/kg
    transitDays: number;     // 运输天数
    minWeight?: number;      // 最低计费重量
}

// ============ 包装规格 ============
export interface PackageSpec {
    length: number;    // cm
    width: number;     // cm
    height: number;    // cm
    weight: number;    // kg
    pcsPerBox: number; // 每箱数量
}

// ============ 计算结果 ============
export interface ShippingCostResult {
    perUnit: number;       // 单件运费
    perBox: number;        // 每箱运费
    method: 'weight' | 'volume';  // 计费方式
    volumeWeight: number;  // 体积重 (kg)
    actualWeight: number;  // 实际重量 (kg)
    billableWeight: number; // 计费重量
}

/**
 * 计算体积重 (kg)
 * 国际标准: L x W x H (cm) / 5000
 */
export const calculateVolumeWeight = (length: number, width: number, height: number): number => {
    return r2((length * width * height) / 5000);
};

/**
 * 计算单件运费
 * @param pkg 包装规格
 * @param channel 物流渠道
 * @returns 运费计算结果
 */
export const calculateShippingCost = (
    pkg: PackageSpec,
    channel: LogisticsChannel
): ShippingCostResult => {
    const volumeWeight = calculateVolumeWeight(pkg.length, pkg.width, pkg.height);
    const actualWeight = pkg.weight;

    // 计费重量取较大者
    const billableWeight = Math.max(volumeWeight, actualWeight, channel.minWeight || 0);
    const method = volumeWeight > actualWeight ? 'volume' : 'weight';

    // 海运使用 CBM 计价
    if (channel.type === 'sea' && channel.pricePerCbm) {
        const cbm = (pkg.length * pkg.width * pkg.height) / 1000000;
        const perBox = r2(cbm * channel.pricePerCbm);
        return {
            perUnit: r2(perBox / pkg.pcsPerBox),
            perBox,
            method: 'volume',
            volumeWeight,
            actualWeight,
            billableWeight,
        };
    }

    // 空运/快递使用 kg 计价
    const perBox = r2(billableWeight * channel.pricePerKg);
    return {
        perUnit: r2(perBox / pkg.pcsPerBox),
        perBox,
        method,
        volumeWeight,
        actualWeight,
        billableWeight,
    };
};

/**
 * 比较多个物流渠道的成本
 */
export const compareShippingChannels = (
    pkg: PackageSpec,
    channels: LogisticsChannel[]
): Array<ShippingCostResult & { channel: LogisticsChannel }> => {
    return channels
        .map(channel => ({
            ...calculateShippingCost(pkg, channel),
            channel,
        }))
        .sort((a, b) => a.perUnit - b.perUnit);
};

/**
 * 计算预计到达日期
 */
export const calculateArrivalDate = (
    shipDate: Date,
    transitDays: number,
    prodDays: number = 0
): Date => {
    const result = new Date(shipDate);
    result.setDate(result.getDate() + prodDays + transitDays);
    return result;
};
