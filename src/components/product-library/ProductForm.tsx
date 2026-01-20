import React, { useMemo, useState, useEffect } from 'react';
import { calculateAllProductFees, AllProductFees, getTierLabel } from '../../utils/fbaCalculator.utils';

interface ProductFormData {
    name: string;
    sku: string;
    length: number;
    width: number;
    height: number;
    weight: number;
    pcsPerBox: number;
    // 整箱规格
    boxLength: number;
    boxWidth: number;
    boxHeight: number;
    boxWeight: number;
    // 成本
    unitCost: number;
    defaultPrice: number;
    asin: string;
    notes: string;
    tags: string;
    // FBA Configuration
    category: 'standard' | 'apparel';
    displayType: 'standard' | 'apparel' | 'multi' | 'single';
    fbaFeeManual: number;
    inboundPlacementMode: 'minimal' | 'partial' | 'optimized';
    defaultStorageMonth: 'jan_sep' | 'oct_dec';
    defaultInventoryAge: number;
    // Fee Manual Overrides
    inboundPlacementFeeManual: number;
    monthlyStorageFeeManual: number;
    agedInventoryFeeManual: number;
    removalFeeManual: number;
    disposalFeeManual: number;
    returnsProcessingFeeManual: number;
}

interface ProductFormProps {
    isOpen: boolean;
    editingId: string | null;
    form: ProductFormData;
    errors: string[];
    onFormChange: (form: ProductFormData) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

const inputClass = 'w-full bg-white text-zinc-800 border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
const labelClass = 'text-xs text-zinc-500 font-bold uppercase mb-1';

// 数字输入封装，解决无法输入 '0.' 的问题
const NumberInput: React.FC<{
    value: number | undefined;
    onChange: (val: number) => void;
    className?: string;
    placeholder?: string;
    step?: string;
    min?: number;
}> = ({ value, onChange, className, placeholder, step, min }) => {
    // 0 或 undefined 显示为空字符串
    const [localVal, setLocalVal] = useState(value === 0 || !value ? '' : String(value));

    useEffect(() => {
        const parsed = parseFloat(localVal);
        const propVal = value || 0;

        // 当外部属性变化且与当前输入不一致时才更新
        // 避免打断用户输入 '0.' 或 '.0' 等中间状态
        if (parsed !== propVal) {
            // 特殊处理：如果prop是0且本地是空，视为一致（因为我们把0显示为空）
            if (isNaN(parsed) && propVal === 0 && localVal === '') return;
            // 如果数值相等但格式不同（如 0 vs 0.），不更新
            if (!isNaN(parsed) && propVal === parsed) return;

            setLocalVal(propVal === 0 ? '' : String(propVal));
        }
    }, [value]);

    return (
        <input
            type="number"
            step={step}
            value={localVal}
            onChange={(e) => {
                const v = e.target.value;
                setLocalVal(v);
                const num = parseFloat(v);
                onChange(isNaN(num) ? 0 : num);
            }}
            placeholder={placeholder}
            className={className}
            min={min}
            autoComplete="off"
            onWheel={(e) => e.currentTarget.blur()} // 防止滚动修改数值
        />
    );
};

export const ProductForm: React.FC<ProductFormProps> = ({
    isOpen,
    editingId,
    form,
    errors,
    onFormChange,
    onSubmit,
    onCancel,
}) => {
    // Track FBA panel expanded state
    const [showFbaDetails, setShowFbaDetails] = useState(false);

    // Real-time calculation of ALL FBA Fees
    const allFees = useMemo<AllProductFees | null>(() => {
        if (!form.length || !form.width || !form.height || !form.weight) return null;
        return calculateAllProductFees(
            { length: form.length, width: form.width, height: form.height, weight: form.weight },
            {
                category: form.category,
                price: form.defaultPrice || 20,
                placementMode: form.inboundPlacementMode || 'optimized',
                storageMonth: form.defaultStorageMonth || 'jan_sep',
                inventoryDays: form.defaultInventoryAge || 0,
            }
        );
    }, [form.length, form.width, form.height, form.weight, form.category, form.defaultPrice, form.inboundPlacementMode, form.defaultStorageMonth, form.defaultInventoryAge]);

    const systemFbaFee = allFees?.fbaShippingFee || 0;

    if (!isOpen) return null;

    const setField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
        onFormChange({ ...form, [key]: value });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 w-[560px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-3">{editingId ? '编辑产品' : '添加新产品'}</h2>

                {/* 错误提示 */}
                {errors.length > 0 && (
                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-2 mb-3 flex items-center gap-2">
                        <span className="text-red-400 text-xs font-bold whitespace-nowrap">⚠️ 必填未完:</span>
                        <span className="text-red-300 text-xs truncate" title={errors.join('、')}>{errors.join('、')}</span>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                        <div>
                            <div className={labelClass}>产品名称 *</div>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setField('name', e.target.value)}
                                placeholder="产品名称"
                                className={`${inputClass} ${errors.includes('产品名称') ? 'border-red-500' : ''}`}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <div className={labelClass}>SKU</div>
                            <input
                                type="text"
                                value={form.sku}
                                onChange={(e) => onFormChange({ ...form, sku: e.target.value })}
                                className={inputClass}
                                placeholder="请输入SKU"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className={labelClass}>ASIN (可选)</div>
                            <input
                                type="text"
                                value={form.asin}
                                onChange={(e) => onFormChange({ ...form, asin: e.target.value })}
                                className={inputClass}
                                placeholder="请输入ASIN"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <div className={labelClass}>产品类目 (影响FBA) *</div>
                            <select
                                value={form.category}
                                onChange={(e) => {
                                    const newCategory = e.target.value as 'standard' | 'apparel';
                                    const updates: Partial<ProductFormData> = { category: newCategory };



                                    onFormChange({ ...form, ...updates });
                                }}
                                className={inputClass}
                            >
                                <option value="standard">标准 (Standard)</option>
                                <option value="apparel">服装 (Apparel)</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-2">
                        <div className="text-[10px] text-zinc-500 mb-1.5">单品规格</div>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <div className={labelClass}>长 (cm)</div>
                                <NumberInput
                                    value={form.length}
                                    onChange={(val) => setField('length', val)}
                                    placeholder="0"
                                    className={`${inputClass} ${errors.includes('长度') ? 'border-red-500' : ''}`}
                                />
                            </div>
                            <div>
                                <div className={labelClass}>宽 (cm)</div>
                                <NumberInput
                                    value={form.width}
                                    onChange={(val) => setField('width', val)}
                                    placeholder="0"
                                    className={`${inputClass} ${errors.includes('宽度') ? 'border-red-500' : ''}`}
                                />
                            </div>
                            <div>
                                <div className={labelClass}>高 (cm)</div>
                                <NumberInput
                                    value={form.height}
                                    onChange={(val) => setField('height', val)}
                                    placeholder="0"
                                    className={`${inputClass} ${errors.includes('高度') ? 'border-red-500' : ''}`}
                                />
                            </div>
                            <div>
                                <div className={labelClass}>重量 (kg)</div>
                                <NumberInput
                                    value={form.weight}
                                    onChange={(val) => setField('weight', val)}
                                    placeholder="0"
                                    className={`${inputClass} ${errors.includes('重量') ? 'border-red-500' : ''}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 整箱规格 */}
                    <div className="pt-2">
                        <div className="text-[10px] text-zinc-500 mb-1.5">整箱规格 (头程计算)</div>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <div className={labelClass}>箱长 (cm)</div>
                                <NumberInput
                                    value={form.boxLength}
                                    onChange={(val) => setField('boxLength', val)}
                                    placeholder="0"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <div className={labelClass}>箱宽 (cm)</div>
                                <NumberInput
                                    value={form.boxWidth}
                                    onChange={(val) => setField('boxWidth', val)}
                                    placeholder="0"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <div className={labelClass}>箱高 (cm)</div>
                                <NumberInput
                                    value={form.boxHeight}
                                    onChange={(val) => setField('boxHeight', val)}
                                    placeholder="0"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <div className={labelClass}>整箱毛重 (kg)</div>
                                <NumberInput
                                    value={form.boxWeight}
                                    onChange={(val) => setField('boxWeight', val)}
                                    placeholder="0"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>

                    {/* FBA Fee Config Panel */}
                    <div className="bg-[#0f0f11] rounded-lg p-2.5 border border-[#27272a]">
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setShowFbaDetails(!showFbaDetails)}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-zinc-400">FBA 费用 (2026)</span>
                                {allFees && (
                                    <span className="text-[9px] text-zinc-500 border border-zinc-700 rounded px-1 py-0.5">
                                        {getTierLabel(allFees.tier)}
                                    </span>
                                )}
                                <span className="text-[9px] text-zinc-500 border border-zinc-700 rounded px-1 py-0.5">
                                    {form.category === 'apparel' ? '服装' : '标准'}
                                </span>
                            </div>
                            <span className="text-zinc-500 text-[10px]">{showFbaDetails ? '▲' : '▼'}</span>
                        </div>

                        {/* Core FBA Shipping Fee - 手动优先 */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex items-center justify-between bg-[#18181b] border border-[#27272a] rounded px-2 py-1.5">
                                <span className="text-[10px] text-zinc-500">系统</span>
                                <span className="text-xs text-zinc-400 font-mono">${systemFbaFee.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-[#18181b] border border-[#27272a] rounded px-2 py-1.5">
                                <span className="text-[10px] text-zinc-500">手动</span>
                                <NumberInput
                                    step="0.01"
                                    value={form.fbaFeeManual}
                                    onChange={(val) => setField('fbaFeeManual', val)}
                                    placeholder="-"
                                    className="bg-transparent border-none text-xs text-orange-400 font-bold font-mono text-right flex-1 focus:ring-0 p-0 w-12 placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        {/* Expanded Fee Details */}
                        {showFbaDetails && allFees && (
                            <div className="mt-2 space-y-2">
                                {/* Config Row */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    <select
                                        value={form.inboundPlacementMode || 'optimized'}
                                        onChange={(e) => setField('inboundPlacementMode', e.target.value as 'minimal' | 'partial' | 'optimized')}
                                        className="bg-[#18181b] border border-[#27272a] text-[10px] rounded px-1.5 py-1 text-zinc-300"
                                    >
                                        <option value="optimized">优化配送</option>
                                        <option value="minimal">最少配送</option>
                                        <option value="partial">部分配送</option>
                                    </select>
                                    <select
                                        value={form.defaultStorageMonth || 'jan_sep'}
                                        onChange={(e) => setField('defaultStorageMonth', e.target.value as 'jan_sep' | 'oct_dec')}
                                        className="bg-[#18181b] border border-[#27272a] text-[10px] rounded px-1.5 py-1 text-zinc-300"
                                    >
                                        <option value="jan_sep">仓储 1-9月</option>
                                        <option value="oct_dec">仓储 10-12月</option>
                                    </select>
                                    <NumberInput
                                        value={form.defaultInventoryAge}
                                        onChange={(val) => setField('defaultInventoryAge', Math.floor(val))}
                                        placeholder="库龄"
                                        className="bg-[#18181b] border border-[#27272a] text-[10px] rounded px-1.5 py-1 text-zinc-300 text-center"
                                    />
                                </div>

                                {/* Fee Grid - 2 columns, read-only */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                                    {[
                                        { label: '入库配置服务费', val: allFees.inboundPlacementFee },
                                        { label: '月仓储费', val: allFees.monthlyStorageFee },
                                        { label: '库龄附加费', val: allFees.agedInventoryFee },
                                        { label: '移除订单费', val: allFees.removalFee },
                                        { label: '弃置订单费', val: allFees.disposalFee },
                                        { label: '退货处理费', val: allFees.returnsProcessingFee },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-center justify-between text-zinc-500 py-0.5">
                                            <span>{item.label}</span>
                                            <span className="font-mono text-zinc-400">${item.val.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <div className={labelClass}>装箱数 *</div>
                            <NumberInput
                                value={form.pcsPerBox}
                                onChange={(val) => setField('pcsPerBox', Math.floor(val))}
                                placeholder="0"
                                className={`${inputClass} ${errors.includes('装箱数') ? 'border-red-500' : ''}`}
                            />
                        </div>
                        <div>
                            <div className={labelClass}>采购单价 (¥) *</div>
                            <NumberInput
                                value={form.unitCost}
                                onChange={(val) => setField('unitCost', val)}
                                placeholder="0"
                                className={`${inputClass} ${errors.includes('采购单价') ? 'border-red-500' : ''}`}
                            />
                        </div>
                        <div>
                            <div className={labelClass}>默认售价 ($) *</div>
                            <NumberInput
                                step="0.01"
                                value={form.defaultPrice}
                                onChange={(val) => setField('defaultPrice', val)}
                                placeholder="0"
                                className={`${inputClass} ${errors.includes('默认售价') ? 'border-red-500' : ''}`}
                            />
                        </div>
                    </div>

                    <div>
                        <div className={labelClass}>标签 (选填)</div>
                        <div className="flex items-center gap-2 flex-wrap bg-white border border-zinc-300 rounded-lg px-3 py-2 min-h-[38px]">
                            {form.tags && form.tags.split(',').map(t => t.trim()).filter(t => t).map((tag, i) => (
                                <span
                                    key={i}
                                    className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-red-100 hover:text-red-700"
                                    onClick={() => {
                                        const tags = form.tags.split(',').map(t => t.trim()).filter(t => t);
                                        tags.splice(i, 1);
                                        setField('tags', tags.join(', '));
                                    }}
                                >
                                    {tag} ×
                                </span>
                            ))}
                            <input
                                type="text"
                                placeholder={form.tags ? "" : "输入标签按回车..."}
                                className="text-sm bg-transparent border-none p-0 focus:ring-0 flex-1 min-w-[60px]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const input = e.currentTarget;
                                        const newTag = input.value.trim();
                                        if (newTag) {
                                            const existingTags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(t => t) : [];
                                            if (!existingTags.includes(newTag)) {
                                                setField('tags', [...existingTags, newTag].join(', '));
                                            }
                                            input.value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className={labelClass}>备注</div>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={(e) => setField('notes', e.target.value)}
                            placeholder="备注信息..."
                            className={inputClass}
                        />
                    </div>
                </div>

                <div className="flex gap-4 mt-8">
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-bold text-sm text-zinc-200">
                        取消
                    </button>
                    <button onClick={onSubmit} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-sm text-white">
                        {editingId ? '保存修改' : '添加产品'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export type { ProductFormData };
