import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    loading?: boolean;
}

const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20',
    secondary: 'bg-zinc-700 hover:bg-zinc-600 text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white',
};

const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

/**
 * 通用按钮组件
 */
const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    loading = false,
    disabled,
    className = '',
    ...props
}) => {
    return (
        <button
            disabled={disabled || loading}
            className={`
                inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${className}
            `}
            {...props}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : icon ? (
                <span className="material-symbols-outlined text-lg">{icon}</span>
            ) : null}
            {children}
        </button>
    );
};

export default Button;
