import React, { useState, useMemo } from 'react';
import { Card, NumericInput } from '../ui';

/**
 * 资金复利效应计算器
 */
const CompoundCalculator: React.FC = () => {
    const [compCapital, setCompCapital] = useState(100000);
    const [compMargin, setCompMargin] = useState(10);
    const [compDaysA, setCompDaysA] = useState(45);
    const [compDaysB, setCompDaysB] = useState(30);

    const compoundResults = useMemo(() => {
        const turnsA = 360 / Math.max(1, compDaysA);
        const turnsB = 360 / Math.max(1, compDaysB);
        const rate = compMargin / 100;
        const resultA = compCapital * Math.pow(1 + rate, turnsA);
        const resultB = compCapital * Math.pow(1 + rate, turnsB);
        const diff = resultB - resultA;
        return { turnsA, turnsB, resultA, resultB, diff };
    }, [compCapital, compMargin, compDaysA, compDaysB]);

    return (
        <Card icon="rocket_launch" iconColor="bg-gradient-to-br from-purple-500 to-pink-500" title="资金复利效应计算器">
            <div className="p-4 space-y-3">
                {/* Inputs */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/50 rounded-lg p-3">
                        <label className="block text-xs text-zinc-400 font-bold mb-1">💰 投入本金 (¥)</label>
                        <NumericInput defaultValue={compCapital} onChange={setCompCapital} textSize="text-lg" className="w-full py-2 font-bold text-center" />
                    </div>
                    <div className="bg-zinc-900/50 rounded-lg p-3">
                        <label className="block text-xs text-zinc-400 font-bold mb-1">📈 单次利润率 (%)</label>
                        <NumericInput defaultValue={compMargin} onChange={setCompMargin} textSize="text-lg" className="w-full py-2 font-bold text-center" />
                    </div>
                </div>

                {/* Scenario A */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-black text-blue-400">📊 方案 A (现状)</div>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-1.5">
                            <span className="text-zinc-400 text-sm font-bold">周转:</span>
                            <NumericInput defaultValue={compDaysA} onChange={setCompDaysA} className="w-16 text-center" />
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
                            <NumericInput defaultValue={compDaysB} onChange={setCompDaysB} className="w-16 text-center" />
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
    );
};

export default CompoundCalculator;
