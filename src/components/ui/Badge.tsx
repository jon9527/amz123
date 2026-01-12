import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    className?: string;
    /** 是否可移除 */
    removable?: boolean;
    /** 移除回调 */
    onRemove?: () => void;
}

const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50',
    primary: 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50',
    success: 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/50',
    warning: 'bg-orange-900/50 text-orange-300 hover:bg-orange-800/50',
    danger: 'bg-red-900/50 text-red-300 hover:bg-red-800/50',
    info: 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50',
};

const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
};

/**
 * 通用徽章/标签组件
 */
const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
    removable = false,
    onRemove,
}) => {
    return (
        <span
            className={`
                inline-flex items-center gap-1 rounded font-medium transition-colors
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${className}
            `}
        >
            {children}
            {removable && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.();
                    }}
                    className="opacity-60 hover:opacity-100 hover:text-red-400 font-bold ml-0.5"
                >
                    ×
                </button>
            )}
        </span>
    );
};

export default Badge;
