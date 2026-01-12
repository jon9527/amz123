/**
 * 通用数字输入组件
 * 带有标签、前缀/后缀、验证的可复用输入组件
 */

import React, { useCallback } from 'react';

export interface NumberInputProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    prefix?: string;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    className?: string;
    labelClassName?: string;
    inputClassName?: string;
}

const defaultInputClass = 'w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
const defaultLabelClass = 'text-xs text-zinc-500 font-bold uppercase mb-1';

export const NumberInput: React.FC<NumberInputProps> = ({
    label,
    value,
    onChange,
    prefix,
    suffix,
    min,
    max,
    step = 1,
    placeholder = '0',
    disabled = false,
    error = false,
    className = '',
    labelClassName = defaultLabelClass,
    inputClassName = defaultInputClass,
}) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            // 应用 min/max 约束
            let constrained = val;
            if (min !== undefined) constrained = Math.max(min, constrained);
            if (max !== undefined) constrained = Math.min(max, constrained);
            onChange(constrained);
        } else if (e.target.value === '') {
            onChange(0);
        }
    }, [onChange, min, max]);

    return (
        <div className={className}>
            <div className={labelClassName}>{label}</div>
            <div className="relative">
                {prefix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                        {prefix}
                    </span>
                )}
                <input
                    type="number"
                    value={value || ''}
                    onChange={handleChange}
                    step={step}
                    min={min}
                    max={max}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`
                        ${inputClassName}
                        ${prefix ? 'pl-7' : ''}
                        ${suffix ? 'pr-8' : ''}
                        ${error ? 'border-red-500' : ''}
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                        {suffix}
                    </span>
                )}
            </div>
        </div>
    );
};

/**
 * 百分比输入组件
 */
export const PercentInput: React.FC<Omit<NumberInputProps, 'suffix'>> = (props) => (
    <NumberInput {...props} suffix="%" min={props.min ?? 0} max={props.max ?? 100} />
);

/**
 * 货币输入组件 (USD)
 */
export const USDInput: React.FC<Omit<NumberInputProps, 'prefix'>> = (props) => (
    <NumberInput {...props} prefix="$" step={props.step ?? 0.01} min={props.min ?? 0} />
);

/**
 * 货币输入组件 (RMB)
 */
export const RMBInput: React.FC<Omit<NumberInputProps, 'prefix'>> = (props) => (
    <NumberInput {...props} prefix="¥" step={props.step ?? 0.01} min={props.min ?? 0} />
);

export default NumberInput;
