import React, { useState, useMemo, useEffect } from 'react';
import { r2 } from '../utils/formatters';

interface AdvertisingAnalysisPanelProps {
    sellingPrice: number;
    productCost: number; // 包含: 采购+头程+FBA+杂费+仓储+退货损耗+佣金
    currencySymbol?: string;
    // Controlled State
    budget: number;
    onBudgetChange: (v: number) => void;
    cpc: number;
    onCpcChange: (v: number) => void;
    cvr: number;
    onCvrChange: (v: number) => void;
}



// Internal Stepper Component
const Stepper = ({
    label,
    value,
    onChange,
    step = 1,
    prefix = '',
    suffix = '',
    min = 0
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    prefix?: string;
    suffix?: string;
    min?: number;
}) => {
    const [strVal, setStrVal] = useState(value.toString());
    const inputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
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
        const next = Math.max(min, r2(current + delta));
        onChange(next);
        setStrVal(next.toString());
    };

    return (
        <div className="flex flex-col gap-2 group">
            <div className="text-center font-black text-zinc-500 text-[13px] uppercase tracking-wide group-hover:text-zinc-400 transition-colors">
                {label}
            </div>
            <div className="relative h-12 bg-[#18181b] rounded-xl border border-zinc-800 flex items-center justify-center transition-all hover:border-zinc-700 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10">
                <div className="flex items-center gap-1 text-white font-mono text-xl font-bold">
                    {prefix && <span className="text-zinc-600 text-sm mb-1">{prefix}</span>}
                    <input
                        ref={inputRef}
                        type="text"
                        value={strVal}
                        onChange={e => setStrVal(e.target.value)}
                        onBlur={() => {
                            const n = parseFloat(strVal);
                            if (!isNaN(n)) {
                                commit(strVal); // commit handles setStrVal
                            } else {
                                setStrVal(value.toString()); // Revert
                            }
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') commit(strVal); }}
                        className="bg-transparent border-none outline-none text-center w-24 p-0 placeholder-zinc-700 font-bold"
                    />
                    {suffix && <span className="text-zinc-600 text-sm mb-1">{suffix}</span>}
                </div>
                <div className="absolute right-1 top-1 bottom-1 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => update(step)} className="h-1/2 px-1 text-zinc-600 hover:text-white flex items-center"><span className="material-symbols-outlined text-[16px]">expand_less</span></button>
                    <button onClick={() => update(-step)} className="h-1/2 px-1 text-zinc-600 hover:text-white flex items-center"><span className="material-symbols-outlined text-[16px]">expand_more</span></button>
                </div>
            </div>
        </div>
    );
};

export const AdvertisingAnalysisPanel: React.FC<AdvertisingAnalysisPanelProps> = ({
    sellingPrice,
    productCost,
    currencySymbol = '$',
    budget,
    onBudgetChange,
    cpc,
    onCpcChange,
    cvr,
    onCvrChange
}) => {

    const analysis = useMemo(() => {
        const grossProfitPerUnit = sellingPrice - productCost;
        const clicks = cpc > 0 ? budget / cpc : 0;
        const orders = clicks * (cvr / 100);
        const totalSales = orders * sellingPrice;
        const totalProductCost = orders * productCost;
        const acos = totalSales > 0 ? (budget / totalSales) : 0;
        const totalGrossProfit = orders * grossProfitPerUnit;
        const netProfit = totalGrossProfit - budget;
        const beCpc = grossProfitPerUnit * (cvr / 100);

        return { grossProfitPerUnit, clicks, orders, totalSales, totalProductCost, acos, netProfit, beCpc };
    }, [sellingPrice, productCost, budget, cpc, cvr]);

    const fmt = (n: number, type: 'currency' | 'pct' | 'int' | 'float' = 'float') => {
        if (type === 'currency') return `${currencySymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (type === 'pct') return `${(n * 100).toFixed(2)}%`;
        if (type === 'int') return Math.round(n).toLocaleString();
        return n.toFixed(1);
    };

    // Reusable Row Component for Data List
    const DataRow = ({ label, value, colorDot }: { label: string, value: string, colorDot: string }) => (
        <div className="bg-[#0c0c0e] px-5 py-3.5 flex justify-between items-center group hover:bg-[#121215] transition-colors border-b border-zinc-900/50 last:border-0 relative">
            <div className="flex items-center gap-4">
                {/* Dot aligned with text */}
                <div className={`w-2 h-2 rounded-full ${colorDot} shadow-sm shrink-0`}></div>
                <span className="text-[14px] font-bold text-zinc-500 group-hover:text-zinc-400 transition-colors tracking-wide">{label}</span>
            </div>
            <span className="font-mono font-black text-zinc-300 text-[16px] tracking-tight">{value}</span>
        </div>
    );

    return (
        <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-600 opacity-80"></div>

            <div className="flex items-center justify-between mb-8 mt-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded-lg"><span className="material-symbols-outlined text-purple-400 text-[20px]">ads_click</span></div>
                    <span className="font-black text-zinc-100 text-[15px] tracking-wide">投放模拟器</span>
                </div>
            </div>

            {/* Inputs - Controlled */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                <Stepper label="总预算 $" value={budget} onChange={onBudgetChange} step={10} />
                <Stepper label="平均 CPC $" value={cpc} onChange={onCpcChange} step={0.1} />
                <Stepper label="预估转化 %" value={cvr} onChange={onCvrChange} step={1} />
            </div>

            {/* Data List: Tighter Font/Spacing */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden mb-8">
                <DataRow label="客单价 (PRICE)" value={fmt(sellingPrice, 'currency')} colorDot="bg-zinc-600" />
                <DataRow label="单品成本 (COST)" value={fmt(productCost, 'currency')} colorDot="bg-orange-500" />
                <DataRow label="广告前毛利" value={fmt(analysis.grossProfitPerUnit, 'currency')} colorDot="bg-blue-500" />

                <div className="h-px bg-zinc-800 w-full my-0"></div>

                <DataRow label="点击量 (Clicks)" value={fmt(analysis.clicks, 'int')} colorDot="bg-zinc-700" />
                <DataRow label="订单量 (Orders)" value={fmt(analysis.orders, 'float')} colorDot="bg-zinc-700" />
                <DataRow label="广告销售额" value={fmt(analysis.totalSales, 'currency')} colorDot="bg-zinc-700" />
                <DataRow label="广告总成本" value={fmt(analysis.totalProductCost, 'currency')} colorDot="bg-zinc-700" />
            </div>

            {/* 3 Unified Cards - Removed px-1 */}
            {/* Use px-5 inside cards to match DataRows for dot alignment */}
            <div className="space-y-3">
                {/* 1. BE CPC */}
                <div className="w-full h-[64px] bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-center justify-between px-5 transition-all hover:bg-rose-500/10">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] shrink-0"></div>
                        <span className="text-[13px] font-black text-rose-500 uppercase tracking-wide">盈亏平衡 CPC</span>
                    </div>
                    <span className="font-black text-rose-500 font-mono text-[22px]">{fmt(analysis.beCpc, 'currency')}</span>
                </div>

                {/* 2. ACOS (Now a Card) */}
                <div className="w-full h-[64px] bg-zinc-800/20 border border-zinc-800 rounded-xl flex items-center justify-between px-5 transition-all hover:bg-zinc-800/40">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-zinc-400 shrink-0"></div>
                        <span className="text-[13px] font-black text-zinc-400 uppercase tracking-wide">预估 ACOS</span>
                    </div>
                    <span className="font-black text-zinc-300 font-mono text-[22px]">{fmt(analysis.acos, 'pct')}</span>
                </div>

                {/* 3. Net Profit */}
                <div className="w-full h-[64px] bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between px-5 relative overflow-hidden transition-all hover:bg-emerald-500/15">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse shrink-0"></div>
                        <span className="text-[13px] font-black text-emerald-500 uppercase tracking-wide">预估日净利润</span>
                    </div>
                    <span className="font-black text-emerald-400 font-mono text-[22px] relative z-10 drop-shadow-sm">{fmt(analysis.netProfit, 'currency')}</span>
                </div>
            </div>
        </div>
    );
};
