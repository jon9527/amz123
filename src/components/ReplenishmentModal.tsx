import React, { useMemo, useState } from 'react';
import { SavedProfitModel } from '../types';
import { useLogistics } from '../contexts/LogisticsContext';

interface ReplenishmentModalProps {
    strategies: SavedProfitModel[];
    initialStrategyId: string;
    onClose: () => void;
    onSave: (modelId: string, updates: Partial<SavedProfitModel>) => void;
}



export const ReplenishmentModal: React.FC<ReplenishmentModalProps> = ({
    strategies,
    initialStrategyId,
    onClose,
}) => {
    const { getChannel } = useLogistics();
    const [expandedId, setExpandedId] = useState<string | null>(initialStrategyId);

    // Filter strategies that have replenishment data
    const validStrategies = useMemo(() => {
        return strategies.filter(s => s.replenishment && s.replenishment.batches.length > 0);
    }, [strategies]);

    // Helper to process strategy data for display
    const getStrategyMetrics = (strategy: SavedProfitModel) => {
        const repl = strategy.replenishment!;
        const batches = repl.batches;

        // Logistics Mix
        const sea = batches.filter(b => b.type === 'sea').length;
        const air = batches.filter(b => b.type === 'air').length;
        const exp = batches.filter(b => b.type === 'exp').length;

        // Timeline
        // Find earliest ship date and latest arrival date
        let firstShip = '';
        let lastArr = '';
        let startTs = Infinity;
        let endTs = -Infinity;

        batches.forEach(b => {
            // Re-calculate dates based on offsets
            const channelId = (b.type === 'sea' ? repl.seaChannelId :
                b.type === 'air' ? repl.airChannelId : repl.expChannelId) || '';
            const channel = getChannel(channelId);
            const delivery = channel?.deliveryDays || (b.type === 'sea' ? 35 : 10);

            const shipOffset = b.offset + b.prodDays;
            const arrOffset = shipOffset + delivery;

            // Simple approximation for sorting
            if (shipOffset < startTs) startTs = shipOffset;
            if (arrOffset > endTs) endTs = arrOffset;
        });

        // Convert offset to date string using simStart
        const dStart = new Date(repl.simStart);
        dStart.setDate(dStart.getDate() + startTs);
        firstShip = `${dStart.getMonth() + 1}/${dStart.getDate()}`;

        const dEnd = new Date(repl.simStart);
        dEnd.setDate(dEnd.getDate() + endTs);
        lastArr = `${dEnd.getMonth() + 1}/${dEnd.getDate()}`;

        return {
            mix: { sea, air, exp },
            timeline: { firstShip, lastArr, duration: endTs - startTs },
            summary: repl.summary
        };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
                {/* Header */}
                <div className="px-8 py-5 border-b border-[#1e293b] flex justify-between items-center bg-[#0f172a]">
                    <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <span className="material-symbols-outlined text-indigo-500 text-3xl">compare_arrows</span>
                            补货方案对比
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 font-medium">
                            关联产品: <span className="text-slate-200">{strategies[0]?.productName}</span>
                            <span className="mx-3 text-slate-700">|</span>
                            共 <span className="text-white font-bold">{validStrategies.length}</span> 个有效方案
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#1e293b] rounded-xl text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {validStrategies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[#1e293b] rounded-2xl bg-[#1e293b]/30">
                            <span className="material-symbols-outlined text-5xl text-slate-600 mb-4">pending</span>
                            <p className="text-slate-400 font-bold">暂无补货数据</p>
                            <p className="text-xs text-slate-600 mt-2">请先在补货建议模块生成并保存方案</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-[#1e293b] overflow-hidden bg-[#1e293b]/20">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#1e293b] text-xs uppercase tracking-wider text-slate-400 font-bold">
                                        <th className="px-6 py-4">方案名称</th>
                                        <th className="px-6 py-4">物流配比 (批次)</th>
                                        <th className="px-6 py-4">时间周期 (发货→到货)</th>
                                        <th className="px-6 py-4 text-right">总成本 / 预估资金</th>
                                        <th className="px-6 py-4 text-center">断货风险</th>
                                        <th className="px-6 py-4 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1e293b]">
                                    {validStrategies.map(strategy => {
                                        const metrics = getStrategyMetrics(strategy);
                                        const isBestCost = validStrategies.every(s => s.replenishment!.summary.totalCost >= metrics.summary.totalCost);


                                        return (
                                            <tr key={strategy.id} className="hover:bg-[#1e293b]/50 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="font-bold text-white text-base">{strategy.label}</div>
                                                    <div className="flex gap-2 mt-1.5">
                                                        {strategy.tags?.map(t => (
                                                            <span key={t} className="px-1.5 py-0.5 bg-[#334155]/50 text-slate-400 rounded text-[10px] font-medium">{t}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        {metrics.mix.sea > 0 && (
                                                            <div className="flex items-center gap-1.5 text-slate-300 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                                                                <span className="material-symbols-outlined text-[16px] text-blue-400">sailing</span>
                                                                <span className="text-xs font-bold">{metrics.mix.sea}</span>
                                                            </div>
                                                        )}
                                                        {metrics.mix.air > 0 && (
                                                            <div className="flex items-center gap-1.5 text-slate-300 bg-sky-500/10 px-2 py-1 rounded-lg border border-sky-500/20">
                                                                <span className="material-symbols-outlined text-[16px] text-sky-400">flight</span>
                                                                <span className="text-xs font-bold">{metrics.mix.air}</span>
                                                            </div>
                                                        )}
                                                        {metrics.mix.exp > 0 && (
                                                            <div className="flex items-center gap-1.5 text-slate-300 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                                                                <span className="material-symbols-outlined text-[16px] text-purple-400">rocket_launch</span>
                                                                <span className="text-xs font-bold">{metrics.mix.exp}</span>
                                                            </div>
                                                        )}
                                                        <span className="text-xs text-slate-500 ml-1">共 {strategy.replenishment!.batches.length} 批</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2 text-sm text-slate-200 font-mono">
                                                            <span>{metrics.timeline.firstShip}</span>
                                                            <span className="text-slate-600">→</span>
                                                            <span>{metrics.timeline.lastArr}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-medium">
                                                            周期: {Math.round(metrics.timeline.duration / 30 * 10) / 10} 个月
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="font-bold text-white text-base">${Math.abs(metrics.summary.totalCost).toLocaleString()}</div>
                                                    <div className="text-xs text-amber-500 font-medium mt-1">
                                                        峰值占用: ${Math.abs(metrics.summary.minCash).toLocaleString()}
                                                    </div>
                                                    {isBestCost && <div className="text-[10px] text-green-500 font-bold mt-1">✨ 成本最低</div>}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    {metrics.summary.stockoutDays > 0 ? (
                                                        <div className="inline-flex flex-col items-center">
                                                            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 font-bold text-sm border border-red-500/20">
                                                                缺货 {metrics.summary.stockoutDays} 天
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex flex-col items-center">
                                                            <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 font-bold text-sm border border-green-500/20">
                                                                完美接力
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button
                                                        onClick={() => setExpandedId(expandedId === strategy.id ? null : strategy.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${expandedId === strategy.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white'}`}
                                                    >
                                                        {expandedId === strategy.id ? '收起详情' : '查看详情'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Expanded Detail View */}
                    {expandedId && (
                        <div className="mt-6 animate-in slide-in-from-top-4 duration-300">
                            {/* Re-use the batch detail table if needed, or render a specialized summary */}
                            {(() => {
                                const s = validStrategies.find(vs => vs.id === expandedId);
                                if (!s || !s.replenishment) return null;

                                return (
                                    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-6 shadow-inner">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-slate-200">
                                                <span className="text-blue-400 mr-2">●</span>
                                                {s.label} - 批次明细
                                            </h3>
                                            <div className="text-xs text-slate-500">模拟开始日期: {s.replenishment.simStart}</div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="border-b border-[#334155] text-slate-500">
                                                        <th className="py-2 pl-2">批次</th>
                                                        <th className="py-2">方式</th>
                                                        <th className="py-2 text-right">数量</th>
                                                        <th className="py-2 text-right">Offset</th>
                                                        <th className="py-2 text-right">预计发货</th>
                                                        <th className="py-2 text-right pr-2">预计送达</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#334155]/50">
                                                    {s.replenishment.batches.map((b, i) => {
                                                        const channel = getChannel((b.type === 'sea' ? s.replenishment!.seaChannelId : b.type === 'air' ? s.replenishment!.airChannelId : s.replenishment!.expChannelId) || '');
                                                        const delivery = channel?.deliveryDays || 30;
                                                        const shipDate = new Date(s.replenishment!.simStart);
                                                        shipDate.setDate(shipDate.getDate() + b.offset + b.prodDays);

                                                        const arrDate = new Date(shipDate);
                                                        arrDate.setDate(arrDate.getDate() + delivery);

                                                        return (
                                                            <tr key={i} className="text-slate-300">
                                                                <td className="py-2.5 pl-2 font-medium">{b.name || `批次${i + 1}`}</td>
                                                                <td className="py-2.5">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${b.type === 'sea' ? 'bg-blue-500/20 text-blue-300' : b.type === 'air' ? 'bg-sky-500/20 text-sky-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                                                        {b.type.toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 text-right font-mono">{b.qty}</td>
                                                                <td className="py-2.5 text-right text-slate-500">T+{b.offset}</td>
                                                                <td className="py-2.5 text-right text-slate-400">{shipDate.getMonth() + 1}/{shipDate.getDate()}</td>
                                                                <td className="py-2.5 text-right pr-2 text-white font-bold">{arrDate.getMonth() + 1}/{arrDate.getDate()}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#1e293b] flex justify-end bg-[#0f172a]">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold transition-all"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
};
