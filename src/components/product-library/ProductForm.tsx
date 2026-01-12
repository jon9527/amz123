import React from 'react';

interface ProductFormData {
    name: string;
    sku: string;
    length: number;
    width: number;
    height: number;
    weight: number;
    pcsPerBox: number;
    unitCost: number;
    defaultPrice: number;
    asin: string;
    notes: string;
    tags: string;
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

export const ProductForm: React.FC<ProductFormProps> = ({
    isOpen,
    editingId,
    form,
    errors,
    onFormChange,
    onSubmit,
    onCancel,
}) => {
    if (!isOpen) return null;

    const setField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
        onFormChange({ ...form, [key]: value });
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 w-[480px] max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">{editingId ? '编辑产品' : '添加新产品'}</h2>

                {/* 错误提示 */}
                {errors.length > 0 && (
                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4">
                        <div className="text-red-400 text-sm font-bold mb-1">⚠️ 请填写以下必填项：</div>
                        <div className="text-red-300 text-sm">{errors.join('、')}</div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className={labelClass}>产品名称 *</div>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setField('name', e.target.value)}
                                placeholder="例: 硅胶手机壳"
                                className={`${inputClass} ${errors.includes('产品名称') ? 'border-red-500' : ''}`}
                            />
                        </div>
                        <div>
                            <div className={labelClass}>SKU</div>
                            <input
                                type="text"
                                value={form.sku}
                                onChange={(e) => setField('sku', e.target.value)}
                                placeholder="例: SJK-001"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <div className={labelClass}>ASIN (可选)</div>
                        <input
                            type="text"
                            value={form.asin}
                            onChange={(e) => setField('asin', e.target.value)}
                            placeholder="B0XXXXXXXXX"
                            className={inputClass}
                        />
                    </div>

                    <div className="border-t border-[#27272a] pt-4">
                        <div className="text-sm font-bold text-zinc-400 mb-3">📐 包装规格 *</div>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <div className={labelClass}>长 (cm)</div>
                                <input
                                    type="number"
                                    value={form.length || ''}
                                    onChange={(e) => setField('length', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className={`${inputClass} ${errors.includes('长度') ? 'border-red-500' : ''}`}
                                />
                            </div>
                            <div>
                                <div className={labelClass}>宽 (cm)</div>
                                <input
                                    type="number"
                                    value={form.width || ''}
                                    onChange={(e) => setField('width', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className={`${inputClass} ${errors.includes('宽度') ? 'border-red-500' : ''}`}
                                />
                            </div>
                            <div>
                                <div className={labelClass}>高 (cm)</div>
                                <input
                                    type="number"
                                    value={form.height || ''}
                                    onChange={(e) => setField('height', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className={`${inputClass} ${errors.includes('高度') ? 'border-red-500' : ''}`}
                                />
                            </div>
                            <div>
                                <div className={labelClass}>重量 (kg)</div>
                                <input
                                    type="number"
                                    value={form.weight || ''}
                                    onChange={(e) => setField('weight', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className={`${inputClass} ${errors.includes('重量') ? 'border-red-500' : ''}`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <div className={labelClass}>装箱数 *</div>
                            <input
                                type="number"
                                value={form.pcsPerBox || ''}
                                onChange={(e) => setField('pcsPerBox', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className={`${inputClass} ${errors.includes('装箱数') ? 'border-red-500' : ''}`}
                            />
                        </div>
                        <div>
                            <div className={labelClass}>采购单价 (¥) *</div>
                            <input
                                type="number"
                                value={form.unitCost || ''}
                                onChange={(e) => setField('unitCost', parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className={`${inputClass} ${errors.includes('采购单价') ? 'border-red-500' : ''}`}
                            />
                        </div>
                        <div>
                            <div className={labelClass}>默认售价 ($) *</div>
                            <input
                                type="number"
                                step="0.01"
                                value={form.defaultPrice || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    onFormChange({
                                        ...form,
                                        defaultPrice: parseFloat(val) || 0,
                                        tags: val
                                    });
                                }}
                                placeholder="0"
                                className={`${inputClass} ${errors.includes('默认售价') ? 'border-red-500' : ''}`}
                            />
                        </div>
                    </div>

                    <div>
                        <div className={labelClass}>标签</div>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {form.tags && form.tags.split(',').map(t => t.trim()).filter(t => t).map((tag, i) => (
                                <span
                                    key={i}
                                    className="group flex items-center gap-1 text-sm px-2 py-1 bg-blue-900/50 text-blue-300 rounded cursor-pointer hover:bg-blue-800/50"
                                    onClick={() => {
                                        const tags = form.tags.split(',').map(t => t.trim()).filter(t => t);
                                        tags.splice(i, 1);
                                        setField('tags', tags.join(', '));
                                    }}
                                >
                                    {tag}
                                    <span className="text-blue-400 group-hover:text-red-400">×</span>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            placeholder="输入标签后按回车添加..."
                            className={inputClass}
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

                    <div>
                        <div className={labelClass}>备注</div>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setField('notes', e.target.value)}
                            placeholder="产品备注信息..."
                            className={inputClass + ' h-20 resize-none'}
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel} className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-bold">
                        取消
                    </button>
                    <button onClick={onSubmit} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold">
                        {editingId ? '保存修改' : '添加产品'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export type { ProductFormData };
