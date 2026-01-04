import React, { useState, useMemo, useCallback } from 'react';

type TabId = 'bid' | 'size' | 'coupon' | 'discount' | 'compound';

// Move components outside to prevent re-creation on every render
const TabButton: React.FC<{
    id: TabId;
    icon: string;
    label: string;
    activeTab: TabId;
    onClick: (id: TabId) => void
}> = ({ id, icon, label, activeTab, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === id
            ? 'bg-blue-600 text-white shadow-lg'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
    >
        <span className="material-symbols-outlined text-lg">{icon}</span>
        {label}
    </button>
);

const Card: React.FC<{ icon: string; iconColor: string; title: string; children: React.ReactNode }> = ({
    icon, iconColor, title, children
}) => (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden min-h-[560px]">
        <div className="px-5 py-4 border-b border-[#27272a] flex items-center gap-3 bg-white/[0.02]">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${iconColor}`}>
                <span className="material-symbols-outlined text-lg">{icon}</span>
            </div>
            <span className="font-bold text-white">{title}</span>
        </div>
        <div>{children}</div>
    </div>
);

// Uncontrolled number input - use key to reset
const NumInput: React.FC<{
    defaultValue: number;
    onValueChange: (v: number) => void;
    className?: string;
    inputKey?: string;
    textSize?: string;
}> = ({ defaultValue, onValueChange, className = '', inputKey, textSize = 'text-sm' }) => {
    const [localValue, setLocalValue] = useState<string>(String(defaultValue));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setLocalValue(raw);

        // Parse and update parent
        let v = parseFloat(raw);
        if (isNaN(v) || v < 0) v = 0;
        onValueChange(v);
    };

    return (
        <input
            key={inputKey}
            type="number"
            min="0"
            value={localValue}
            onChange={handleChange}
            className={`bg-[#09090b] border border-[#27272a] rounded px-2 py-1.5 text-white font-mono ${textSize} focus:border-blue-500 focus:outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-auto [&::-webkit-inner-spin-button]:opacity-100 [&::-webkit-inner-spin-button]:cursor-pointer [&::-webkit-outer-spin-button]:appearance-auto ${className}`}
            style={{ colorScheme: 'dark' }}
        />
    );
};

const OperationsToolbox: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('bid');

    // --- Bid Calculator State ---
    const [forwardBids, setForwardBids] = useState([1.0, 1.0, 1.0]);
    const [forwardPcts, setForwardPcts] = useState([
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ]);
    const [reverseBids, setReverseBids] = useState([1.0, 1.0, 1.0]);
    const [reverseFinals, setReverseFinals] = useState([
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0],
        [2.0, 1.5, 1.5],
    ]);

    // --- Size Calculator State ---
    const [sizeDims, setSizeDims] = useState({ l: 0, w: 0, h: 0, weight: 0 });
    const [divisor, setDivisor] = useState(6000);

    // --- Coupon State ---
    const [couponSales, setCouponSales] = useState(0);

    // --- Discount State ---
    const [discPrice, setDiscPrice] = useState(29.99);
    const [discType, setDiscType] = useState<'pct' | 'amt'>('pct');
    const [discVal, setDiscVal] = useState(20);
    const [revOrigPrice, setRevOrigPrice] = useState(29.99);
    const [revTargetPrice, setRevTargetPrice] = useState(19.99);

    // --- Compound Calculator State ---
    const [compCapital, setCompCapital] = useState(100000);
    const [compMargin, setCompMargin] = useState(10);
    const [compDaysA, setCompDaysA] = useState(45);
    const [compDaysB, setCompDaysB] = useState(30);

    const upDownMults = [2.0, 1.5, 1.5];
    const pos = (v: number) => Math.max(0, v);

    // Calculate forward bid results
    const forwardResults = useMemo(() => {
        return forwardBids.map((bid, groupIdx) => {
            const b = pos(bid);
            const mults = groupIdx === 2 ? upDownMults : [1, 1, 1];
            return forwardPcts[groupIdx].map((pct, placeIdx) => {
                const p = pos(pct);
                return b * (1 + p / 100) * mults[placeIdx];
            });
        });
    }, [forwardBids, forwardPcts]);

    // Calculate reverse bid results
    const reverseResults = useMemo(() => {
        return reverseBids.map((bid, groupIdx) => {
            const b = pos(bid);
            const mults = groupIdx === 2 ? upDownMults : [1, 1, 1];
            return reverseFinals[groupIdx].map((final, placeIdx) => {
                const f = pos(final);
                if (b === 0) return { value: null, isLow: false };
                const neededPct = ((f / (b * mults[placeIdx])) - 1) * 100;
                const rounded = Math.round(neededPct);
                if (rounded < 0) {
                    return { value: 0, isLow: true };
                }
                return { value: rounded, isLow: false };
            });
        });
    }, [reverseBids, reverseFinals]);

    // Size calculations
    const sizeResults = useMemo(() => {
        const l = pos(sizeDims.l);
        const w = pos(sizeDims.w);
        const h = pos(sizeDims.h);
        const weight = pos(sizeDims.weight);
        const lIn = l / 2.54;
        const wIn = w / 2.54;
        const hIn = h / 2.54;
        const weightLb = weight * 2.20462;
        const volKg = (l * w * h) / divisor;
        const volLb = volKg * 2.20462;
        const chargeKg = Math.max(weight, volKg);
        const chargeLb = Math.max(weightLb, volLb);
        const isVol = volKg > weight;
        return { l, w, h, weight, lIn, wIn, hIn, weightLb, volKg, volLb, chargeKg, chargeLb, isVol };
    }, [sizeDims, divisor]);

    // Coupon calculations
    const couponResults = useMemo(() => {
        const sales = pos(couponSales);
        const fixedFee = 5.0;
        let variableFee = sales * 0.025;
        const capped = variableFee > 2000;
        if (capped) variableFee = 2000;
        const totalFee = fixedFee + variableFee;
        const feePct = sales > 0 ? (totalFee / sales) * 100 : 0;
        return { fixedFee, variableFee, totalFee, feePct, capped };
    }, [couponSales]);

    // Discount calculations
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
        const diff = Math.max(0, orig - target);
        const pct = (diff / orig) * 100;
        return { pct: Math.max(0, pct), amt: diff };
    }, [revOrigPrice, revTargetPrice]);

    // Compound interest calculation
    const compoundResults = useMemo(() => {
        const P = pos(compCapital);
        const r = pos(compMargin) / 100;
        const daysA = Math.max(1, compDaysA);
        const daysB = Math.max(1, compDaysB);

        const turnsA = 360 / daysA;
        const turnsB = 360 / daysB;

        const resultA = P * Math.pow(1 + r, turnsA);
        const resultB = P * Math.pow(1 + r, turnsB);
        const diff = resultB - resultA;

        return { turnsA, turnsB, resultA, resultB, diff };
    }, [compCapital, compMargin, compDaysA, compDaysB]);

    const strategyNames = ['固定竞价', '动态 - 只降低', '动态 - 提高&降低'];
    const strategyEngNames = ['Fixed Bids', 'Down Only', 'Up & Down'];
    const placeNames = ['首页顶部 (Top)', '商品页面 (PP)', '其余位置 (ROS)'];

    const handleTabClick = useCallback((id: TabId) => setActiveTab(id), []);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Tabs */}
            <div className="flex justify-center">
                <div className="inline-flex bg-[#18181b] p-1 rounded-xl border border-[#27272a] gap-1">
                    <TabButton id="bid" icon="payments" label="竞价计算" activeTab={activeTab} onClick={handleTabClick} />
                    <TabButton id="size" icon="deployed_code" label="尺寸重量" activeTab={activeTab} onClick={handleTabClick} />
                    <TabButton id="coupon" icon="local_activity" label="优惠券" activeTab={activeTab} onClick={handleTabClick} />
                    <TabButton id="discount" icon="percent" label="折扣计算" activeTab={activeTab} onClick={handleTabClick} />
                    <TabButton id="compound" icon="rocket_launch" label="资金复利" activeTab={activeTab} onClick={handleTabClick} />
                </div>
            </div>

            {/* Tab: Bid */}
            {activeTab === 'bid' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Forward Calculation */}
                    <Card icon="trending_up" iconColor="bg-gradient-to-br from-blue-500 to-blue-600" title="正向计算 (Bid + 百分比 = 最终出价)">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-black/20">
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '22%' }}>Bid ($)</th>
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '18%' }}>策略</th>
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '22%' }}>位置</th>
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '18%' }}>百分比</th>
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '20%' }}>最终 ($)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[0, 1, 2].map((groupIdx) => (
                                        <React.Fragment key={groupIdx}>
                                            {[0, 1, 2].map((placeIdx) => (
                                                <tr key={`${groupIdx}-${placeIdx}`} className={`${groupIdx === 2 ? 'bg-blue-500/5' : ''} ${placeIdx === 2 ? 'border-b-2 border-[#27272a]' : 'border-b border-[#27272a]'}`}>
                                                    {placeIdx === 0 && (
                                                        <>
                                                            <td rowSpan={3} className="px-4 py-2 border-r border-[#27272a] align-top">
                                                                <NumInput
                                                                    defaultValue={forwardBids[groupIdx]}
                                                                    onValueChange={(v) => {
                                                                        setForwardBids(prev => {
                                                                            const next = [...prev];
                                                                            next[groupIdx] = v;
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    className="w-full"
                                                                />
                                                            </td>
                                                            <td rowSpan={3} className="px-4 py-2 align-top">
                                                                <div className="font-bold text-white">{strategyNames[groupIdx]}</div>
                                                                <div className={`text-xs ${groupIdx === 2 ? 'text-orange-400' : 'text-zinc-500'}`}>
                                                                    {groupIdx === 2 ? 'Top x2 / Rest x1.5' : strategyEngNames[groupIdx]}
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="px-4 py-2 text-zinc-300 text-sm">{placeNames[placeIdx]}</td>
                                                    <td className="px-4 py-2">
                                                        <NumInput
                                                            defaultValue={forwardPcts[groupIdx][placeIdx]}
                                                            onValueChange={(v) => {
                                                                setForwardPcts(prev => {
                                                                    const next = prev.map(g => [...g]);
                                                                    next[groupIdx][placeIdx] = v;
                                                                    return next;
                                                                });
                                                            }}
                                                            className="w-20"
                                                        />
                                                    </td>
                                                    <td className={`px-4 py-2 font-mono font-bold ${groupIdx === 2 ? 'text-emerald-400' : 'text-white'}`}>
                                                        {forwardResults[groupIdx][placeIdx].toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Reverse Calculation */}
                    <Card icon="calculate" iconColor="bg-gradient-to-br from-purple-500 to-purple-600" title="反向推导 (Bid + 目标价 = 需要的百分比)">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-black/20">
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '22%' }}>Bid ($)</th>
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '18%' }}>策略</th>
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '22%' }}>位置</th>
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '18%' }}>建议 (%)</th>
                                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-3 py-2 border-b border-[#27272a]" style={{ width: '20%' }}>目标 ($)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[0, 1, 2].map((groupIdx) => (
                                        <React.Fragment key={groupIdx}>
                                            {[0, 1, 2].map((placeIdx) => (
                                                <tr key={`${groupIdx}-${placeIdx}`} className={`${groupIdx === 2 ? 'bg-purple-500/5' : ''} ${placeIdx === 2 ? 'border-b-2 border-[#27272a]' : 'border-b border-[#27272a]'}`}>
                                                    {placeIdx === 0 && (
                                                        <>
                                                            <td rowSpan={3} className="px-4 py-2 border-r border-[#27272a] align-top">
                                                                <NumInput
                                                                    defaultValue={reverseBids[groupIdx]}
                                                                    onValueChange={(v) => {
                                                                        setReverseBids(prev => {
                                                                            const next = [...prev];
                                                                            next[groupIdx] = v;
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    className="w-full"
                                                                />
                                                            </td>
                                                            <td rowSpan={3} className="px-4 py-2 align-top">
                                                                <div className="font-bold text-white">{strategyNames[groupIdx]}</div>
                                                                <div className={`text-xs ${groupIdx === 2 ? 'text-orange-400' : 'text-zinc-500'}`}>
                                                                    {groupIdx === 2 ? 'Top x2 / Rest x1.5' : strategyEngNames[groupIdx]}
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="px-4 py-2 text-zinc-300 text-sm">{placeNames[placeIdx]}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`font-mono font-bold ${reverseResults[groupIdx][placeIdx].isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {reverseResults[groupIdx][placeIdx].value !== null
                                                                ? `${reverseResults[groupIdx][placeIdx].value}%`
                                                                : '-'}
                                                        </span>
                                                        {reverseResults[groupIdx][placeIdx].isLow && (
                                                            <span className="text-red-400 text-xs ml-1">(低)</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <NumInput
                                                            defaultValue={reverseFinals[groupIdx][placeIdx]}
                                                            onValueChange={(v) => {
                                                                setReverseFinals(prev => {
                                                                    const next = prev.map(g => [...g]);
                                                                    next[groupIdx][placeIdx] = v;
                                                                    return next;
                                                                });
                                                            }}
                                                            className="w-20"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Tab: Size */}
            {activeTab === 'size' && (
                <Card icon="package_2" iconColor="bg-gradient-to-br from-purple-500 to-purple-600" title="尺寸 & 重量换算 (Metric ↔ Imperial)">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5 bg-black/10 border-b border-[#27272a]">
                        <div>
                            <label className="block text-xs text-zinc-500 font-bold mb-1.5">长 Length (cm)</label>
                            <NumInput defaultValue={sizeDims.l} onValueChange={(v) => setSizeDims(d => ({ ...d, l: v }))} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 font-bold mb-1.5">宽 Width (cm)</label>
                            <NumInput defaultValue={sizeDims.w} onValueChange={(v) => setSizeDims(d => ({ ...d, w: v }))} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 font-bold mb-1.5">高 Height (cm)</label>
                            <NumInput defaultValue={sizeDims.h} onValueChange={(v) => setSizeDims(d => ({ ...d, h: v }))} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 font-bold mb-1.5">实重 Weight (kg)</label>
                            <NumInput defaultValue={sizeDims.weight} onValueChange={(v) => setSizeDims(d => ({ ...d, weight: v }))} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 font-bold mb-1.5">材积系数 Divisor</label>
                            <select
                                value={divisor}
                                onChange={(e) => setDivisor(parseInt(e.target.value))}
                                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-white font-mono font-bold text-sm"
                            >
                                <option value={6000}>6000 (海运/一般)</option>
                                <option value={5000}>5000 (快递/空派)</option>
                            </select>
                        </div>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="bg-black/20">
                                <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]" style={{ width: '20%' }}>项目</th>
                                <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]" style={{ width: '30%' }}>公制 (Metric)</th>
                                <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]" style={{ width: '30%' }}>英制 (Imperial)</th>
                                <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]">说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-[#27272a]">
                                <td className="px-4 py-3 text-zinc-500 font-bold">📏 尺寸</td>
                                <td className="px-4 py-3 font-mono font-bold text-white">{sizeResults.l} x {sizeResults.w} x {sizeResults.h} <span className="text-zinc-500 text-xs">cm</span></td>
                                <td className="px-4 py-3 font-mono font-bold text-blue-400">{sizeResults.lIn.toFixed(2)} x {sizeResults.wIn.toFixed(2)} x {sizeResults.hIn.toFixed(2)} <span className="text-zinc-500 text-xs">in</span></td>
                                <td className="px-4 py-3 text-xs text-zinc-500">1 in = 2.54 cm</td>
                            </tr>
                            <tr className={`border-b border-[#27272a] ${!sizeResults.isVol ? 'font-bold' : ''}`}>
                                <td className="px-4 py-3 text-zinc-500 font-bold">⚖️ 实重</td>
                                <td className="px-4 py-3 font-mono font-bold text-white">{sizeResults.weight.toFixed(2)} <span className="text-zinc-500 text-xs">kg</span></td>
                                <td className="px-4 py-3 font-mono font-bold text-white">{sizeResults.weightLb.toFixed(2)} <span className="text-zinc-500 text-xs">lb</span></td>
                                <td className="px-4 py-3 text-xs text-zinc-500">1 kg = 2.2046 lb</td>
                            </tr>
                            <tr className={`border-b border-[#27272a] ${sizeResults.isVol ? 'font-bold' : ''}`}>
                                <td className="px-4 py-3 text-zinc-500 font-bold">🧊 体积重</td>
                                <td className="px-4 py-3 font-mono font-bold text-white">{sizeResults.volKg.toFixed(2)} <span className="text-zinc-500 text-xs">kg</span></td>
                                <td className="px-4 py-3 font-mono font-bold text-white">{sizeResults.volLb.toFixed(2)} <span className="text-zinc-500 text-xs">lb</span></td>
                                <td className="px-4 py-3 text-xs text-zinc-500">Divisor: {divisor}</td>
                            </tr>
                            <tr className="bg-emerald-500/5">
                                <td className="px-4 py-3 text-emerald-400 font-bold">💰 计费重</td>
                                <td className="px-4 py-3">
                                    <span className="font-mono font-black text-2xl text-emerald-400">{sizeResults.chargeKg.toFixed(2)}</span>
                                    <span className="text-zinc-500 text-xs ml-1">kg</span>
                                    {sizeResults.weight > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                            {sizeResults.isVol ? '抛货 (Vol)' : '实重 (Act)'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-mono font-black text-2xl text-emerald-400">{sizeResults.chargeLb.toFixed(2)}</span>
                                    <span className="text-zinc-500 text-xs ml-1">lb</span>
                                </td>
                                <td className="px-4 py-3 text-xs text-emerald-400">Max(实重, 体积重)</td>
                            </tr>
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Tab: Coupon */}
            {activeTab === 'coupon' && (
                <Card icon="confirmation_number" iconColor="bg-gradient-to-br from-orange-500 to-orange-600" title="优惠券费用计算 (2025新规)">
                    <div className="p-8 text-center bg-gradient-to-b from-[#18181b] to-orange-500/5 border-b border-[#27272a]">
                        <label className="block text-zinc-500 font-bold mb-3">优惠券带来的销售总额 ($)</label>
                        <NumInput
                            defaultValue={couponSales}
                            onValueChange={setCouponSales}
                            textSize="text-2xl"
                            className="w-full max-w-sm mx-auto text-center py-3 border-2 border-orange-500/30 rounded-xl font-bold"
                        />
                        <div className="text-xs text-zinc-500 mt-2">Coupon Redemption Sales</div>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="bg-black/20">
                                <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]" style={{ width: '30%' }}>费用类型</th>
                                <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]" style={{ width: '30%' }}>计算方式</th>
                                <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]">费用金额</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-[#27272a]">
                                <td className="px-4 py-3">📝 预付费用 (Fixed)</td>
                                <td className="px-4 py-3 text-zinc-500 text-sm">固定收费 $5.00</td>
                                <td className="px-4 py-3 font-mono font-bold text-white">5.00</td>
                            </tr>
                            <tr className="border-b border-[#27272a]">
                                <td className="px-4 py-3">📊 浮动费用 (Variable)</td>
                                <td className="px-4 py-3 text-zinc-500 text-sm">销售额 x 2.5% <span className="text-zinc-600">(Max $2,000)</span></td>
                                <td className="px-4 py-3">
                                    <span className="font-mono font-bold text-white">{couponResults.variableFee.toFixed(2)}</span>
                                    {couponResults.capped && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">MAX</span>
                                    )}
                                </td>
                            </tr>
                            <tr className="bg-orange-500/5">
                                <td className="px-4 py-3 text-orange-400 font-bold">💰 总费用 (Total)</td>
                                <td className="px-4 py-3 text-zinc-500 text-sm">预付 + 浮动</td>
                                <td className="px-4 py-3 text-2xl font-black text-orange-400">${couponResults.totalFee.toFixed(2)}</td>
                            </tr>
                            <tr className="border-t border-[#27272a]">
                                <td className="px-4 py-3">📉 综合费率占比</td>
                                <td colSpan={2} className="px-4 py-3 font-bold">
                                    {couponResults.feePct.toFixed(2)}%
                                    <span className="text-zinc-500 text-sm font-normal ml-2">(总费用 ÷ 销售额)</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="px-4 py-3 bg-black/20 text-zinc-500 text-sm">
                        <strong>规则说明:</strong> 每张优惠券收取 $5 预付固定费 + 销售额的 2.5% (上限 $2,000)。
                    </div>
                </Card>
            )}

            {/* Tab: Discount */}
            {activeTab === 'discount' && (
                <Card icon="sell" iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600" title="折扣/满减价格计算器">
                    <div className="grid md:grid-cols-2 gap-6 p-6">
                        {/* Forward */}
                        <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-5 flex flex-col">
                            <div className="text-sm font-bold text-zinc-500 uppercase border-b border-[#27272a] pb-3 mb-4">🧮 正向计算 (求折后价)</div>
                            <div className="mb-4">
                                <label className="block text-xs text-zinc-500 font-bold mb-1.5">商品原价 (Original Price)</label>
                                <NumInput defaultValue={discPrice} onValueChange={setDiscPrice} className="w-full" />
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
                                <NumInput key={discType} defaultValue={discVal} onValueChange={setDiscVal} className="w-full" />
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
                                <NumInput defaultValue={revOrigPrice} onValueChange={setRevOrigPrice} className="w-full" />
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs text-zinc-500 font-bold mb-1.5">目标折后价 (Target Price)</label>
                                <NumInput defaultValue={revTargetPrice} onValueChange={setRevTargetPrice} className="w-full" />
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
            )}

            {/* Tab: Compound Interest */}
            {activeTab === 'compound' && (
                <Card icon="rocket_launch" iconColor="bg-gradient-to-br from-purple-500 to-pink-500" title="资金复利效应计算器">
                    <div className="p-4 space-y-3">
                        {/* Inputs */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-zinc-900/50 rounded-lg p-3">
                                <label className="block text-xs text-zinc-400 font-bold mb-1">💰 投入本金 (¥)</label>
                                <NumInput defaultValue={compCapital} onValueChange={setCompCapital} textSize="text-lg" className="w-full py-2 font-bold text-center" />
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-3">
                                <label className="block text-xs text-zinc-400 font-bold mb-1">📈 单次利润率 (%)</label>
                                <NumInput defaultValue={compMargin} onValueChange={setCompMargin} textSize="text-lg" className="w-full py-2 font-bold text-center" />
                            </div>
                        </div>

                        {/* Scenario A */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-black text-blue-400">📊 方案 A (现状)</div>
                                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-1.5">
                                    <span className="text-zinc-400 text-sm font-bold">周转:</span>
                                    <NumInput defaultValue={compDaysA} onValueChange={setCompDaysA} className="w-16 text-center" />
                                    <span className="text-zinc-500 text-sm">天</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/20 rounded-lg p-2.5 text-center">
                                    <div className="text-zinc-500 text-xs mb-0.5">年周转次数</div>
                                    <div className="font-mono font-black text-2xl text-blue-400">{compoundResults.turnsA.toFixed(1)} <span className="text-sm text-zinc-400">轮</span></div>
                                </div>
                                <div className="bg-black/20 rounded-lg p-2.5 text-center">
                                    <div className="text-zinc-500 text-xs mb-0.5">1年后本利和</div>
                                    <div className="font-mono font-black text-2xl text-blue-300">¥{Math.round(compoundResults.resultA).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Scenario B */}
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-black text-emerald-400">🚀 方案 B (优化)</div>
                                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-1.5">
                                    <span className="text-zinc-400 text-sm font-bold">周转:</span>
                                    <NumInput defaultValue={compDaysB} onValueChange={setCompDaysB} className="w-16 text-center" />
                                    <span className="text-zinc-500 text-sm">天</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/20 rounded-lg p-2.5 text-center">
                                    <div className="text-zinc-500 text-xs mb-0.5">年周转次数</div>
                                    <div className="font-mono font-black text-2xl text-emerald-400">{compoundResults.turnsB.toFixed(1)} <span className="text-sm text-zinc-400">轮</span></div>
                                </div>
                                <div className="bg-black/20 rounded-lg p-2.5 text-center">
                                    <div className="text-zinc-500 text-xs mb-0.5">1年后本利和</div>
                                    <div className="font-mono font-black text-2xl text-emerald-300">¥{Math.round(compoundResults.resultB).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Difference */}
                        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                            <div className="text-zinc-300 text-sm font-bold mb-1">💎 复利增益对比</div>
                            <div className={`font-mono font-black text-3xl ${compoundResults.diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {compoundResults.diff >= 0 ? '+' : ''}¥{Math.round(compoundResults.diff).toLocaleString()}
                            </div>
                            <div className="text-zinc-500 text-xs mt-1">优化周转天数后，一年可多赚的金额</div>
                        </div>

                        {/* Explanation */}
                        <div className="text-xs text-zinc-400 bg-black/30 rounded-lg p-3 border border-zinc-800">
                            <strong className="text-zinc-300">📐 计算公式:</strong> 本利和 = 本金 × (1 + 利润率)<sup>周转次数</sup>，其中<span className="text-purple-400 font-bold">周转次数 = 360 ÷ 周转天数</span>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default OperationsToolbox;
