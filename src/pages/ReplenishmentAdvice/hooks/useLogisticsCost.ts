import { useEffect, useState } from 'react';
import { LogisticsChannel } from '../../../types';

export interface LogisticsCosts {
    sea: number;
    air: number;
    exp: number;
}

interface BoxDimensions {
    boxL: number;
    boxW: number;
    boxH: number;
    boxWgt: number;
    pcsPerBox: number;
}

interface PriceConfig {
    seaPriceCbm: number;
    seaPriceKg: number;
    seaUnit: 'cbm' | 'kg';
    airPriceKg: number;
    expPriceKg: number;
    seaChannelId?: string;
    airChannelId?: string;
    expChannelId?: string;
}

interface UseLogisticsCostParams {
    dimensions: BoxDimensions;
    priceConfig: PriceConfig;
    channels: LogisticsChannel[];
}

/**
 * 物流成本计算 Hook
 * 纯提取自 ReplenishmentAdvice，保持原有逻辑
 */
export const useLogisticsCost = ({
    dimensions,
    priceConfig,
    channels,
}: UseLogisticsCostParams): LogisticsCosts => {
    const [logCosts, setLogCosts] = useState<LogisticsCosts>({ sea: 0, air: 0, exp: 0 });

    useEffect(() => {
        const { boxL, boxW, boxH, boxWgt, pcsPerBox } = dimensions;
        const { seaPriceCbm, seaPriceKg, seaUnit, airPriceKg, expPriceKg, seaChannelId, airChannelId, expChannelId } = priceConfig;

        if (pcsPerBox === 0) return;

        const calcOne = (type: 'sea' | 'air' | 'exp', manualPrice: number, chanId?: string) => {
            const channel = channels.find(c => c.id === chanId);

            // 确定是否按KG计费
            let useKg = type !== 'sea';
            if (type === 'sea') {
                if (channel) {
                    useKg = !!channel.pricePerKg && channel.pricePerKg > 0;
                } else {
                    useKg = seaUnit === 'kg';
                }
            }

            const volDivisor = channel
                ? (channel.volDivisor || 0)
                : (type === 'sea' ? 6000 : (type === 'air' ? 6000 : 5000));

            let price = 0;
            if (channel) {
                price = useKg ? (channel.pricePerKg || 0) : (channel.pricePerCbm || 0);
            } else {
                price = (type === 'sea' && useKg) ? seaPriceKg : manualPrice;
            }

            // Volumetric Weight
            const dimVol = boxL * boxW * boxH; // cm3
            const divisor = volDivisor > 0 ? volDivisor : 6000;
            const volWgt = dimVol / divisor;
            const chgWgt = Math.max(boxWgt, volWgt);

            if (type === 'sea') {
                if (useKg) {
                    return (chgWgt * price) / pcsPerBox;
                } else {
                    return ((chgWgt / 167) * price) / pcsPerBox;
                }
            } else {
                return (chgWgt * price) / pcsPerBox;
            }
        };

        setLogCosts({
            sea: calcOne('sea', seaPriceCbm, seaChannelId),
            air: calcOne('air', airPriceKg, airChannelId),
            exp: calcOne('exp', expPriceKg, expChannelId),
        });
    }, [dimensions, priceConfig, channels]);

    return logCosts;
};
