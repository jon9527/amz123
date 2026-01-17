import React, { useState, useMemo, useEffect } from 'react';

interface SensitivityMatrixProps {
    basePrice: number;
    baseCpc: number;
    baseCvr: number; // Percentage (e.g. 11 for 11%)
    fixedCost: number; // Cost excluding commission (Product + FBA + Log + Ret)
    commRate: number; // e.g. 0.15
    totalBudget: number; // NEW: Required for Total Profit Calc
    currencySymbol?: string;
}

type ViewMode = 'profit' | 'margin' | 'roi';

export const SensitivityMatrix: React.FC<SensitivityMatrixProps> = ({
    basePrice,
    baseCpc,
    baseCvr,
    fixedCost,
    commRate,
    totalBudget,
    currencySymbol = '$'
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('profit');
    const [simCvr, setSimCvr] = useState<number>(baseCvr);

    // Sync internal CVR with prop when prop changes (e.g. modified in Left Panel)
    useEffect(() => {
        setSimCvr(baseCvr);
    }, [baseCvr]);

    // Helper formatting
    const fmt = (n: number, type: 'currency' | 'pct' = 'currency') => {
        if (type === 'currency') return `${n < 0 ? '-' : ''}${currencySymbol}${Math.abs(n).toFixed(2)}`;
        return `${n.toFixed(1)}%`;
    };

    // Generate Matrix Data
    const matrix = useMemo(() => {
        // X-Axis: Price Steps (-2, -1, 0, +1, +2)
        const pSteps = [
            basePrice - 2.0,
            basePrice - 1.0,
            basePrice,
            basePrice + 1.0,
            basePrice + 2.0
        ];

        // Y-Axis: CPC Steps (+0.2, +0.1, 0, -0.1, -0.2) High to Low
        const cSteps = [
            baseCpc + 0.2,
            baseCpc + 0.1,
            baseCpc,
            baseCpc - 0.1,
            baseCpc - 0.2
        ];

        const rows = cSteps.map(c => {
            if (c < 0.01) return null; // Skip invalid CPC

            const cells = pSteps.map(p => {
                if (p <= 0) return { val: 0, color: 'bg-gray-100', text: 'text-gray-400', label: '-' };

                // Core Logic: Match Left Panel (Budget Limited Model)
                // 1. Clicks = Budget / CPC
                // 2. Orders = Clicks * CVR
                // 3. UnitGross = Price - UnitCost (Fixed + Comm)
                // 4. TotalGross = Orders * UnitGross
                // 5. TotalNet = TotalGross - Budget

                const clicks = c > 0 ? totalBudget / c : 0;
                const orders = clicks * (simCvr / 100);

                const unitCostWithComm = fixedCost + (p * commRate);
                const unitGross = p - unitCostWithComm;
                const totalGross = orders * unitGross;

                const net = totalGross - totalBudget;

                let val = 0;
                let label = '';
                let colorKey = 0; // Normalized score for coloring

                if (viewMode === 'profit') {
                    val = net;
                    label = fmt(val, 'currency');
                    colorKey = net;
                } else if (viewMode === 'margin') {
                    // Margin = Net / Revenue
                    const revenue = orders * p;
                    val = revenue > 0 ? (net / revenue) * 100 : -100;
                    label = fmt(val, 'pct');
                    colorKey = (val / 100) * p * 10; // Scale approx
                } else if (viewMode === 'roi') {
                    // ROI = Net / TotalInvestment(Budget + COGS) ???
                    // Left Panel usually defines ROI (or Gap) differently.
                    // Standard ROI = NetProfit / TotalCost
                    const totalCost = (orders * unitCostWithComm) + totalBudget;
                    val = totalCost > 0 ? (net / totalCost) * 100 : 0;
                    label = fmt(val, 'pct');
                    colorKey = val / 15; // Scale ROI (30% = 2.0)
                }

                // Color Logic (Matching Legacy)
                let bgClass = 'bg-slate-800';
                let textClass = 'text-white';

                if (colorKey >= 2.0) { // Deep Blue (Great)
                    bgClass = 'bg-[#0277bd]'; textClass = 'text-white';
                } else if (colorKey > 0) { // Light Blue (Good)
                    bgClass = 'bg-[#4fc3f7]'; textClass = 'text-black';
                } else if (Math.abs(colorKey) < 0.01) { // Break Even
                    bgClass = 'bg-[#e1f5fe]'; textClass = 'text-black';
                } else if (colorKey > -1.0) { // Small Loss
                    bgClass = 'bg-[#ffccbc]'; textClass = 'text-black';
                } else { // Big Loss
                    bgClass = 'bg-[#d84315]'; textClass = 'text-white';
                }

                return { val, label, bgClass, textClass, isCurrent: Math.abs(p - basePrice) < 0.01 && Math.abs(c - baseCpc) < 0.01 };
            });
            return { cpcLabel: fmt(c, 'currency'), cpcVal: c, cells };
        }).filter(Boolean);

        return { pSteps, rows };
    }, [basePrice, baseCpc, simCvr, fixedCost, commRate, totalBudget, viewMode]);

    return (
        <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-6 shadow-2xl relative overflow-hidden h-full flex flex-col">
            {/* Decorative Line */}


            {/* Header */}
            <div className="flex items-center justify-between mb-6 mt-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded-lg">
                        <span className="material-symbols-outlined text-blue-400 text-[20px]">grid_on</span>
                    </div>
                    <h3 className="font-black text-zinc-100 text-[15px] tracking-wide">
                        三维动态沙盘 <span className="text-zinc-500 font-normal ml-1">({viewMode === 'profit' ? '预估总净利 $' : viewMode === 'margin' ? '利润率 %' : 'ROI %'})</span>
                    </h3>
                </div>

                {/* Toggles */}
                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    {(['profit', 'margin', 'roi'] as ViewMode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => setViewMode(m)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === m ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {m === 'profit' ? '总净利 $' : m === 'margin' ? '利润率 %' : 'ROI %'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Slider Controls */}
            {/* FIX Applied: shrink-0 + w-[72px] value box to prevent flickering */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6 flex items-center gap-4 select-none">
                <div className="flex items-center gap-2 text-zinc-400 shrink-0">
                    <span className="material-symbols-outlined text-orange-500">local_fire_department</span>
                    <span className="text-[12px] font-bold">流量/排名变量 (CVR):</span>
                </div>

                <button
                    onClick={() => setSimCvr(Math.max(0, simCvr - 1))}
                    className="w-6 h-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 shrink-0"
                >-</button>

                <div className="flex-1 px-2 relative top-0.5">
                    <input
                        type="range"
                        min="1" max="50" step="0.5"
                        value={simCvr}
                        onChange={(e) => setSimCvr(parseFloat(e.target.value))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>

                <button
                    onClick={() => setSimCvr(simCvr + 1)}
                    className="w-6 h-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 shrink-0"
                >+</button>

                {/* Fixed Width Value Display */}
                <div className="w-[72px] flex justify-center font-mono font-black text-orange-500 border border-orange-500/20 bg-orange-500/5 py-1 rounded text-sm tabular-nums shrink-0">
                    {simCvr.toFixed(1)}%
                </div>

                <button
                    onClick={() => setSimCvr(baseCvr)}
                    className="text-[10px] font-bold text-zinc-500 hover:text-white underline ml-2 shrink-0"
                >
                    重置
                </button>
            </div>

            {/* Matrix Table */}
            {/* FIX Applied: table-fixed + w-[16%] cols to prevent flickering (Layout Thrashing) */}
            <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 relative bg-[#0c0c0e]">
                {/* Axis Label (Vertical - CSS Transform) */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 -rotate-90 text-[10px] font-bold text-zinc-600 tracking-widest whitespace-nowrap origin-center w-32 text-center pointer-events-none">
                    ⇦ CPC 竞价变化 ($)
                </div>

                {/* Axis Label (Horizontal) */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-zinc-600 tracking-widest pointer-events-none">
                    ➡ 销售价格变化 ($)
                </div>

                <table className="w-full h-full text-center border-collapse text-sm table-fixed">
                    <thead>
                        <tr>
                            <th className="bg-zinc-900/80 p-3 w-[16%] sticky top-0 left-0 z-20 border-b border-r border-zinc-800"></th>
                            {matrix.pSteps.map(p => {
                                const isBase = Math.abs(p - basePrice) < 0.01;
                                return (
                                    <th key={p} className={`p-3 w-[16.8%] font-mono font-bold sticky top-0 z-10 border-b border-zinc-800 ${isBase ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                                        {fmt(p, 'currency')}
                                        {isBase && <div className="text-[9px] font-normal leading-none text-zinc-500 mt-1">(当前)</div>}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.rows.map((row, i) => (
                            row && (
                                <tr key={i}>
                                    <th className={`p-3 font-mono font-bold sticky left-0 z-10 border-r border-zinc-800 ${Math.abs(row.cpcVal - baseCpc) < 0.01 ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
                                        {row.cpcLabel}
                                        {Math.abs(row.cpcVal - baseCpc) < 0.01 && <div className="text-[9px] font-normal leading-none text-zinc-500 mt-1">(当前)</div>}
                                    </th>
                                    {row.cells.map((cell, j) => (
                                        <td key={j} className={`${cell.bgClass} ${cell.textClass} font-bold font-mono tabular-nums border border-black/10 transition-colors cursor-default relative group`}>
                                            {cell.label}
                                            {cell.isCurrent && (
                                                <div className="absolute inset-0 border-2 border-white/50 animate-pulse pointer-events-none"></div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-[10px] font-bold text-zinc-500">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#0277bd]"></div> &gt; $2.00 / &gt; 30%</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#4fc3f7]"></div> 盈利 / 正ROI</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#e1f5fe]"></div> 保本</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#ffccbc]"></div> 微亏</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#d84315]"></div> 严重亏损</div>
            </div>

        </div>
    );
};
