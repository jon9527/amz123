import React, { useMemo } from 'react';

interface PromotionOrderBreakdownProps {
    price: number;
    targetVolume: number;
    tacos: number;
    // Lifted State
    simCpc: number;
    setSimCpc: (val: number) => void;
    simCtr: number;
    setSimCtr: (val: number) => void;
    simCvr: number;
    setSimCvr: (val: number) => void;
}

// Internal Stepper Component (Similar to AdsAnalysis but lightweight)
const Stepper = ({
    value,
    onChange,
    step = 1,
    min = 0,
    suffix = ''
}: {
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    suffix?: string;
}) => {
    const [strVal, setStrVal] = React.useState(value.toString());
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        const isFocused = document.activeElement === inputRef.current;
        if (isFocused) return;

        if (parseFloat(strVal) !== value) {
            setStrVal(value.toString());
        }
    }, [value]);

    const commit = (s: string) => {
        let n = parseFloat(s);
        if (isNaN(n)) n = min;
        if (n < min) n = min;
        onChange(n);
        setStrVal(n.toString());
    };

    const update = (delta: number) => {
        const current = parseFloat(strVal) || 0;
        // Handle float precision issues
        const next = Math.round((current + delta) * 100) / 100;
        const final = Math.max(min, next);
        onChange(final);
        setStrVal(final.toString());
    };

    return (
        <div className="relative group w-full h-10 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 rounded-lg flex items-center justify-center transition-all focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20">
            <input
                ref={inputRef}
                type="text"
                value={strVal}
                onChange={e => {
                    const val = e.target.value;
                    setStrVal(val);
                    // Real-time update if valid number (Fix "slow reaction")
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                        onChange(num);
                    }
                }}
                onBlur={() => {
                    // Commit formatting on blur
                    const n = parseFloat(strVal);
                    if (!isNaN(n)) {
                        setStrVal(n.toString());
                    } else {
                        // Revert to prop if invalid/empty
                        setStrVal(value.toString());
                    }
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        const n = parseFloat(strVal);
                        if (!isNaN(n)) setStrVal(n.toString());
                        (e.target as HTMLInputElement).blur();
                    }
                }}
                className="bg-transparent border-none outline-none text-center w-full h-full p-0 font-bold text-white text-sm"
            />
            <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={() => update(step)} className="h-1/2 px-1 text-zinc-500 hover:text-white flex items-center leading-none"><span className="material-symbols-outlined text-[14px]">expand_less</span></button>
                <button onClick={() => update(-step)} className="h-1/2 px-1 text-zinc-500 hover:text-white flex items-center leading-none"><span className="material-symbols-outlined text-[14px]">expand_more</span></button>
            </div>
        </div>
    );
};

const PromotionOrderBreakdown: React.FC<PromotionOrderBreakdownProps> = ({
    price,
    targetVolume,
    tacos,
    simCpc, setSimCpc,
    simCtr, setSimCtr,
    simCvr, setSimCvr
}) => {

    // Header Style Helper
    const CardHeader = ({ title, icon }: { title: string, icon: string }) => (
        <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-blue-500">{icon}</span>
            <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
    );

    // Calculations
    const calc = useMemo(() => {
        const totalSales = targetVolume * price;
        const allocatableBudget = totalSales * (tacos / 100);

        // Traffic Logic
        // Budget = Clicks * CPC => Clicks = Budget / CPC
        let clicks = 0, orders = 0, imp = 0, acos = 0;

        if (simCpc > 0 && allocatableBudget > 0) {
            clicks = allocatableBudget / simCpc;
            orders = clicks * (simCvr / 100);
            if (simCtr > 0) imp = clicks / (simCtr / 100);

            const adSales = orders * price;
            if (adSales > 0) acos = (allocatableBudget / adSales) * 100;
        }

        // Limit Ad Orders to Target Volume
        const displayAdOrders = orders; // We show what budget CAN buy
        const gapOrders = targetVolume - displayAdOrders;

        // Ratio
        let ratioText = "1 : -";
        if (displayAdOrders > 0 && gapOrders > 0) {
            const ratio = gapOrders / displayAdOrders;
            ratioText = `1 : ${ratio.toFixed(1)}`;
        } else if (displayAdOrders === 0 && gapOrders > 0) {
            ratioText = "0 : 1";
        }

        return {
            budget: allocatableBudget,
            clicks,
            orders,
            imp,
            acos,
            gapOrders,
            ratioText,
            isHealthy: gapOrders >= 0 // Simple health check
        };
    }, [price, targetVolume, tacos, simCpc, simCvr, simCtr]);

    return (
        <div className="bg-[#0c0c0e] border border-[#27272a] rounded-3xl overflow-hidden shadow-2xl p-6 h-full flex flex-col animate-in slide-in-from-bottom-6 duration-700">
            <div className='flex justify-between items-center border-b border-zinc-800 pb-4 mb-6'>
                <div className="flex items-center gap-3">
                    <span className="text-xl">🌊</span>
                    <h3 className="text-xl font-bold text-white tracking-tight">流量执行推演 (基于目标预算分配)</h3>
                </div>
                <div className='flex items-center gap-3'>
                    <span className='text-xs font-bold text-zinc-500 uppercase'>预算源:</span>
                    <div className='bg-blue-900/20 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-lg text-xs font-bold'>
                        Target Volume × Price × TACOS
                    </div>
                </div>
            </div>

            {/* Budget Display Row */}
            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 mb-6 flex items-center justify-between">
                <span className="text-zinc-400 font-bold text-sm">💰 可分配总预算:</span>
                <span className="text-2xl font-black text-orange-400 font-mono tracking-tight">
                    ${calc.budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>

            {/* Input & Data Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs table-fixed">
                    <colgroup>
                        <col className="w-[14.28%]" />
                        <col className="w-[14.28%]" />
                        <col className="w-[14.28%]" />
                        <col className="w-[14.28%]" />
                        <col className="w-[14.28%]" />
                        <col className="w-[14.28%]" />
                        <col className="w-[14.28%]" />
                    </colgroup>
                    <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500">
                            <th className="pb-2 text-center font-bold">模拟 CPC</th>
                            <th className="pb-2 text-center font-bold">模拟 CTR</th>
                            <th className="pb-2 text-center font-bold">模拟 CVR</th>
                            <th className="pb-2 text-center font-bold">点击量</th>
                            <th className="pb-2 text-center font-bold">曝光量</th>
                            <th className="pb-2 text-center font-bold">广告单量</th>
                            <th className="pb-2 text-center font-bold">ACOS</th>
                        </tr>
                    </thead>
                    <tbody className='text-white'>
                        <tr>
                            <td className="py-2 px-1">
                                <Stepper value={simCpc} onChange={setSimCpc} step={0.01} />
                            </td>
                            <td className="py-2 px-1">
                                <Stepper value={simCtr} onChange={setSimCtr} step={0.1} />
                            </td>
                            <td className="py-2 px-1">
                                <Stepper value={simCvr} onChange={setSimCvr} step={1} />
                            </td>
                            <td className="text-center font-bold font-mono text-zinc-300 py-2">{calc.clicks.toFixed(0)}</td>
                            <td className="text-center font-bold font-mono text-zinc-400 py-2">{calc.imp.toFixed(0)}</td>
                            <td className="py-2">
                                <div className="text-center font-black font-mono text-orange-400 text-base bg-orange-900/10 rounded border border-orange-500/20 py-1.5 mx-auto w-[90%]">
                                    {calc.orders.toFixed(1)}
                                </div>
                            </td>
                            <td className="text-center font-bold font-mono text-zinc-300 py-2">
                                {calc.acos.toFixed(1)}%
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Gap Analysis Bar */}
            <div className="grid grid-cols-2 gap-4 mt-8 bg-zinc-100/5 p-6 rounded-2xl border border-zinc-800 border-dashed">
                {/* Goal */}
                <div className="text-center border-r border-zinc-800 last:border-0">
                    <span className="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">🎯 总目标单量 (Goal)</span>
                    <div className="text-3xl font-black text-white font-mono">{targetVolume}</div>
                </div>

                {/* Ad Orders */}
                <div className="text-center border-r border-zinc-800 last:border-0">
                    <span className="block text-xs font-bold text-orange-500/80 mb-1 uppercase tracking-wider">📢 预算能买到的广告单</span>
                    <div className="text-3xl font-black text-orange-400 font-mono">{calc.orders.toFixed(1)}</div>
                </div>

                {/* Ratio */}
                <div className="text-center border-r border-zinc-800 last:border-0">
                    <span className="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">⚖️ 广告 : 自然</span>
                    <div className="text-3xl font-black text-zinc-400 font-mono">{calc.ratioText}</div>
                </div>

                {/* Gap */}
                <div className="text-center">
                    <span className="block text-xs font-bold text-emerald-500/80 mb-1 uppercase tracking-wider">🌱 需补足的自然单 (Gap)</span>
                    <div className={`text-3xl font-black font-mono ${calc.gapOrders >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {calc.gapOrders.toFixed(1)}
                    </div>
                </div>
            </div>

            <div className="mt-4 text-center">
                {calc.gapOrders < 0 ? (
                    <span className="text-red-400 text-xs font-bold bg-red-900/20 px-3 py-1 rounded-full border border-red-500/30">
                        🔥 警告: 当前预算带来的广告单量已超过总销售目标，请检查预算是否设置过高或目标过低。
                    </span>
                ) : (
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-500/30">
                        ✅ 模型健康: 自然/广告流量配比在合理区间。
                    </span>
                )}
            </div>
        </div>
    );
};

export default PromotionOrderBreakdown;
