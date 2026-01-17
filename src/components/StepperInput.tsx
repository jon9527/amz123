import React, { useState, useEffect } from 'react';
import { r2 } from '../utils/formatters';

// Shared style constants
const INPUT_H = "h-[24px]";
const CONTAINER_CLASS = `w-full bg-[#0d0d0f] border border-[#27272a] rounded-lg flex items-center justify-center relative transition-all focus-within:border-zinc-500 overflow-hidden group`;
const INPUT_CLASS = "bg-transparent border-none text-[11px] font-black text-white text-center w-full h-full outline-none focus:ring-0 p-0 font-mono leading-none";

interface StepperInputProps {
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    disabled?: boolean;
    color?: 'white' | 'blue' | 'emerald';
    height?: 'compact' | 'normal' | 'large';
}

/**
 * Shared StepperInput component with +/- buttons
 * Used in ProfitCalculator and PromotionDeduction
 */
const StepperInput: React.FC<StepperInputProps> = ({
    value,
    onChange,
    step = 1,
    min = 0,
    max,
    disabled = false,
    color = 'white',
    height = 'compact'
}) => {
    const [displayValue, setDisplayValue] = useState<string>(value.toString());

    useEffect(() => {
        const parsed = parseFloat(displayValue);
        if (parsed !== value && !isNaN(parsed)) {
            setDisplayValue(value.toString());
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        let val = e.target.value;
        if (val === '') { setDisplayValue(''); onChange(min); return; }
        if (!/^\d*\.?\d*$/.test(val)) return;
        setDisplayValue(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
            let next = Math.max(min, num);
            if (max !== undefined) next = Math.min(max, next);
            onChange(next);
        }
    };

    const handleBlur = () => {
        if (disabled) return;
        if (displayValue === '' || isNaN(parseFloat(displayValue))) {
            setDisplayValue(min.toString()); onChange(min);
        } else {
            let num = parseFloat(displayValue);
            num = Math.max(min, num);
            if (max !== undefined) num = Math.min(max, num);
            setDisplayValue(num.toString());
            onChange(num);
        }
    };

    const textColorClass = disabled
        ? 'text-zinc-500'
        : color === 'emerald'
            ? 'text-emerald-500'
            : color === 'blue'
                ? 'text-blue-400'
                : 'text-white';

    const heightClass = height === 'large' ? 'h-8' : height === 'normal' ? 'h-[32px]' : INPUT_H;
    const disabledClass = disabled ? 'bg-zinc-900/50 border-zinc-800 cursor-not-allowed opacity-30' : '';

    return (
        <div className={`${CONTAINER_CLASS} ${heightClass} ${disabledClass}`}>
            <input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                className={`${INPUT_CLASS} ${textColorClass} disabled:cursor-not-allowed`}
            />
            {!disabled && (
                <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none pr-1 bg-[#0d0d0f]">
                    <button
                        onClick={() => {
                            let next = r2(value + step);
                            if (max !== undefined) next = Math.min(max, next);
                            onChange(next);
                            setDisplayValue(next.toString());
                        }}
                        className="pointer-events-auto material-symbols-outlined text-[14px] text-zinc-600 hover:text-zinc-300 leading-none block h-3"
                    >
                        expand_less
                    </button>
                    <button
                        onClick={() => { const next = r2(Math.max(min, value - step)); onChange(next); setDisplayValue(next.toString()); }}
                        className="pointer-events-auto material-symbols-outlined text-[14px] text-zinc-600 hover:text-zinc-300 leading-none block h-3"
                    >
                        expand_more
                    </button>
                </div>
            )}
        </div>
    );
};

export default StepperInput;
