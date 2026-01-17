import { useEffect, useState } from 'react';
import { LogisticsChannel } from '../../../types';
import { calculateShippingCost, PackageSpec } from '../../../utils/logisticsCalculator.utils';

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
 * 使用统一的 calculateShippingCost 工具函数
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

        if (pcsPerBox === 0 || boxL === 0 || boxW === 0 || boxH === 0) return;

        // 构造包装规格对象
        const pkg: PackageSpec = {
            length: boxL,
            width: boxW,
            height: boxH,
            weight: boxWgt,
            pcsPerBox: pcsPerBox
        };

        const calcOne = (type: 'sea' | 'air' | 'exp', manualPriceCbm: number, manualPriceKg: number, chanId?: string): number => {
            const selectedChannel = channels.find(c => c.id === chanId);

            // 构造计算用的渠道对象 (包含手动模式处理)
            // 如果选中了渠道，直接使用；否则构造临时对象
            let calcChannel: LogisticsChannel;

            if (selectedChannel) {
                calcChannel = selectedChannel;
            } else {
                // 手动模式
                calcChannel = {
                    id: 'manual',
                    name: 'Manual',
                    type: type,
                    status: 'active',
                    deliveryDays: 0,
                    pricePerKg: manualPriceKg,
                    pricePerCbm: (type === 'sea' && seaUnit === 'cbm') ? manualPriceCbm : undefined,
                };
            }

            // 特殊处理：如果海运且强制使用KG模式 (手动设置 seaUnit='kg')，即使是 Sea 类型也需要屏蔽 pricePerCbm
            // 但如果是选中的渠道，且渠道本身支持 CBM，utils 优先用 CBM。
            // 需求：如果用户在界面上选了 "按KG"，是否应该强制覆盖渠道的默认计费方式？
            // 看 index.tsx 之前的逻辑：
            // if (channel) { useKg = !!channel.pricePerKg && channel.pricePerKg > 0; }
            // else { useKg = seaUnit === 'kg'; }
            // 之前的逻辑是：如果选了渠道，优先用渠道的配置（如果有KG价就用KG?? 不，之前逻辑是 `useKg = !!channel.pricePerKg` 是有问题的，通常海运优先CBM）
            // 让我们回顾 index.tsx 原逻辑:
            /*
            if (type === 'sea') {
                if (channel) {
                    useKg = !!channel.pricePerKg && channel.pricePerKg > 0; // 这意味着只要渠道有KG报价，就强制按KG算？这似乎不符合常理（海运通常CBM）
                    // 除非这个逻辑是意图：如果有KG报价，说明是海派（按KG），否则是海卡（按CBM）
                } else {
                    useKg = seaUnit === 'kg';
                }
            }
            */
            // 让我们保持这个智能判断逻辑：
            // 如果是 Sea，且传入对象同时有 pricePerCbm 和 pricePerKg，utils 默认优先 CBM。
            // 所以我们需要根据上述逻辑，构造 calcChannel 时决定是否传入 pricePerCbm。

            // 修正后的构造逻辑：
            if (selectedChannel) {
                // 继承渠道属性
                calcChannel = { ...selectedChannel };

                // 模拟 index.tsx 的判断逻辑：
                // 如果是海运，且我们想强制按 KG 算 (如果原逻辑是这样的话)
                // 原逻辑：useKg = !!channel.pricePerKg && channel.pricePerKg > 0;
                // 这意味着只要有 KG 价，就用 KG。所以我们需要移除 pricePerCbm 以强制 utils 用 KG。
                if (type === 'sea' && selectedChannel.pricePerKg && selectedChannel.pricePerKg > 0) {
                    delete calcChannel.pricePerCbm;
                }
            } else {
                // 手动模式
                // calcChannel 已在上文初始化，逻辑正确
            }

            const result = calculateShippingCost(pkg, calcChannel);

            // 返回单件运费 (Per Unit)。
            // 之前的 hook 返回的是: (costRMB) / pcsPerBox.
            // utils 返回的 result.perUnit 就是 单件运费。
            // 但是！utils 返回的 perUnit 是保留2位小数的 (r2)。
            // 而之前的逻辑 costRMB 是 (chgWgt * price) / pcsPerBox，没有过早取整？
            // 之前的逻辑： return costRMB;
            // index.tsx Render: costUSD = logCosts[type] / exchRate;
            // 看起来我们需要高精度的值？
            // calculateShippingCost 返回的 perUnit 是经过 r2 的。
            // 如果我们需要更高精度，可以使用 result.perBox / pcsPerBox。

            return result.perBox / pkg.pcsPerBox;
        };

        setLogCosts({
            sea: calcOne('sea', seaPriceCbm, seaPriceKg, seaChannelId),
            air: calcOne('air', 0, airPriceKg, airChannelId),
            exp: calcOne('exp', 0, expPriceKg, expChannelId),
        });
    }, [dimensions, priceConfig, channels]);

    return logCosts;
};
