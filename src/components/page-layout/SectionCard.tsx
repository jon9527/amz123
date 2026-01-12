import React, { useState } from 'react';

export interface SectionCardProps {
    /** 标题 */
    title?: string;
    /** 图标 */
    icon?: string;
    /** 图标颜色 */
    iconColor?: string;
    /** 内容 */
    children: React.ReactNode;
    /** 是否可折叠 */
    collapsible?: boolean;
    /** 默认展开状态 */
    defaultExpanded?: boolean;
    /** 自定义类名 */
    className?: string;
    /** 右侧操作区 */
    actions?: React.ReactNode;
    /** 无内边距 */
    noPadding?: boolean;
}

/**
 * 页面区块卡片组件
 * 用于组织页面内的各个功能区块
 */
const SectionCard: React.FC<SectionCardProps> = ({
    title,
    icon,
    iconColor = 'bg-gradient-to-br from-blue-500 to-blue-600',
    children,
    collapsible = false,
    defaultExpanded = true,
    className = '',
    actions,
    noPadding = false,
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <div className={`bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden ${className}`}>
            {/* 标题栏 */}
            {(icon || title || actions) && (
                <div
                    className={`px-5 py-4 border-b border-[#27272a] flex items-center justify-between bg-white/[0.02] ${collapsible ? 'cursor-pointer hover:bg-white/[0.04] transition-colors' : ''
                        }`}
                    onClick={collapsible ? () => setExpanded(!expanded) : undefined}
                >
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${iconColor}`}>
                                <span className="material-symbols-outlined text-lg">{icon}</span>
                            </div>
                        )}
                        {title && <span className="font-bold text-white">{title}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {actions}
                        {collapsible && (
                            <span
                                className={`material-symbols-outlined text-zinc-500 transition-transform duration-200 ${expanded ? '' : '-rotate-90'
                                    }`}
                            >
                                expand_more
                            </span>
                        )}
                    </div>
                </div>
            )}
            {/* 内容区 */}
            {(!collapsible || expanded) && (
                <div className={noPadding ? '' : 'p-5'}>{children}</div>
            )}
        </div>
    );
};

export default SectionCard;
