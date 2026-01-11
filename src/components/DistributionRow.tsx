import React from 'react';
import { fmtUSD } from '../utils/formatters';

export interface DistributionRowProps {
    label: string;
    value: number;
    price: number;
    color: string;
    isBold?: boolean;
}

/**
 * 成本分布行 - 显示成本项的金额、百分比和进度条
 */
const DistributionRow: React.FC<DistributionRowProps> = ({ label, value, price, color, isBold }) => {
    const pct = price > 0 ? (value / price) * 100 : 0;
    return (
        <div className="group w-full h-[44px] flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${color} shadow-lg shadow-black/50`}></div>
                    <span className="text-[12px] text-zinc-400 font-black uppercase tracking-tight">{label}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[13px] font-mono ${isBold ? 'text-emerald-500 font-black' : 'text-zinc-100 font-black'}`}>{fmtUSD(value)}</span>
                    <span className="text-[10px] text-zinc-600 font-mono w-10 text-right font-black">{pct.toFixed(1)}%</span>
                </div>
            </div>
            <div className="h-[2px] bg-zinc-950 rounded-full overflow-hidden">
                <div className={`h-full ${color} opacity-90 transition-all duration-700 ease-out`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}></div>
            </div>
        </div>
    );
};

export default DistributionRow;
