/**
 * 加载状态组件
 */

import React from 'react';

export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    className = '',
}) => {
    return (
        <div
            className={`
                ${sizeStyles[size]}
                border-blue-500 border-t-transparent
                rounded-full animate-spin
                ${className}
            `}
        />
    );
};

/**
 * 骨架屏组件
 */
export interface SkeletonProps {
    width?: string;
    height?: string;
    className?: string;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
};

export const Skeleton: React.FC<SkeletonProps> = ({
    width = '100%',
    height = '1rem',
    className = '',
    rounded = 'md',
}) => {
    return (
        <div
            className={`
                bg-zinc-700 animate-pulse
                ${roundedStyles[rounded]}
                ${className}
            `}
            style={{ width, height }}
        />
    );
};

/**
 * 加载状态覆盖层
 */
export interface LoadingOverlayProps {
    isLoading: boolean;
    children: React.ReactNode;
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isLoading,
    children,
    message = '加载中...',
}) => {
    return (
        <div className="relative">
            {children}
            {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                        <LoadingSpinner size="lg" />
                        <span className="text-sm text-zinc-300">{message}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoadingSpinner;
