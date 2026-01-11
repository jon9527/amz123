import React from 'react';

export type CostCardColor =
    | 'slate' | 'blue' | 'sky' | 'orange' | 'purple'
    | 'indigo' | 'emerald' | 'rose' | 'yellow' | 'zinc';

export interface CostCardProps {
    label: string;
    value: number;
    subValue?: string;
    color: CostCardColor;
    exchangeRate?: number;
    isBold?: boolean;
}

const COLOR_STYLES: Record<CostCardColor, string> = {
    slate: 'border-slate-800 bg-slate-900/50 text-slate-400',
    blue: 'border-blue-900/50 bg-blue-900/20 text-blue-400',
    sky: 'border-sky-900/50 bg-sky-900/20 text-sky-400',
    orange: 'border-orange-900/50 bg-orange-900/20 text-orange-400',
    purple: 'border-purple-900/50 bg-purple-900/20 text-purple-400',
    indigo: 'border-indigo-900/50 bg-indigo-900/20 text-indigo-400',
    emerald: 'border-emerald-900/50 bg-emerald-900/20 text-emerald-400',
    rose: 'border-rose-900/50 bg-rose-900/20 text-rose-400',
    yellow: 'border-yellow-900/50 bg-yellow-900/20 text-yellow-400',
    zinc: 'border-zinc-800 bg-zinc-900/50 text-zinc-400'
};

/**
 * CostCard - 成本/销售卡片组件
 * 用于显示单项成本或销售数据，带有颜色编码和可选汇率转换
 */
const CostCard: React.FC<CostCardProps> = ({
    label,
    value,
    subValue,
    color,
    exchangeRate,
    isBold = false
}) => {
    const style = COLOR_STYLES[color] || COLOR_STYLES.slate;

    return (
        <div className={`p-4 rounded-xl border ${style} flex flex-col justify-between h-[130px] min-w-0 flex-1 items-center`}>
            <span className={`text-[11px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1 ${isBold ? 'text-white' : ''}`}>
                {label}
            </span>
            <div className="text-center w-full">
                <div className={`text-2xl font-black tracking-tight font-mono flex justify-center ${isBold ? 'text-emerald-400' : 'text-white'}`}>
                    {typeof value === 'number' && !isNaN(value)
                        ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '$0.00'}
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

export default CostCard;
