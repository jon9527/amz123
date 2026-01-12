import React, { useState, useMemo } from 'react';
import { Card, NumericInput } from '../ui';

/**
 * 折扣/满减价格计算器
 */
const DiscountCalculator: React.FC = () => {
    const [discPrice, setDiscPrice] = useState(29.99);
    const [discType, setDiscType] = useState<'pct' | 'amt'>('pct');
    const [discVal, setDiscVal] = useState(20);
    const [revOrigPrice, setRevOrigPrice] = useState(29.99);
    const [revTargetPrice, setRevTargetPrice] = useState(19.99);

    const pos = (v: number) => Math.max(0, v);

    const discountForward = useMemo(() => {
        const price = pos(discPrice);
        const val = pos(discVal);
        let saveAmount = discType === 'pct' ? price * (val / 100) : val;
        let finalPrice = price - saveAmount;
        if (finalPrice < 0) finalPrice = 0;
        if (saveAmount > price) saveAmount = price;
        return { finalPrice, saveAmount };
    }, [discPrice, discType, discVal]);

    const discountReverse = useMemo(() => {
        const orig = pos(revOrigPrice);
        const target = pos(revTargetPrice);
        if (orig <= 0) return { pct: 0, amt: 0 };
        const amt = orig - target;
        const pct = (amt / orig) * 100;
        return { pct: Math.max(0, pct), amt: Math.max(0, amt) };
    }, [revOrigPrice, revTargetPrice]);

    return (
        <Card icon="sell" iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600" title="折扣/满减价格计算器">
            <div className="grid md:grid-cols-2 gap-6 p-6">
                {/* Forward */}
                <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex flex-col">
                    <div className="text-sm font-bold text-zinc-500 uppercase border-b border-[#27272a] pb-3 mb-4">🧮 正向计算 (求折后价)</div>
                    <div className="mb-4">
                        <label className="block text-xs text-zinc-500 font-bold mb-1.5">商品原价 (Original Price)</label>
                        <NumericInput defaultValue={discPrice} onChange={setDiscPrice} className="w-full" />
                    </div>
                    <div className="flex gap-4 mb-4">
                        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                            <input
                                type="radio"
                                name="discType"
                                checked={discType === 'pct'}
                                onChange={() => { setDiscType('pct'); setDiscVal(20); }}
                                className="accent-emerald-500"
                            />
                            百分比 (% Off)
                        </label>
                        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                            <input
                                type="radio"
                                name="discType"
                                checked={discType === 'amt'}
                                onChange={() => { setDiscType('amt'); setDiscVal(5); }}
                                className="accent-emerald-500"
                            />
                            满减金额 ($ Off)
                        </label>
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs text-zinc-500 font-bold mb-1.5">
                            {discType === 'pct' ? '折扣力度 (% Off)' : '满减金额 ($ Off)'}
                        </label>
                        <NumericInput key={discType} defaultValue={discVal} onChange={setDiscVal} className="w-full" />
                    </div>
                    <div className="flex-grow" />
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4 text-center">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Final Price</div>
                        <div className="text-3xl font-black text-blue-400 font-mono">${discountForward.finalPrice.toFixed(2)}</div>
                        <div className="text-emerald-400 text-sm mt-1">节省: ${discountForward.saveAmount.toFixed(2)}</div>
                    </div>
                </div>

                {/* Reverse */}
                <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex flex-col">
                    <div className="text-sm font-bold text-zinc-500 uppercase border-b border-[#27272a] pb-3 mb-4">🔄 反向推导 (求折扣率)</div>
                    <div className="mb-4">
                        <label className="block text-xs text-zinc-500 font-bold mb-1.5">商品原价 (Original Price)</label>
                        <NumericInput defaultValue={revOrigPrice} onChange={setRevOrigPrice} className="w-full" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs text-zinc-500 font-bold mb-1.5">目标折后价 (Target Price)</label>
                        <NumericInput defaultValue={revTargetPrice} onChange={setRevTargetPrice} className="w-full" />
                    </div>
                    <div className="flex-grow" />
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-4 text-center">
                        <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Equivalent Discount</div>
                        <div className="text-3xl font-black text-orange-400 font-mono">
                            {discountReverse.pct.toFixed(1)}% <span className="text-lg">OFF</span>
                        </div>
                        <div className="text-zinc-400 text-sm mt-1">优惠金额: ${discountReverse.amt.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default DiscountCalculator;
