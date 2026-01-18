import React, { useState } from 'react';
import { ProductSpec } from '../../types';

interface ProductDetailDrawerProps {
    product: ProductSpec | null;
    onClose: () => void;
    onEdit: (product: ProductSpec) => void;
    onDelete: (productId: string) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
    product,
    onClose,
    onEdit,
    onDelete,
}) => {
    const [copiedText, setCopiedText] = useState<string | null>(null);

    if (!product) return null;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedText(label);
            setTimeout(() => setCopiedText(null), 2000);
        });
    };

    return (
        <>
            {/* 遮罩层 */}
            <div
                className="fixed inset-0 bg-black/40 z-40 transition-opacity"
                onClick={onClose}
            />
            {/* 抽屉面板 */}
            <div className="fixed right-0 top-0 h-full w-[400px] bg-[#18181b] border-l border-[#27272a] z-50 shadow-2xl overflow-auto animate-slide-in">
                <style>{`
                    @keyframes slideIn {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                    .animate-slide-in { animation: slideIn 0.2s ease-out; }
                `}</style>

                {/* 抽屉头部 */}
                <div className="sticky top-0 bg-[#18181b] border-b border-[#27272a] p-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold">产品详情</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300"
                    >
                        ✕
                    </button>
                </div>

                {/* 复制成功提示 */}
                {copiedText && (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg z-20">
                        ✓ 已复制: {copiedText}
                    </div>
                )}

                {/* 抽屉内容 */}
                <div className="p-4 space-y-6">
                    {/* 产品名称 */}
                    <div>
                        <div className="text-2xl font-black">{product.name}</div>
                        {product.asin && (
                            <div className="text-blue-400 font-mono mt-1">{product.asin}</div>
                        )}
                        <div className="text-zinc-500 text-sm mt-1">SKU: {product.sku || '-'}</div>
                        {product.tags && product.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-2">
                                {product.tags.map((tag, i) => (
                                    <span key={i} className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 尺寸规格 */}
                    <div className="bg-[#0f0f11] rounded-xl p-4 space-y-3">
                        <div className="text-sm font-bold text-zinc-400 border-b border-[#27272a] pb-2">📐 尺寸规格 <span className="text-xs font-normal">(点击复制)</span></div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div
                                className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                onClick={() => copyToClipboard(`${product.length}x${product.width}x${product.height}`, '尺寸(cm)')}
                            >
                                <div className="text-zinc-500">尺寸 (cm)</div>
                                <div className="font-mono text-lg">{product.length}×{product.width}×{product.height}</div>
                            </div>
                            <div
                                className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                onClick={() => copyToClipboard(`${(product.length / 2.54).toFixed(1)}x${(product.width / 2.54).toFixed(1)}x${(product.height / 2.54).toFixed(1)}`, '尺寸(inch)')}
                            >
                                <div className="text-zinc-500">尺寸 (inch)</div>
                                <div className="font-mono text-lg text-zinc-400">
                                    {(product.length / 2.54).toFixed(1)}×{(product.width / 2.54).toFixed(1)}×{(product.height / 2.54).toFixed(1)}
                                </div>
                            </div>
                            <div
                                className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                onClick={() => copyToClipboard(String(product.weight), '重量(kg)')}
                            >
                                <div className="text-zinc-500">重量 (kg)</div>
                                <div className="font-mono text-lg">{product.weight}</div>
                            </div>
                            <div
                                className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                onClick={() => copyToClipboard((product.weight * 2.205).toFixed(1), '重量(lb)')}
                            >
                                <div className="text-zinc-500">重量 (lb)</div>
                                <div className="font-mono text-lg text-zinc-400">{(product.weight * 2.205).toFixed(1)}</div>
                            </div>
                            <div
                                className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                onClick={() => copyToClipboard(((product.length * product.width * product.height) / 1000000).toFixed(4), '体积(CBM)')}
                            >
                                <div className="text-zinc-500">体积 (CBM)</div>
                                <div className="font-mono text-lg">
                                    {((product.length * product.width * product.height) / 1000000).toFixed(4)}
                                </div>
                            </div>
                            <div
                                className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                onClick={() => copyToClipboard(String(product.pcsPerBox), '装箱数')}
                            >
                                <div className="text-zinc-500">装箱数</div>
                                <div className="font-mono text-lg">{product.pcsPerBox} pcs</div>
                            </div>
                        </div>
                    </div>

                    {/* 价格成本 */}
                    <div className="bg-[#0f0f11] rounded-xl p-4 space-y-3">
                        <div className="text-sm font-bold text-zinc-400 border-b border-[#27272a] pb-2">💰 价格成本</div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-zinc-500">采购单价</div>
                                <div className="font-mono text-xl text-orange-400">¥{product.unitCost}</div>
                            </div>
                            <div>
                                <div className="text-zinc-500">默认售价</div>
                                <div className="font-mono text-xl text-green-400">${product.defaultPrice}</div>
                            </div>
                        </div>
                    </div>

                    {/* 备注 */}
                    {product.notes && (
                        <div className="bg-[#0f0f11] rounded-xl p-4">
                            <div className="text-sm font-bold text-zinc-400 border-b border-[#27272a] pb-2 mb-2">📝 备注</div>
                            <div className="text-zinc-300 text-sm whitespace-pre-wrap">{product.notes}</div>
                        </div>
                    )}

                    {/* 时间信息 */}
                    {product.createdAt && (
                        <div className="text-xs text-zinc-500 space-y-1">
                            <div>创建时间: {new Date(product.createdAt).toLocaleString()}</div>
                            {product.updatedAt && <div>更新时间: {new Date(product.updatedAt).toLocaleString()}</div>}
                        </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-3 pt-4 border-t border-[#27272a]">
                        <button
                            onClick={() => onEdit(product)}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white flex items-center justify-center gap-2"
                        >
                            ✏️ 编辑
                        </button>
                        <button
                            onClick={() => onDelete(product.id)}
                            className="flex-1 py-2 bg-red-900/50 hover:bg-red-800 rounded-lg font-bold text-red-100 flex items-center justify-center gap-2"
                        >
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
