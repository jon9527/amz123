import React, { useState, useEffect, useMemo } from 'react';
import { ProfitModelService } from '../services/profitModelService';
import { SavedProfitModel } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import PromotionOrderBreakdown from '../components/PromotionOrderBreakdown';
import PromotionStrategyPanel from '../components/PromotionStrategyPanel';

// Helper for rounding
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmtUSD = (num: number) => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Custom Stepper Input for Volume (Integer only, no leading zeros)
const VolumeStepper = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => {
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            onChange(0);
            return;
        }
        // Remove leading zeros
        const cleanVal = val.replace(/^0+/, '');
        const num = parseInt(cleanVal);
        if (!isNaN(num)) {
            onChange(num);
        }
    };

    const inc = () => onChange(Math.floor(value + 10)); // Step 10 for volume
    const dec = () => onChange(Math.max(0, Math.floor(value - 10)));

    return (
        <div className="relative group w-24">
            <input
                type="text"
                value={value}
                onChange={handleInput}
                className="bg-transparent border-none outline-none text-white font-mono font-bold w-full text-right text-lg pr-4"
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={inc}
                    className="text-zinc-500 hover:text-white leading-none material-symbols-outlined text-sm scale-75"
                >
                    expand_less
                </button>
                <button
                    onClick={dec}
                    className="text-zinc-500 hover:text-white leading-none material-symbols-outlined text-sm scale-75"
                >
                    expand_more
                </button>
            </div>
        </div>
    );
};

const PromotionAnalysis: React.FC = () => {
    // State
    const [savedModels, setSavedModels] = useState<SavedProfitModel[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>('');

    // Inputs (Internal State only, UI removed for per-unit)
    const [simPrice, setSimPrice] = useState<number>(0);
    const [simTacos, setSimTacos] = useState<number>(15.0); // Default 15%

    // Volume Input
    const [targetVolume, setTargetVolume] = useState<number>(100);

    // Strategy Inputs (Lifted State for Breakdown & Charts)
    const [simCpc, setSimCpc] = useState<number>(0.90);
    const [simCtr, setSimCtr] = useState<number>(0.5);
    const [simCvr, setSimCvr] = useState<number>(11);

    // Load Models
    useEffect(() => {
        const models = ProfitModelService.getAll().sort((a, b) => b.timestamp - a.timestamp);
        setSavedModels(models);
        if (models.length > 0) {
            setSelectedModelId(models[0].id);
            // Default to Saved Price (Plan B)
            setSimPrice(models[0].results.planB.price);
        }
    }, []);

    // Effect: Auto-sim BEP CPC when model/price changes (Only initially or explicit reset, theoretically. 
    // But user wants default to be BEP. We'll set it when 'calc' is ready if simCpc is untouched? 
    // Better: Set it when model loads/changes using a separate effect or inside handleModelChange)

    // We need to calculate BEP based on loaded model to set initial simCpc
    // Since 'calc' depends on simCpc (for loop? no, calc depends on simPrice/Tacos), we can use a second Effect.
    // BUT 'calc' is complex. Let's do a simplified BEP calc just for initialization to avoid circular deps if possible.
    // Actually 'calc' does NOT depend on 'simCpc' for the unit cost part (except AdSpend which is Price*TACOS).
    // So we can use 'calc' to update 'simCpc' IF we are careful to avoid loops.
    // Ideally, we just update simCpc when selectedModelId changes.

    useEffect(() => {
        if (calc?.unit?.breakEvenCpc) {
            // Only set if we just loaded (e.g. tracking a "loaded" state or just allow overwrite on model switch)
            // For now, let's set it when model changes.
        }
    }, [selectedModelId]); // This is tricky because calc depends on state.

    // Better approach: Calculate BEP inside handleModelChange logic? 
    // Hard because fees are complex.
    // Let's use an effect that listens to [selectedModelId, simPrice, simCvr] but guards against user input?
    // User said: "Default fill into Break-even CPC". 
    // Let's just set it once when the calc is ready and it's 0.9 (default).

    useEffect(() => {
        if (calc && calc.unit.breakEvenCpc > 0) {
            // We verify if it is the "first run" or "model switch"
            // For simplicity, let's sync it. But user wants to CHANGE it.
            // So only sync if the user hasn't touched it? Or just on mount/model change.
            // Let's rely on handleModelChange to trigger a flag, and this effect consumes it.
            // For now, let's just do it on mount/model change by checking if simCpc is default 0.9 or we force it.
            setSimCpc(parseFloat(calc.unit.breakEvenCpc.toFixed(2)));
        }
    }, [selectedModelId]); // Remove simCvr/simPrice to avoid loop/overwriting user input during tweaking
    // Note: If user changes CVR, CPC updates. exact match to "From Ad Simulation".



    // Handle Model Change
    const handleModelChange = (id: string) => {
        setSelectedModelId(id);
        const model = savedModels.find(m => m.id === id);
        if (model) {
            setSimPrice(model.results.planB.price);
        }
    };

    // Calculations
    const calc = useMemo(() => {
        const model = savedModels.find(m => m.id === selectedModelId);
        if (!model) return null;

        // Extract Raw Inputs instead of Results (which lack breakdowns in planB object)
        const inputs = model.inputs;
        const pb = model.results.planB; // We still use this for Comm Rate if auto

        // 1. Sales
        const totalSales = simPrice;

        // 2. Purchase (Fixed)
        // Use pre-calculated USD cost from results if available, otherwise calc from inputs
        const purchaseCost = model.results.costProdUSD;

        // 3. Logistics (Ship + Misc + Storage)
        const logisticsBase = inputs.shippingUSD + inputs.miscFee;
        const storageFee = inputs.storageFee || 0;

        // 4. FBA (Fixed)
        const fbaFee = inputs.fbaFee;

        // 5. Commission (Dynamic)
        // Use saved rate or default 15%
        const commRate = pb.commRate || 0.15;
        const commission = simPrice * commRate;

        // 6. Returns (Dynamic & Precise)
        const retRate = inputs.returnRate ?? 5; // e.g. 5 for 5%
        const unsellRate = inputs.unsellableRate ?? 0; // e.g. 20 for 20%
        const retProcFee = inputs.retProcFee ?? 0;
        const retRemFee = inputs.retRemFee ?? 0;

        // Admin Fee (20% of Comm, capped at $5)
        const adminFee = Math.min(5.00, commission * 0.20);

        // Loss if Sellable (Customer returns, we just pay fees)
        const lossSellable = retProcFee + adminFee + fbaFee;

        // Loss if Unsellable (We lost the item + fees + removal fee)
        const lossUnsellable = lossSellable + purchaseCost + logisticsBase + storageFee + retRemFee;

        // Weighted Average Return Cost
        const returnsCost = ((lossSellable * (1 - unsellRate / 100)) + (lossUnsellable * (unsellRate / 100))) * (retRate / 100);

        // 7. Ad Spend (TACOS)
        const adSpend = totalSales * (simTacos / 100);

        // 8. Total Cost
        const totalCost = purchaseCost + logisticsBase + storageFee + fbaFee + returnsCost + commission + adSpend;

        // 9. Net Profit
        const netProfit = totalSales - totalCost;
        const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

        // *** Volume Calcs ***
        const vol = targetVolume;
        const vTotalSales = totalSales * vol;
        const vPurchase = purchaseCost * vol;
        const vLogisticsBase = logisticsBase * vol;
        const vStorage = storageFee * vol;
        const vFBA = fbaFee * vol;
        const vCommission = commission * vol;
        const vReturns = returnsCost * vol;
        const vAds = adSpend * vol;
        const vProfit = netProfit * vol;
        const vTotalCost = totalCost * vol;

        // *** Waterfall Data Preparation (Consistent with ProfitCalculator.tsx) ***
        const p1 = vTotalSales;
        const p2 = r2(p1 - vPurchase);
        const p3 = r2(p2 - vLogisticsBase);
        const p4 = r2(p3 - vStorage);
        const p5 = r2(p4 - vFBA);
        const p6 = r2(p5 - vCommission);
        const p7 = r2(p6 - vReturns);
        const p8 = r2(p7 - vAds);

        // Matches ProfitCalculator colors and structure exactly
        const waterfallData = [
            { name: '销售总额', val: vTotalSales, range: [0, p1], color: '#334155' },
            { name: '采购成本', val: -vPurchase, range: [p2, p1], color: '#3b82f6' },
            { name: '物流杂费', val: -vLogisticsBase, range: [p3, p2], color: '#a855f7' },
            { name: '月仓储费', val: -vStorage, range: [p4, p3], color: '#6366f1' },
            { name: 'FBA 配送', val: -vFBA, range: [p5, p4], color: '#71717a' },
            { name: '销售佣金', val: -vCommission, range: [p6, p5], color: '#f59e0b' },
            { name: '退货损耗', val: -vReturns, range: [p7, p6], color: '#ef4444' },
            { name: '广告成本', val: -vAds, range: [p8, p7], color: '#eab308' },
            { name: '净利润', val: vProfit, range: [0, vProfit], color: '#22c55e' }
        ];

        return {
            unit: {
                totalSales,
                purchaseCost,
                logisticsBase,
                storageFee,
                fbaFee,
                returnsCost,
                commission,
                adSpend,
                totalCost,
                netProfit,
                netMargin,
                baseCostPerUnit: purchaseCost + logisticsBase + storageFee + fbaFee + returnsCost, // EXCLUDE commission (matches HTML fixedCost logic: Product+Log+Storage+FBA+Returns)
                commissionRate: commRate, // NEW: pass commission rate separately
                breakEvenCpc: (totalSales - (totalCost - adSpend)) * (simCvr / 100)
            },
            volume: {
                totalSales: vTotalSales,
                purchaseCost: vPurchase,
                logisticsBase: vLogisticsBase,
                storageFee: vStorage,
                fbaFee: vFBA,
                returnsCost: vReturns,
                commission: vCommission,
                adSpend: vAds,
                totalCost: vTotalCost,
                netProfit: vProfit,
                netMargin
            },
            waterfallData
        };
    }, [selectedModelId, savedModels, simPrice, simTacos, targetVolume, simCvr]);

    // Guard: If no calc data (no saved models), show empty state
    if (!calc) {
        return (
            <div className="p-8 text-center">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 max-w-md mx-auto">
                    <span className="material-symbols-outlined text-zinc-600 text-6xl mb-4">info</span>
                    <h3 className="text-xl font-bold text-zinc-400 mb-2">暂无数据</h3>
                    <p className="text-sm text-zinc-500">请先在「利润计算器」中创建并保存一个模型。</p>
                </div>
            </div>
        );
    }

    // Card Component
    const CostCard = ({
        label,
        value,
        subValue,
        color,
        exchangeRate,
        isBold = false
    }: any) => {
        const colorStyles: any = {
            slate: 'border-slate-800 bg-slate-900/50 text-slate-400',
            blue: 'border-blue-900/50 bg-blue-900/20 text-blue-400',
            orange: 'border-orange-900/50 bg-orange-900/20 text-orange-400',
            purple: 'border-purple-900/50 bg-purple-900/20 text-purple-400',
            indigo: 'border-indigo-900/50 bg-indigo-900/20 text-indigo-400',
            emerald: 'border-emerald-900/50 bg-emerald-900/20 text-emerald-400',
            rose: 'border-rose-900/50 bg-rose-900/20 text-rose-400',
            yellow: 'border-yellow-900/50 bg-yellow-900/20 text-yellow-400',
            zinc: 'border-zinc-800 bg-zinc-900/50 text-zinc-400'
        };
        const style = colorStyles[color] || colorStyles.slate;

        return (
            <div className={`p-4 rounded-xl border ${style} flex flex-col justify-between h-[130px] min-w-0 flex-1 items-center`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1 ${isBold ? 'text-white' : ''}`}>
                    {label}
                </span>
                <div className="text-center w-full">
                    <div className={`text-2xl font-black tracking-tight font-mono flex justify-center ${isBold ? 'text-emerald-400' : 'text-white'}`}>
                        {typeof value === 'number' && !isNaN(value) ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                    </div>
                    {typeof value === 'number' && !isNaN(value) && exchangeRate && (
                        <div className="text-[13px] font-bold opacity-60 font-mono text-zinc-400 mt-0.5">
                            ¥{(value * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    )}
                    {subValue && (
                        <div className="text-[11px] font-bold opacity-60 mt-2 font-mono border-t border-white/10 pt-1 w-full flex justify-center">
                            {subValue}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-8 space-y-12 max-w-[1800px] mx-auto animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-black tracking-tight text-white">盈亏沙盘</h2>
                    <p className="text-zinc-500 text-sm">Profit Analysis Sandbox & Budget Simulation</p>
                </div>

                {/* Data Source Selector */}
                <div className="flex items-center gap-3 bg-[#0c0c0e] border border-zinc-800 rounded-xl px-4 py-2 shadow-lg">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">数据源:</span>
                    <div className="relative group">
                        <select
                            value={selectedModelId}
                            onChange={(e) => handleModelChange(e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-zinc-200 outline-none focus:border-blue-500 min-w-[240px] appearance-none cursor-pointer hover:border-zinc-500 transition-colors font-mono"
                        >
                            {savedModels.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.productName} ({new Date(m.timestamp).toLocaleDateString()}) - ${m.results.planB.price}
                                </option>
                            ))}
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none material-symbols-outlined text-[16px]">expand_more</span>
                    </div>
                </div>
            </div>

            {/* Calculations Breakdown */}
            {calc && (
                <>
                    {/* SECTION 1: Single Unit */}
                    <div className='space-y-4'>
                        <div className="px-1 flex items-center justify-between">
                            <span className="text-lg font-bold text-blue-400 uppercase tracking-wider bg-blue-900/10 border border-blue-500/20 px-3 py-3 rounded-lg w-56 text-center">
                                单品利润模型
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-9 gap-4 w-full">
                            <CostCard label="① 总销售额" value={calc.unit.totalSales} subValue={'100%'} color="slate" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="② 采购成本" value={calc.unit.purchaseCost} subValue={`${((calc.unit.purchaseCost / calc.unit.totalSales) * 100).toFixed(1)}%`} color="blue" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="③ 物流杂费" value={calc.unit.logisticsBase} subValue={`${((calc.unit.logisticsBase / calc.unit.totalSales) * 100).toFixed(1)}%`} color="purple" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="④ 月仓储费" value={calc.unit.storageFee} subValue={`${((calc.unit.storageFee / calc.unit.totalSales) * 100).toFixed(1)}%`} color="indigo" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="⑤ FBA配送" value={calc.unit.fbaFee} subValue={`${((calc.unit.fbaFee / calc.unit.totalSales) * 100).toFixed(1)}%`} color="zinc" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="⑥ 平台佣金" value={calc.unit.commission} subValue={`${((calc.unit.commission / calc.unit.totalSales) * 100).toFixed(1)}%`} color="orange" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="⑦ 退货损耗" value={calc.unit.returnsCost} subValue={`${((calc.unit.returnsCost / calc.unit.totalSales) * 100).toFixed(1)}%`} color="rose" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="⑧ 广告花费" value={calc.unit.adSpend} subValue={`${simTacos.toFixed(1)}%`} color="yellow" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />

                            {/* Profit as 9th Card */}
                            <div className={`p-4 rounded-xl border flex flex-col justify-between h-[130px] min-w-0 flex-1 items-center ${calc.unit.netProfit >= 0 ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${calc.unit.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ⑨ 净利润
                                </span>
                                <div className="text-center w-full">
                                    <div className={`text-2xl font-black tracking-tight font-mono ${calc.unit.netProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                        ${calc.unit.netProfit.toFixed(2)}
                                    </div>
                                    {savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate && (
                                        <div className={`text-[13px] font-bold mt-0.5 font-mono opacity-80 ${calc.unit.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            ¥{(calc.unit.netProfit * savedModels.find(m => m.id === selectedModelId)!.inputs.exchangeRate).toFixed(2)}
                                        </div>
                                    )}
                                    <div className={`text-[11px] font-bold mt-2 font-mono border-t border-white/10 pt-1 w-full flex justify-center ${calc.unit.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {calc.unit.netMargin.toFixed(1)}% Margin
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Volume Analysis */}
                    <div className='space-y-4'>
                        <div className="px-1 flex items-center justify-between">
                            <span className="text-lg font-bold text-orange-400 uppercase tracking-wider bg-orange-900/10 border border-orange-500/20 px-3 py-3 rounded-lg w-56 text-center">
                                销量模拟
                            </span>
                            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
                                <span className="text-sm text-zinc-400 font-bold uppercase">目标销量:</span>

                                <VolumeStepper value={targetVolume} onChange={setTargetVolume} />

                                <span className="text-xs text-zinc-600 font-bold">Units</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-9 gap-4 w-full opacity-90">
                            <CostCard label="① 总销售额" value={calc.volume.totalSales} subValue={'100%'} color="slate" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="② 采购成本" value={calc.volume.purchaseCost} subValue={`${((calc.volume.purchaseCost / calc.volume.totalSales) * 100).toFixed(1)}%`} color="blue" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="③ 物流杂费" value={calc.volume.logisticsBase} subValue={`${((calc.volume.logisticsBase / calc.volume.totalSales) * 100).toFixed(1)}%`} color="purple" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="④ 月仓储费" value={calc.volume.storageFee} subValue={`${((calc.volume.storageFee / calc.volume.totalSales) * 100).toFixed(1)}%`} color="indigo" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="⑤ FBA配送" value={calc.volume.fbaFee} subValue={`${((calc.volume.fbaFee / calc.volume.totalSales) * 100).toFixed(1)}%`} color="zinc" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="⑥ 平台佣金" value={calc.volume.commission} subValue={`${((calc.volume.commission / calc.volume.totalSales) * 100).toFixed(1)}%`} color="orange" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="⑦ 退货损耗" value={calc.volume.returnsCost} subValue={`${((calc.volume.returnsCost / calc.volume.totalSales) * 100).toFixed(1)}%`} color="rose" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />
                            <CostCard label="⑧ 广告花费" value={calc.volume.adSpend} subValue={`${simTacos.toFixed(1)}%`} color="yellow" exchangeRate={savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate} />

                            <div className={`p-4 rounded-xl border flex flex-col justify-between h-[130px] min-w-0 flex-1 items-center ${calc.volume.netProfit >= 0 ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                                <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${calc.volume.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ⑨ 净利润
                                </span>
                                <div className="text-center w-full">
                                    <div className={`text-2xl font-black tracking-tight font-mono ${calc.volume.netProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                        ${calc.volume.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    {savedModels.find(m => m.id === selectedModelId)?.inputs.exchangeRate && (
                                        <div className={`text-[13px] font-bold mt-0.5 font-mono opacity-80 ${calc.volume.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            ¥{(calc.volume.netProfit * savedModels.find(m => m.id === selectedModelId)!.inputs.exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    )}
                                    <div className={`text-[11px] font-bold mt-2 font-mono border-t border-white/10 pt-1 w-full flex justify-center ${calc.volume.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {calc.volume.netMargin.toFixed(1)}% Margin
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PROFIT WATERFALL (Consistent with ProfitCalculator) */}
                    <div className="bg-[#0c0c0e] border border-[#27272a] rounded-3xl overflow-hidden shadow-2xl flex flex-col w-full animate-in slide-in-from-bottom-4 duration-700 mt-4">
                        <div className="p-8 border-b border-zinc-900 bg-[#111111]/50 flex justify-between items-center">
                            <div className="flex items-center gap-5">
                                <div className="bg-zinc-900 size-14 rounded-2xl flex items-center justify-center border border-zinc-800 shadow-inner">
                                    <span className="material-symbols-outlined text-blue-500 text-4xl">waterfall_chart</span>
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-black text-white tracking-tighter leading-none">目标单量利润瀑布</h3>
                                    {/* Subtitle removed per user request for cleaner look */}
                                </div>
                            </div>
                        </div>

                        <div className="w-full p-10 md:p-16 bg-[#0d0d0f]">
                            <div className="h-[450px] w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={calc.waterfallData} margin={{ top: 20, right: 30, left: 30, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e21" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 13, fontWeight: 900, letterSpacing: '0.05em' }} dy={20} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 12, fontWeight: 600 }} tickFormatter={(v) => `$${v}`} domain={[0, 'auto']} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} animationDuration={0} isAnimationActive={false}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-[#18181b] border border-zinc-800 p-6 rounded-2xl shadow-2xl ring-1 ring-white/5 backdrop-blur-xl pointer-events-none min-w-[160px]">
                                                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 border-b border-zinc-800 pb-2">{data.name}</p>
                                                            <p className={`text-2xl font-black font-mono ${data.val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtUSD(data.val)}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="range" isAnimationActive={false} barSize={85}>
                                            {calc.waterfallData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} radius={[4, 4, 4, 4]} />)}
                                            <LabelList dataKey="val" position="top" formatter={(v: number) => fmtUSD(v)} style={{ fill: '#a1a1aa', fontSize: 14, fontWeight: 900, fontFamily: 'JetBrains Mono' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* NEW LAYOUT: Row 2 -> Capital J-Curve (Left) + Traffic Breakdown (Right) */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
                        {/* 1. Capital J-Curve */}
                        <PromotionStrategyPanel
                            price={simPrice}
                            targetVolume={targetVolume}
                            totalBudget={calc.volume.totalSales * (simTacos / 100)} // Linked: Target Volume * Price * TACOS
                            simCpc={simCpc}
                            simCvr={simCvr}
                            baseCostPerUnit={calc.unit.baseCostPerUnit}
                            commissionRate={calc.unit.commissionRate}
                            viewMode="curve"
                        />

                        {/* 2. Traffic Execution Breakdown */}
                        <PromotionOrderBreakdown
                            price={simPrice}
                            targetVolume={targetVolume}
                            tacos={simTacos}
                            simCpc={simCpc}
                            setSimCpc={setSimCpc}
                            simCtr={simCtr}
                            setSimCtr={setSimCtr}
                            simCvr={simCvr}
                            setSimCvr={setSimCvr}
                        />
                    </div>

                    {/* NEW LAYOUT: Row 3 -> Sweet Spot Matrix (Full Width) */}
                    <div className="mt-6 w-full">
                        <PromotionStrategyPanel
                            price={simPrice}
                            targetVolume={targetVolume}
                            totalBudget={calc.volume.totalSales * (simTacos / 100)}
                            simCpc={simCpc} // User Intent: Can be set to BE-CPC to see baseline, or Higher to see investment dip
                            simCvr={simCvr}
                            baseCostPerUnit={calc.unit.baseCostPerUnit}
                            commissionRate={calc.unit.commissionRate}
                            viewMode="matrix"
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default PromotionAnalysis;

