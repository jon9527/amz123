/**
 * 通用统计卡片组件
 * 用于展示关键指标的可复用卡片
 */

import React from 'react';

export interface StatCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    icon?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    variant?: 'default' | 'success' | 'warning' | 'danger';
    className?: string;
}

const variantStyles = {
    default: 'text-white',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
};

const trendStyles = {
    up: { color: 'text-green-400', icon: '↑' },
    down: { color: 'text-red-400', icon: '↓' },
    neutral: { color: 'text-zinc-400', icon: '→' },
};

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    subValue,
    icon,
    trend,
    trendValue,
    variant = 'default',
    className = '',
}) => {
    const trendStyle = trend ? trendStyles[trend] : null;

    return (
        <div className={`bg-[#18181b] border border-[#27272a] rounded-xl p-4 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 font-bold uppercase">{label}</span>
                {icon && <span className="text-lg">{icon}</span>}
            </div>
            <div className={`text-2xl font-black ${variantStyles[variant]}`}>
                {value}
            </div>
            {(subValue || trendValue) && (
                <div className="flex items-center gap-2 mt-1">
                    {subValue && (
                        <span className="text-xs text-zinc-500">{subValue}</span>
                    )}
                    {trend && trendValue && (
                        <span className={`text-xs ${trendStyle?.color}`}>
                            {trendStyle?.icon} {trendValue}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * 统计卡片网格
 */
export interface StatGridProps {
    children: React.ReactNode;
    columns?: 2 | 3 | 4 | 5 | 6;
    className?: string;
}

const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
};

export const StatGrid: React.FC<StatGridProps> = ({
    children,
    columns = 4,
    className = '',
}) => {
    return (
        <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
            {children}
        </div>
    );
};

export default StatCard;
