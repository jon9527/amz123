/**
 * Logistics Calculation Utilities
 * 物流成本计算工具函数
 */

import { r2 } from './formatters';

// ============ 物流渠道类型 ============
export interface LogisticsChannel {
    id: string;
    name: string;
    type: 'sea' | 'air' | 'exp';
    pricePerCbm?: number;    // 海运 $/CBM
    pricePerKg?: number;     // 空运/快递 $/kg (可选)
    transitDays?: number;    // 运输天数 (Optional in utils, required in types, keeping lenient)
    minWeight?: number;      // 最低计费重量
    volDivisor?: number;     // 体积重除数
    deliveryDays?: number;   // Alias for transitDays if coming from repo
    status?: 'active' | 'disabled'; // 状态
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
 * @param divisor 体积重除数 (默认 6000)
 */
export const calculateVolumeWeight = (length: number, width: number, height: number, divisor: number = 6000): number => {
    return r2((length * width * height) / divisor);
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
    // 确定体积重除数
    let divisor = channel.volDivisor || 6000;
    if (!channel.volDivisor) {
        if (channel.type === 'exp') divisor = 5000;
        else divisor = 6000; // Sea & Air default
    }

    const volumeWeight = calculateVolumeWeight(pkg.length, pkg.width, pkg.height, divisor);
    const actualWeight = pkg.weight;

    // 计费重量取较大者
    const billableWeight = Math.max(volumeWeight, actualWeight, channel.minWeight || 0);
    const method = volumeWeight > actualWeight ? 'volume' : 'weight';

    // 海运使用 CBM 计价 (必须有 CBM 报价)
    if (channel.type === 'sea' && channel.pricePerCbm) {
        // CBM = cm3 / 1,000,000
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

    // 其他情况 (空运/快递/海运按KG) 使用 kg 计价
    const perBox = r2(billableWeight * (channel.pricePerKg || 0));
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
