import React, { useState, useMemo } from 'react';
import { Card, NumericInput } from '../ui';

interface SizeCalculatorProps {
    // 可选的初始值
    initialDims?: { l: number; w: number; h: number; weight: number };
    initialDivisor?: number;
}

/**
 * 尺寸重量换算计算器
 * 公制 ↔ 英制转换，体积重计算
 */
const SizeCalculator: React.FC<SizeCalculatorProps> = ({
    initialDims = { l: 0, w: 0, h: 0, weight: 0 },
    initialDivisor = 6000,
}) => {
    const [sizeDims, setSizeDims] = useState(initialDims);
    const [divisor, setDivisor] = useState(initialDivisor);

    const pos = (v: number) => Math.max(0, v);

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

    return (
        <Card icon="package_2" iconColor="bg-gradient-to-br from-purple-500 to-purple-600" title="尺寸 & 重量换算 (Metric ↔ Imperial)">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5 bg-black/10 border-b border-[#27272a]">
                <div>
                    <label className="block text-xs text-zinc-500 font-bold mb-1.5">长 Length (cm)</label>
                    <NumericInput defaultValue={sizeDims.l} onChange={(v) => setSizeDims(d => ({ ...d, l: v }))} className="w-full" />
                </div>
                <div>
                    <label className="block text-xs text-zinc-500 font-bold mb-1.5">宽 Width (cm)</label>
                    <NumericInput defaultValue={sizeDims.w} onChange={(v) => setSizeDims(d => ({ ...d, w: v }))} className="w-full" />
                </div>
                <div>
                    <label className="block text-xs text-zinc-500 font-bold mb-1.5">高 Height (cm)</label>
                    <NumericInput defaultValue={sizeDims.h} onChange={(v) => setSizeDims(d => ({ ...d, h: v }))} className="w-full" />
                </div>
                <div>
                    <label className="block text-xs text-zinc-500 font-bold mb-1.5">实重 Weight (kg)</label>
                    <NumericInput defaultValue={sizeDims.weight} onChange={(v) => setSizeDims(d => ({ ...d, weight: v }))} className="w-full" />
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
    );
};

export default SizeCalculator;
