
import React, { useState } from 'react';

interface SaveProfitModelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { productName: string; asin: string; label: string; note?: string }) => void;
    initialProductName?: string;
    initialAsin?: string;
    existingProductNames?: string[];
}

const SaveProfitModelDialog: React.FC<SaveProfitModelDialogProps> = ({ isOpen, onClose, onSave, initialProductName = '', initialAsin = '', existingProductNames = [] }) => {
    const [productName, setProductName] = useState(initialProductName);
    const [asin, setAsin] = useState(initialAsin);
    const [label, setLabel] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    React.useEffect(() => {
        if (isOpen) {
            setProductName(initialProductName);
            setAsin(initialAsin);
            setErrors({});
            setLabel('');
            setNote('');
        }
    }, [isOpen, initialProductName, initialAsin]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!productName.trim()) {
            newErrors.productName = '请输入产品名称';
        }

        if (!label.trim()) {
            newErrors.label = '请输入方案标签';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validate()) {
            onSave({
                productName: productName.trim(),
                asin: asin.trim().toUpperCase(),
                label: label.trim(),
                note: note.trim() || undefined
            });
            handleClose();
        }
    };

    const handleClose = () => {
        setProductName('');
        setAsin('');
        setLabel('');
        setNote('');
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
                {/* 头部 */}
                <div className="p-6 border-b border-[#27272a] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/10 p-2.5 rounded-xl border border-blue-500/20">
                            <span className="material-symbols-outlined text-blue-500 text-2xl">save</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">保存利润方案</h2>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Save Profit Model</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* 产品信息 - 仅在未预设时显示 */}
                    {!initialProductName && (
                        <div className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-blue-500 text-[18px]">inventory_2</span>
                                <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">产品信息</span>
                            </div>

                            <div>
                                <input
                                    type="text"
                                    list="product-name-suggestions"
                                    placeholder="输入产品名称"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    className={`w-full bg-[#18181b] border ${errors.productName ? 'border-rose-500 focus:border-rose-500' : 'border-[#27272a] focus:border-blue-500'} rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors`}
                                />
                                <datalist id="product-name-suggestions">
                                    {existingProductNames.map((name, i) => (
                                        <option key={i} value={name} />
                                    ))}
                                </datalist>
                                {errors.productName && <p className="text-rose-500 text-xs mt-1.5 ml-1">{errors.productName}</p>}
                            </div>
                        </div>
                    )}

                    {/* 如果已预设，显示只读信息 */}
                    {initialProductName && (
                        <div className="flex items-center gap-3 p-3 bg-blue-600/5 border border-blue-500/10 rounded-xl">
                            <span className="material-symbols-outlined text-blue-500">inventory_2</span>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-white">{initialProductName}</span>
                            </div>
                        </div>
                    )}

                    {/* 方案标签 */}
                    <div>
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                            方案标签 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="例如: 促销价 @ 19.99"
                            className={`w-full bg-[#111111] border ${errors.label ? 'border-red-500' : 'border-[#27272a]'} rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all`}
                            autoFocus
                        />
                        {errors.label && (
                            <p className="text-xs text-red-500 mt-1.5 font-bold">{errors.label}</p>
                        )}
                    </div>

                    {/* 备注 */}
                    <div>
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                            备注（可选）
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="添加额外说明..."
                            rows={2}
                            className="w-full bg-[#111111] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all resize-none"
                        />
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="p-6 border-t border-[#27272a] flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        保存方案
                    </button>
                </div>
            </div>
        </div >
    );
};

export default SaveProfitModelDialog;
