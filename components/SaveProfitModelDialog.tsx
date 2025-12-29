
import React, { useState } from 'react';

interface SaveProfitModelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { productName: string; asin: string; label: string; note?: string }, saveAsNew?: boolean, forceUpdateId?: string) => void;
    onCheckDuplicate?: (productName: string, label: string) => string | null; // 返回重复项 ID (null 表示无重复)
    initialProductName?: string;
    initialAsin?: string;
    initialLabel?: string;
    isUpdate?: boolean;
    existingProductNames?: string[];
}

const SaveProfitModelDialog: React.FC<SaveProfitModelDialogProps> = ({ isOpen, onClose, onSave, onCheckDuplicate, initialProductName = '', initialAsin = '', initialLabel = '', isUpdate: initialIsUpdate = false, existingProductNames = [] }) => {
    const [productName, setProductName] = useState(initialProductName);
    const [asin, setAsin] = useState(initialAsin);
    const [label, setLabel] = useState(initialLabel);
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // 重复检测状态
    const [duplicateId, setDuplicateId] = useState<string | null>(null);
    const isDuplicate = !!duplicateId;

    const [saveAsNew, setSaveAsNew] = useState(false);

    // 强制更新模式：当用户在 Create 模式下遇到 duplicate 并点击"更新该方案"时激活
    const [forceUpdateId, setForceUpdateId] = useState<string | null>(null);

    // 实际的 UI 显示模式：初始更新模式 OR 强制更新模式
    const isUpdateMode = (initialIsUpdate || !!forceUpdateId) && !saveAsNew;

    React.useEffect(() => {
        if (isOpen) {
            setProductName(initialProductName);
            setAsin(initialAsin);
            setLabel(initialLabel);
            setErrors({});
            setNote('');
            setDuplicateId(null);
            setSaveAsNew(false);
            setForceUpdateId(null);

            // 锁定 body 滚动，防止关闭时跳动
            document.body.style.overflow = 'hidden';
        } else {
            // 解锁滚动
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, initialProductName, initialAsin, initialLabel]);

    // Auto-modify label when switching to "Save as New" to avoid conflict
    React.useEffect(() => {
        if (saveAsNew) {
            // Append suffix if not already present
            if (!label.includes('(副本)')) {
                setLabel(prev => `${prev} (副本)`);
            }
        } else {
            // Optional: revert? No, might lose user changes. Keep it simple.
            // If they uncheck, they can manually edit back if they want.
            // Or we could revert if it strictly matches the suffixed version.
            if (label.endsWith(' (副本)')) {
                setLabel(prev => prev.replace(' (副本)', ''));
            }
        }
    }, [saveAsNew]);

    // 实时检测重复（延迟执行，避免打开时闪烁）
    React.useEffect(() => {
        if (!isOpen || !onCheckDuplicate) {
            setDuplicateId(null);
            return;
        }

        // 检测条件：当前是新增模式 (即 !isUpdateMode)
        // 如果已经是更新模式，就不需要检测了（因为意图明确）
        const shouldCheck = !isUpdateMode;

        // 延迟检测，避免对话框打开时闪烁
        const timer = setTimeout(() => {
            if (shouldCheck && productName && label) {
                const dupId = onCheckDuplicate(productName, label);
                setDuplicateId(dupId);
            } else {
                setDuplicateId(null);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [productName, label, isOpen, isUpdateMode, onCheckDuplicate]);

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
            }, saveAsNew, forceUpdateId || undefined);
        }
    };

    const handleClose = () => {
        onClose();
    };

    const handleSwitchToUpdate = () => {
        if (duplicateId) {
            setForceUpdateId(duplicateId);
            setDuplicateId(null); // Clear duplicate warning as we are now updating
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in zoom-in-95 duration-200">
                {/* 头部 */}
                <div className="p-6 border-b border-[#27272a] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${isUpdateMode ? 'bg-amber-600/10 border-amber-500/20' : 'bg-blue-600/10 border-blue-500/20'}`}>
                            <span className={`material-symbols-outlined text-2xl ${isUpdateMode ? 'text-amber-500' : 'text-blue-500'}`}>{isUpdateMode ? 'edit' : 'save'}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">{isUpdateMode ? '更新利润方案' : '保存利润方案'}</h2>
                            <p className={`text-xs font-bold uppercase tracking-wider mt-0.5 ${isUpdateMode ? 'text-amber-500/70' : 'text-zinc-500'}`}>{isUpdateMode ? '✏️ Update Existing' : '📝 Create New'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-5">
                    {/* 产品名称 */}
                    <div>
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                            产品名称 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="例如: 卫衣"
                                className={`w-full bg-[#111111] border ${errors.productName ? 'border-red-500' : 'border-[#27272a]'} rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all`}
                                list="product-names"
                            />
                            <datalist id="product-names">
                                {existingProductNames.map(name => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
                        </div>
                        {errors.productName && (
                            <p className="text-xs text-red-500 mt-1.5 font-bold">{errors.productName}</p>
                        )}
                    </div>

                    {/* ASIN */}
                    <div>
                        <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                            ASIN (可选)
                        </label>
                        <input
                            type="text"
                            value={asin}
                            onChange={(e) => setAsin(e.target.value)}
                            placeholder="例如: B0C1234567"
                            className="w-full bg-[#111111] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* 方案标签 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider">
                                方案标签 <span className="text-red-500">*</span>
                            </label>
                            <button
                                onClick={() => {
                                    if (productName) {
                                        const date = new Date();
                                        const autoLabel = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')} 测算`;
                                        setLabel(autoLabel);
                                        // Clear duplicate status if we auto-changed label
                                        if (duplicateId) setDuplicateId(null);
                                    }
                                }}
                                className="text-[10px] text-blue-500 hover:text-blue-400 font-bold flex items-center gap-1 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[12px]">auto_fix</span>
                                自动生成
                            </button>
                        </div>

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
                            placeholder="添加一些备注信息..."
                            rows={2}
                            className="w-full bg-[#111111] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all min-h-[80px] resize-none"
                        />
                    </div>

                    {/* 另存为选项 - 仅在初始更新模式(且非强制更新)显示 */}
                    {initialIsUpdate && !forceUpdateId && (
                        <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    id="saveAsNew"
                                    checked={saveAsNew}
                                    onChange={(e) => setSaveAsNew(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-zinc-600 bg-zinc-900 checked:border-blue-500 checked:bg-blue-600 transition-all"
                                />
                                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 pointer-events-none">
                                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                                </span>
                            </div>
                            <label htmlFor="saveAsNew" className="flex flex-col cursor-pointer select-none">
                                <span className="text-sm font-bold text-zinc-200">另存为新方案</span>
                                <span className="text-[10px] text-zinc-500">不覆盖当前记录，创建副本</span>
                            </label>
                        </div>
                    )}
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
                        className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-bold transition-all shadow-lg ${isUpdateMode ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
                    >
                        {isUpdateMode ? '更新方案' : '保存方案'}
                    </button>
                </div>
            </div>
        </div >
    );
};

export default SaveProfitModelDialog;
