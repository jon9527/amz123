import React, { useEffect, useMemo, useState } from 'react';
import { SavedProfitModel, SavedReplenishmentPlan, ReplenishmentPlanSummary } from '../types';
import { useLogistics } from '../contexts/LogisticsContext';
import { replenishmentPlanRepository } from '../repositories/ReplenishmentPlanRepository';
import { SkuReplenishmentBreakdownModal } from './SkuReplenishmentBreakdownModal';

interface ReplenishmentModalProps {
    strategies: SavedProfitModel[];
    currentStrategyId?: string; // Optional: just for context of what user is currently looking at
    productId: string;
    productName?: string;
    currentPlan?: any; // Live editing state from parent
    onClose: () => void;
    onSave: (modelId: string, updates: Partial<SavedProfitModel>) => void;
    onDelete?: (modelId: string) => void;
    onResetActive?: () => void; // New callback to clear active plan
}

// Unified interface for display
interface DisplayPlan {
    id: string;
    sourceType: 'strategy_active' | 'strategy_embedded' | 'saved_plan';
    name: string;
    tags?: string[];
    updatedAt: number; // For sorting
    replenishment: {
        batches: any[];
        summary: ReplenishmentPlanSummary;
        simStart: string;
        seaChannelId?: string;
        airChannelId?: string;
        expChannelId?: string;
    };
    originalObject: any; // SavedProfitModel or SavedReplenishmentPlan
}

export const ReplenishmentModal: React.FC<ReplenishmentModalProps> = ({
    strategies,
    currentStrategyId,
    productId,
    productName,
    currentPlan,
    onClose,
    onSave,
    onResetActive,
}) => {
    const { getChannel } = useLogistics();
    const [breakdownTarget, setBreakdownTarget] = useState<{ planName: string, batches: any[], productId: string } | null>(null);

    // 1. Get the current strategy for context (optional)
    const currentStrategy = useMemo(() => strategies.find(s => s.id === currentStrategyId), [strategies, currentStrategyId]);

    // 2. Fetch related saved plans BY PRODUCT ID (Synchronous Init to prevent flicker)
    const [savedPlans, setSavedPlans] = useState<SavedReplenishmentPlan[]>(() => {
        if (productId) {
            return replenishmentPlanRepository.getByProductId(productId);
        }
        return [];
    });

    // Keep effect for updates if productId changes while modal is open
    useEffect(() => {
        if (productId) {
            const related = replenishmentPlanRepository.getByProductId(productId);
            setSavedPlans(related);
        }
    }, [productId]);

    // 3. Merge into unified display list
    const displayList = useMemo(() => {
        const list: DisplayPlan[] = [];

        // Priority 1: Use Live Current Plan (if passed)
        if (currentPlan) {
            list.push({
                id: 'live_current',
                sourceType: 'strategy_active',
                name: '当前编辑 (未保存)',
                tags: ['Editing', 'Unsaved'],
                updatedAt: Date.now() + 1000, // Always top
                replenishment: currentPlan,
                originalObject: currentPlan
            });
        }

        // Restoration: Include Legacy Strategy Embedded Plans
        // These are plans stored directly inside the SavedProfitModel, not as separate "SavedReplenishmentPlan" entities.
        strategies.forEach(strategy => {
            if (strategy.replenishment) {
                // 从策略中提取售价和利润率信息
                const price = strategy.inputs?.actualPrice || strategy.results?.planB?.price || 0;
                const margin = (strategy.results?.planB?.margin || 0) * 100;
                const displayName = `定价: $${price.toFixed(2)} (${margin.toFixed(0)}%)`;

                list.push({
                    id: strategy.id, // Use strategy ID to identify this plan source
                    sourceType: 'strategy_embedded',
                    name: displayName,
                    tags: ['策略基准', ...(strategy.tags || [])],
                    updatedAt: strategy.timestamp || 0,
                    replenishment: strategy.replenishment,
                    originalObject: strategy
                });
            }
        });

        // Add Saved Plans
        savedPlans.forEach(plan => {
            // Avoid duplicate if saved plan is identical to active (optional, but keep simple for now)
            list.push({
                id: plan.id,
                sourceType: 'saved_plan',
                name: plan.name,
                tags: ['历史方案'],
                updatedAt: plan.updatedAt || 0,
                replenishment: {
                    batches: plan.batches,
                    summary: plan.summary,
                    simStart: plan.simStart,
                    seaChannelId: plan.seaChannelId,
                    airChannelId: plan.airChannelId,
                    expChannelId: plan.expChannelId
                },
                originalObject: plan
            });
        });

        // Sort by Time Desc (Newest First)
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [strategies, currentStrategy, savedPlans, currentPlan]);


    // Helper to process metrics
    const getMetrics = (plan: DisplayPlan) => {
        const repl = plan.replenishment;
        const batches = repl.batches;

        // Logistics Mix
        const sea = batches.filter(b => b.type === 'sea').length;
        const air = batches.filter(b => b.type === 'air').length;
        const exp = batches.filter(b => b.type === 'exp').length;

        // Timeline
        let startTs = Infinity;
        let endTs = -Infinity;

        batches.forEach(b => {
            const channelId = (b.type === 'sea' ? repl.seaChannelId :
                b.type === 'air' ? repl.airChannelId : repl.expChannelId) || '';
            const channel = getChannel(channelId);
            const delivery = channel?.deliveryDays || (b.type === 'sea' ? 35 : 10);

            const shipOffset = b.offset + b.prodDays;
            const arrOffset = shipOffset + delivery;

            if (shipOffset < startTs) startTs = shipOffset;
            if (arrOffset > endTs) endTs = arrOffset;
        });

        const dStart = new Date(repl.simStart);
        dStart.setDate(dStart.getDate() + (startTs === Infinity ? 0 : startTs));
        const firstShip = `${dStart.getMonth() + 1}/${dStart.getDate()}`;

        const dEnd = new Date(repl.simStart);
        dEnd.setDate(dEnd.getDate() + (endTs === -Infinity ? 0 : endTs));
        const lastArr = `${dEnd.getMonth() + 1}/${dEnd.getDate()}`;

        return {
            mix: { sea, air, exp },
            timeline: { firstShip, lastArr, duration: (endTs - startTs) },
            summary: repl.summary
        };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl w-[1200px] max-w-[95vw] h-[600px] max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#1e293b] flex justify-between items-center bg-[#0f172a]">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-500 text-xl">compare_arrows</span>
                            补货方案对比
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">
                            产品: <span className="text-slate-200">{productName || 'Unknown'}</span>
                            <span className="mx-2 text-slate-700">|</span>
                            共 <span className="text-white font-bold">{displayList.length}</span> 个关联方案
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-[#1e293b] rounded-lg text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-x-auto overflow-y-auto p-3 bg-[#1e293b]/20 flex flex-col gap-2">
                    {/* Header Row - Always Visible */}
                    {/* Header Row - Always Visible */}
                    <div className="flex w-full px-1 mb-1 shrink-0">
                        <div className="w-[140px] shrink-0 text-xs text-slate-500 font-bold uppercase pl-2">方案信息</div>
                        <div className="w-[60px] shrink-0 text-center text-xs text-slate-500 font-bold uppercase border-l border-transparent">总数</div>
                        <div className="flex-1 grid grid-cols-6 gap-2 text-center text-xs text-slate-500 font-bold uppercase px-3 border-l border-transparent">
                            {[1, 2, 3, 4, 5, 6].map(i => <div key={i}>批次{i}</div>)}
                        </div>
                        <div className="w-auto shrink-0 flex text-center text-xs text-slate-500 font-bold uppercase divide-x divide-transparent">
                            {[
                                { label: '资金占用', w: 'w-20' },
                                { label: 'ROI', w: 'w-14' },
                                { label: '年化回报率', w: 'w-20' },
                                { label: '周转率', w: 'w-14' },
                                { label: '净利率', w: 'w-14' },
                                { label: '周转天', w: 'w-14' },
                                { label: '回本', w: 'w-16' },
                                { label: '盈利', w: 'w-16' },
                            ].map((h, i) => (
                                <div key={i} className={`${h.w} flex justify-center`}>{h.label}</div>
                            ))}
                        </div>
                        <div className="w-[70px] shrink-0 text-center text-xs text-slate-500 font-bold uppercase">操作</div>
                    </div>

                    {displayList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 h-full border-2 border-dashed border-[#1e293b] rounded-2xl bg-[#1e293b]/30 w-full shrink-0">
                            <span className="material-symbols-outlined text-5xl text-slate-600 mb-4">pending</span>
                            <p className="text-slate-400 font-bold">暂无补货数据</p>
                            <p className="text-xs text-slate-600 mt-2">请先在补货建议模块生成并保存方案</p>
                        </div>
                    ) : (
                        displayList.map(plan => {
                            const metrics = getMetrics(plan);
                            const isActive = plan.sourceType === 'strategy_active';
                            const summary = metrics.summary;

                            // 使用 summary 中已有的数据
                            const maxCapital = Math.abs(summary.minCash); // 资金最大占用

                            // 直接从 summary 读取已保存的财务指标（保存时已计算好）
                            const roi = summary.roi ?? 0;
                            const annualRoi = summary.annualRoi ?? 0;
                            const turnoverRatio = summary.turnoverRatio ?? 0;
                            const netMargin = summary.netMargin ?? 0;
                            const turnoverDays = summary.turnoverDays ?? 0;
                            const profitDate = summary.profitDate ?? '-';

                            // Pad batches to ensure 6 columns
                            const batches = [...plan.replenishment.batches];
                            while (batches.length < 6) {
                                batches.push({ id: -1, name: '', type: 'none', qty: 0, offset: 0, prodDays: 0 } as any);
                            }

                            return (
                                <div key={plan.id} className={`group relative flex items-stretch overflow-hidden rounded-lg border transition-all h-[80px] shrink-0 ${isActive ? 'bg-blue-500/5 border-blue-500/30' : 'bg-[#1e293b]/40 border-[#1e293b] hover:border-[#334155]'}`}>

                                    {/* Left: Info */}
                                    <div className="w-[140px] shrink-0 px-2 py-1.5 border-r border-[#1e293b]/50 bg-[#0f172a]/50 flex flex-col justify-center relative">
                                        <div className="flex items-center gap-1.5 mb-1 w-full">
                                            <div className={`font-bold text-xs truncate flex-1 min-w-0 ${isActive ? 'text-white' : 'text-slate-300'}`} title={plan.name}>
                                                {plan.name}
                                            </div>
                                            {isActive && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-500" title="当前方案"></span>}
                                        </div>
                                        <div className="flex flex-col gap-0.5 opacity-60 scale-90 origin-left">
                                            <div className="text-[10px] font-mono text-slate-400">{plan.replenishment.simStart}</div>
                                            {plan.tags && plan.tags.length > 0 && (
                                                <div className="flex gap-1 mt-0.5">
                                                    {plan.tags.map(t => <span key={t} className="px-1 py-px rounded bg-slate-700/50 text-[8px] text-slate-400 border border-slate-700">{t}</span>)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Total Qty Column */}
                                    <div className="w-[60px] shrink-0 bg-[#0f172a]/20 border-r border-[#1e293b]/50 flex items-center justify-center p-1">
                                        <div className="w-full h-full bg-[#1e293b]/30 rounded border border-[#1e293b]/50 flex items-center justify-center">
                                            <div className="text-white font-bold font-mono text-xs scale-90">{summary.totalQty?.toLocaleString() || 0}</div>
                                        </div>
                                    </div>

                                    {/* Middle: Batches */}
                                    <div className="flex-1 px-3 py-1 flex items-center bg-[#0f172a]/20 border-r border-[#1e293b]/50">
                                        <div className="grid grid-cols-6 gap-2 w-full h-full">
                                            {batches.slice(0, 6).map((b, i) => {
                                                if (!b.name) return <div key={i} className="rounded bg-[#1e293b]/10 border border-[#1e293b]/20 h-full"></div>;

                                                const repl = plan.replenishment;
                                                const channelId = (b.type === 'sea' ? repl.seaChannelId : b.type === 'air' ? repl.airChannelId : repl.expChannelId) || '';
                                                const channel = getChannel(channelId);
                                                const delivery = channel?.deliveryDays || 30;

                                                // 计算日期
                                                const startDate = new Date(repl.simStart);
                                                const shipDate = new Date(startDate);
                                                shipDate.setDate(startDate.getDate() + b.offset + b.prodDays);
                                                const arrDate = new Date(shipDate);
                                                arrDate.setDate(shipDate.getDate() + delivery);
                                                const fmtDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
                                                const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));

                                                return (
                                                    <div key={i} className="bg-[#1e293b]/30 rounded border border-[#1e293b]/50 flex flex-col items-center justify-center p-0.5 relative group/batch h-full">
                                                        <div className={`absolute top-0.5 right-1 text-[9px] opacity-70 ${b.type === 'sea' ? 'text-blue-400' : b.type === 'air' ? 'text-sky-400' : 'text-purple-400'}`}>
                                                            {b.type === 'sea' ? '🚢' : b.type === 'air' ? '✈️' : '🚀'}
                                                        </div>
                                                        <div className="text-white font-bold font-mono text-sm mt-3">{finalQty}</div>
                                                        <div className="flex items-center justify-center gap-0.5 mt-1 opacity-70 w-full">
                                                            <span className="text-[9px] text-slate-400 font-mono scale-90 whitespace-nowrap">{fmtDate(shipDate)}</span>
                                                            <span className="text-[9px] text-slate-600 scale-90">→</span>
                                                            <span className="text-[9px] text-slate-400 font-mono scale-90 whitespace-nowrap">{fmtDate(arrDate)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right: Metrics - Pure Values */}
                                    <div className="w-auto shrink-0 bg-[#0f172a]/30 flex items-center px-0 divide-x divide-[#1e293b]/50 border-r border-[#1e293b]/50">
                                        {[
                                            { val: `$${Math.round(maxCapital).toLocaleString()}`, color: 'text-amber-400', width: 'w-20' },
                                            { val: `${(roi * 100).toFixed(1)}%`, color: (roi * 100) > 100 ? 'text-purple-400' : 'text-slate-300', width: 'w-14' },
                                            { val: `${(annualRoi * 100).toFixed(1)}%`, color: (annualRoi * 100) > 200 ? 'text-indigo-400' : 'text-slate-300', width: 'w-20' },
                                            { val: turnoverRatio.toFixed(2), color: turnoverRatio > 5 ? 'text-cyan-400' : 'text-slate-300', width: 'w-14' },
                                            { val: `${(netMargin * 100).toFixed(1)}%`, color: (netMargin * 100) > 20 ? 'text-emerald-400' : netMargin < 0 ? 'text-red-400' : 'text-slate-300', width: 'w-14' },
                                            { val: `${turnoverDays}天`, color: 'text-orange-400', width: 'w-14' },
                                            { val: summary.breakevenDate || '-', color: 'text-blue-400', width: 'w-16' },
                                            { val: profitDate, color: 'text-green-400', width: 'w-16' },
                                        ].map((m, i) => (
                                            <div key={i} className={`flex justify-center items-center h-full px-1 ${m.width}`}>
                                                <div className={`font-bold font-mono text-xs ${m.color} truncate`}>{m.val}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Column */}
                                    <div className="w-[70px] shrink-0 bg-[#0f172a]/40 flex items-center justify-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setBreakdownTarget({
                                                    planName: plan.name,
                                                    batches: plan.replenishment.batches,
                                                    productId: productId
                                                });
                                            }}
                                            className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                                            title="查看SKU拆分明细"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">splitscreen</span>
                                        </button>
                                        {(plan.sourceType === 'saved_plan' || plan.sourceType === 'strategy_embedded' || (plan.sourceType === 'strategy_active' && onResetActive)) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (plan.sourceType === 'strategy_active') {
                                                        if (confirm('确定要清空"当前编辑"的方案内容吗？这将重置为默认状态。')) onResetActive?.();
                                                    } else if (plan.sourceType === 'strategy_embedded') {
                                                        if (confirm(`确定要移除属于策略 "${plan.originalObject.label}" 的补货方案吗？\n注意：这将从该利润策略中永久移除补货计划设置。`)) onSave(plan.id, { replenishment: null } as any);
                                                    } else {
                                                        if (confirm('确定要删除这个方案吗？')) {
                                                            replenishmentPlanRepository.delete(plan.id);
                                                            setSavedPlans(prev => prev.filter(p => p.id !== plan.id));
                                                        }
                                                    }
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                title="删除方案"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>


            </div >

            <SkuReplenishmentBreakdownModal
                isOpen={!!breakdownTarget}
                onClose={() => setBreakdownTarget(null)}
                planName={breakdownTarget?.planName || ''}
                batches={breakdownTarget?.batches || []}
                productId={breakdownTarget?.productId || ''}
            />
        </div >
    );
};

