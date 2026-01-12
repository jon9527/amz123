import React, { useState, useCallback } from 'react';

export interface NumericInputProps {
    /** 默认值（非受控模式） */
    defaultValue?: number;
    /** 受控值 */
    value?: number;
    /** 值变化回调 */
    onChange?: (value: number) => void;
    /** 自定义类名 */
    className?: string;
    /** 最小值 */
    min?: number;
    /** 最大值 */
    max?: number;
    /** 步进值 */
    step?: number;
    /** 占位符 */
    placeholder?: string;
    /** 字体大小类名 */
    textSize?: string;
    /** 禁用状态 */
    disabled?: boolean;
    /** 用于重置非受控输入的key */
    inputKey?: string;
}

/**
 * 数字输入框组件
 * 支持受控和非受控两种模式，内置暗色主题样式
 */
const NumericInput: React.FC<NumericInputProps> = ({
    defaultValue = 0,
    value,
    onChange,
    className = '',
    min = 0,
    max,
    step,
    placeholder = '0',
    textSize = 'text-sm',
    disabled = false,
    inputKey,
}) => {
    // 非受控模式的本地状态
    const [localValue, setLocalValue] = useState<string>(defaultValue === 0 ? '' : String(defaultValue));

    // 判断是否为受控模式
    const isControlled = value !== undefined;
    const displayValue = isControlled ? (value === 0 ? '' : String(value)) : localValue;

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const raw = e.target.value;

            if (!isControlled) {
                setLocalValue(raw);
            }

            // 解析并通知父组件
            let parsed = parseFloat(raw);
            if (isNaN(parsed)) parsed = 0;
            if (parsed < min) parsed = min;
            if (max !== undefined && parsed > max) parsed = max;

            onChange?.(parsed);
        },
        [isControlled, onChange, min, max]
    );

    const handleBlur = useCallback(() => {
        // 在失焦时格式化显示值
        if (!isControlled) {
            const parsed = parseFloat(localValue);
            if (isNaN(parsed) || parsed === 0) {
                setLocalValue('');
            } else {
                setLocalValue(String(parsed));
            }
        }
    }, [isControlled, localValue]);

    return (
        <input
            key={inputKey}
            type="number"
            min={min}
            max={max}
            step={step}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={`
                bg-[#09090b] border border-[#27272a] rounded px-2 py-1.5 
                text-white font-mono ${textSize}
                focus:border-blue-500 focus:outline-none 
                disabled:opacity-50 disabled:cursor-not-allowed
                appearance-none 
                [&::-webkit-inner-spin-button]:appearance-auto 
                [&::-webkit-inner-spin-button]:opacity-100 
                [&::-webkit-inner-spin-button]:cursor-pointer 
                [&::-webkit-outer-spin-button]:appearance-auto 
                ${className}
            `}
            style={{ colorScheme: 'dark' }}
        />
    );
};

export default NumericInput;

