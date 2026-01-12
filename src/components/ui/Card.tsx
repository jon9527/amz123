import React from 'react';

export interface CardProps {
    icon?: string;
    iconColor?: string;
    title?: string;
    children: React.ReactNode;
    className?: string;
    minHeight?: string;
    noPadding?: boolean;
}

/**
 * 通用卡片容器组件
 * 提供统一的暗色主题卡片样式
 */
const Card: React.FC<CardProps> = ({
    icon,
    iconColor = 'bg-gradient-to-br from-blue-500 to-blue-600',
    title,
    children,
    className = '',
    minHeight,
    noPadding = false,
}) => {
    return (
        <div
            className={`bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden ${className}`}
            style={minHeight ? { minHeight } : undefined}
        >
            {/* 标题栏 */}
            {(icon || title) && (
                <div className="px-5 py-4 border-b border-[#27272a] flex items-center gap-3 bg-white/[0.02]">
                    {icon && (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${iconColor}`}>
                            <span className="material-symbols-outlined text-lg">{icon}</span>
                        </div>
                    )}
                    {title && <span className="font-bold text-white">{title}</span>}
                </div>
            )}
            {/* 内容区 */}
            <div className={noPadding ? '' : ''}>{children}</div>
        </div>
    );
};

export default Card;
