import React, { useState, useEffect } from 'react';

export interface NumberStepperProps {
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    decimals?: number;
    readOnly?: boolean;
    negative?: boolean; // 显示为红色（负数）
    className?: string;
}

/**
 * NumberStepper - 带增减按钮的数值输入组件
 * 
 * 特性:
 * - 支持小数位控制
 * - 支持最大最小值限制
 * - hover 时显示增减按钮
 * - 支持只读模式
 * - 支持负数红色显示
 */
const NumberStepper: React.FC<NumberStepperProps> = ({
    value, onChange, step = 1, min = -Infinity, max = Infinity, decimals = 0, readOnly = false, negative = false, className = ''
}) => {
    const [displayValue, setDisplayValue] = useState(value.toFixed(decimals));

    useEffect(() => {
        setDisplayValue(value.toFixed(decimals));
    }, [value, decimals]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDisplayValue(val);
    };

    const commitChange = () => {
        const num = parseFloat(displayValue);
        if (isNaN(num)) {
            setDisplayValue(value.toFixed(decimals));
        } else {
            const clamped = Math.max(min, Math.min(max, num));
            setDisplayValue(clamped.toFixed(decimals));
            if (clamped !== value) onChange(clamped);
        }
    };

    const handleBlur = () => {
        commitChange();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    const inc = () => onChange(Math.min(max, parseFloat((value + step).toFixed(decimals || 2))));
    const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(decimals || 2))));

    return (
        <div className={`relative group ${className}`}>
            <input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleInput}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                readOnly={readOnly}
                className={`w-full bg-zinc-800/50 border border-zinc-700 rounded-lg text-center font-mono font-bold py-0.5 text-xs focus:border-blue-500 outline-none transition-colors ${negative ? 'text-red-400' : 'text-white'} ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            />
            {!readOnly && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-zinc-900 rounded-r-lg border-l border-zinc-700 h-full justify-center">
                    <button
                        onClick={inc}
                        className="text-zinc-500 hover:text-white leading-none material-symbols-outlined text-[10px] h-1/2 flex items-center justify-center px-0.5 hover:bg-zinc-700/50 rounded-tr-lg"
                    >
                        expand_less
                    </button>
                    <button
                        onClick={dec}
                        className="text-zinc-500 hover:text-white leading-none material-symbols-outlined text-[10px] h-1/2 flex items-center justify-center px-0.5 hover:bg-zinc-700/50 rounded-br-lg"
                    >
                        expand_more
                    </button>
                </div>
            )}
        </div>
    );
};

export default NumberStepper;
