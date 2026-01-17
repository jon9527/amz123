import React from 'react';
import { SavedProfitModel } from '../../types';

interface CurrentSchemeDisplayProps {
    /** The currently selected profit model */
    model: SavedProfitModel | null | undefined;
    /** Accent color theme (default: 'blue') */
    accentColor?: 'blue' | 'purple';
}

/**
 * Displays the currently selected profit scheme with breathing indicator.
 * Used across: PromotionAnalysis, AdsAnalysis, PromotionDeduction
 */
export const CurrentSchemeDisplay: React.FC<CurrentSchemeDisplayProps> = ({
    model,
    accentColor = 'blue',
}) => {
    if (!model) return null;

    const marginPct = (model.results?.planB?.margin ?? 0) * 100;
    const marginColor = marginPct >= 20 ? 'text-emerald-400' : marginPct >= 10 ? 'text-yellow-400' : 'text-red-400';

    // Color mappings based on accent
    const colors = {
        blue: {
            pingBg: 'bg-blue-400',
            dotBg: 'bg-blue-500',
            tagBg: 'bg-blue-500/20',
            tagText: 'text-blue-400',
            tagBorder: 'border-blue-500/30',
        },
        purple: {
            pingBg: 'bg-purple-400',
            dotBg: 'bg-purple-500',
            tagBg: 'bg-purple-500/20',
            tagText: 'text-purple-400',
            tagBorder: 'border-purple-500/30',
        },
    }[accentColor];

    return (
        <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-3 h-10 min-w-[180px]">
            {/* Breathing Light Indicator */}
            <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.pingBg} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.dotBg}`} />
            </span>

            {/* Product Name */}
            <span className="text-sm font-bold text-white">{model.productName}</span>

            {/* Margin with Trend Icon */}
            <span className={`text-xs font-bold flex items-center gap-0.5 ${marginColor}`}>
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {marginPct.toFixed(1)}%
            </span>
        </div>
    );
};

export default CurrentSchemeDisplay;
