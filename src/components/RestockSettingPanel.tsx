import React from 'react';
import { RestockSetting } from '../types';

interface RestockSettingPanelProps {
    productId: string;
    productName?: string;
    setting: Partial<RestockSetting> | null;
    onUpdate: (updates: Partial<RestockSetting>) => void;
    onCreate: () => void;
}

// Simple number input with unit label
const SettingInput: React.FC<{
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit: string;
}> = ({ value, onChange, min = 0, max = 999, step = 1, unit }) => (
    <div className="flex items-center gap-2">
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
            min={min}
            max={max}
            step={step}
            className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white font-mono text-center focus:border-blue-500 outline-none"
        />
        <span className="text-xs text-zinc-500">{unit}</span>
    </div>
);

/**
 * 补货设置面板
 */
export const RestockSettingPanel: React.FC<RestockSettingPanelProps> = ({
    productId,
    productName,
    setting,
    onUpdate,
    onCreate,
}) => {
    const bufferDays = setting?.bufferDays ?? 7;
    const safetyStockDays = setting?.safetyStockDays ?? 7;
    const targetTurnoverDays = setting?.targetTurnoverDays ?? 30;
    const minOrderQty = setting?.minOrderQty ?? 100;

    const hasExistingSetting = setting?.id != null;

    return (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">⚙️</span>
                    <h3 className="font-bold text-white">补货设置</h3>
                    {productName && (
                        <span className="text-xs text-zinc-500 ml-2">({productName})</span>
                    )}
                </div>
                {!hasExistingSetting && productId && (
                    <button
                        onClick={onCreate}
                        className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold"
                    >
                        保存设置
                    </button>
                )}
            </div>

            {!productId ? (
                <div className="text-center text-zinc-500 py-4">
                    请先选择产品
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-bold">备货天数</label>
                        <SettingInput value={bufferDays} onChange={(v) => onUpdate({ bufferDays: v })} min={0} max={90} unit="天" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-bold">安全库存</label>
                        <SettingInput value={safetyStockDays} onChange={(v) => onUpdate({ safetyStockDays: v })} min={0} max={60} unit="天" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-bold">目标周转</label>
                        <SettingInput value={targetTurnoverDays} onChange={(v) => onUpdate({ targetTurnoverDays: v })} min={7} max={180} step={7} unit="天" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-400 font-bold">最小起订</label>
                        <SettingInput value={minOrderQty} onChange={(v) => onUpdate({ minOrderQty: v })} min={1} max={99999} step={50} unit="件" />
                    </div>
                </div>
            )}

            {hasExistingSetting && (
                <div className="text-xs text-zinc-600 text-center pt-2 border-t border-zinc-800">
                    ✓ 设置自动保存
                </div>
            )}
        </div>
    );
};

export default RestockSettingPanel;

