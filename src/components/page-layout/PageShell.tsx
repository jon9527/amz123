import React from 'react';

export interface PageShellProps {
    /** 页面标题 */
    title: string;
    /** 副标题 */
    subtitle?: string;
    /** 图标（emoji 或 material icon） */
    icon?: string;
    /** 是否使用 material icon */
    useMaterialIcon?: boolean;
    /** 右侧操作区 */
    actions?: React.ReactNode;
    /** 页面内容 */
    children: React.ReactNode;
    /** 最大宽度 */
    maxWidth?: 'default' | 'wide' | 'full';
    /** 自定义类名 */
    className?: string;
    /** 全高模式（内容区占满剩余空间） */
    fullHeight?: boolean;
    /** 内容区间距（默认有 space-y-6） */
    contentSpacing?: boolean;
}

const maxWidthClasses = {
    default: 'max-w-5xl',
    wide: 'max-w-7xl',
    full: '',
};

/**
 * 统一页面壳层组件
 * 提供一致的页面结构：标题区 + 内容区
 */
const PageShell: React.FC<PageShellProps> = ({
    title,
    subtitle,
    icon,
    useMaterialIcon = false,
    actions,
    children,
    maxWidth = 'default',
    className = '',
    fullHeight = false,
    contentSpacing = true,
}) => {
    const containerClass = fullHeight
        ? 'h-full flex flex-col'
        : contentSpacing
            ? 'space-y-6'
            : '';

    return (
        <div
            className={`h-full bg-[#09090b] text-white overflow-auto p-6 animate-in fade-in duration-300 ${className}`}
        >
            <div className={`mx-auto ${maxWidthClasses[maxWidth]} ${fullHeight ? 'h-full flex flex-col' : ''}`}>
                {/* Header */}
                <div className={`flex items-center justify-between ${fullHeight ? 'shrink-0 mb-6' : 'mb-6'}`}>
                    <div className="flex items-center gap-3">
                        {icon && (
                            useMaterialIcon ? (
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                                    <span className="material-symbols-outlined text-white">{icon}</span>
                                </div>
                            ) : (
                                <span className="text-3xl">{icon}</span>
                            )
                        )}
                        <div>
                            <h1 className="text-2xl font-black">{title}</h1>
                            {subtitle && <p className="text-zinc-500 text-sm">{subtitle}</p>}
                        </div>
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>

                {/* Content */}
                <div className={containerClass}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default PageShell;
