import React, { useState, useMemo } from 'react';
import { Card, NumericInput } from '../ui';

const strategyNames = ['固定竞价', '动态 - 只降低', '动态 - 提高&降低'];
const strategyEngNames = ['Fixed Bids', 'Down Only', 'Up & Down'];
const placeNames = ['首页顶部 (Top)', '商品页面 (PP)', '其余位置 (ROS)'];
const upDownMults = [2.0, 1.5, 1.5];

const pos = (v: number) => Math.max(0, v);

/**
 * 竞价计算器
 * 正向计算：Bid + 百分比 = 最终出价
 * 反向推导：Bid + 目标价 = 需要的百分比
 */
const BidCalculator: React.FC = () => {
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

    return (
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
                                                        <NumericInput
                                                            defaultValue={forwardBids[groupIdx]}
                                                            onChange={(v) => {
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
                                                <NumericInput
                                                    defaultValue={forwardPcts[groupIdx][placeIdx]}
                                                    onChange={(v) => {
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
                                                        <NumericInput
                                                            defaultValue={reverseBids[groupIdx]}
                                                            onChange={(v) => {
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
                                                <NumericInput
                                                    defaultValue={reverseFinals[groupIdx][placeIdx]}
                                                    onChange={(v) => {
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
    );
};

export default BidCalculator;
