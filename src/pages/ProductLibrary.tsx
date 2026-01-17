import React, { useState, useMemo } from 'react';
import { ProductSpec } from '../types';
import { useProducts } from '../contexts/ProductContext';
import { getTagColor } from '../utils/tagColors';
import { Button } from '../components/ui';
import { PageShell } from '../components/page-layout';
import { ProductForm, ProductFormData } from '../components/product-library';
import { calculateFBAFeeFromProduct } from '../utils/fbaCalculator.utils';

// 空表单初始状态
const emptyForm: ProductFormData = {
    name: '',
    sku: '',
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    pcsPerBox: 0,
    // 整箱规格
    boxLength: 0,
    boxWidth: 0,
    boxHeight: 0,
    boxWeight: 0,
    // 成本
    unitCost: 0,
    defaultPrice: 0,
    asin: '',
    notes: '',
    tags: '',  // 逗号分隔的标签字符串
    category: 'standard',
    fbaFeeManual: 0,
    inboundPlacementMode: 'optimized',
    defaultStorageMonth: 'jan_sep',
    defaultInventoryAge: 0,
    // Fee Manual Overrides
    inboundPlacementFeeManual: 0,
    monthlyStorageFeeManual: 0,
    agedInventoryFeeManual: 0,
    removalFeeManual: 0,
    disposalFeeManual: 0,
    returnsProcessingFeeManual: 0,
};

type SortKey = 'name' | 'createdAt' | 'unitCost' | 'defaultPrice';
type SortDir = 'asc' | 'desc';

const ProductLibrary: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct } = useProducts();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [drawerProductId, setDrawerProductId] = useState<string | null>(null);
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [addTagProductId, setAddTagProductId] = useState<string | null>(null);
    const [tagDropdownPos, setTagDropdownPos] = useState<{ x: number, y: number } | null>(null);

    const drawerProduct = drawerProductId ? products.find(p => p.id === drawerProductId) : null;
    // const drawerParent = drawerProduct?.parentId ? products.find(p => p.id === drawerProduct.parentId) : null;

    // 收集所有唯一标签（只显示在用的）
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        products.forEach(p => {
            (p.tags || []).forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [products]);

    // 搜索、筛选和排序产品列表
    const sortedProducts = useMemo(() => {
        let filtered = products;

        // 搜索
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.sku.toLowerCase().includes(q) ||
                (p.asin || '').toLowerCase().includes(q)
            );
        }

        // 标签筛选
        if (filterTag) {
            filtered = filtered.filter(p => p.tags?.includes(filterTag));
        }

        return [...filtered].sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
            else if (sortKey === 'createdAt') cmp = a.createdAt - b.createdAt;
            else if (sortKey === 'unitCost') cmp = a.unitCost - b.unitCost;
            else if (sortKey === 'defaultPrice') cmp = a.defaultPrice - b.defaultPrice;
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [products, sortKey, sortDir, filterTag, searchQuery]);

    // 复制到剪贴板
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 1500);
    };

    // 导出CSV
    const exportCSV = () => {
        const headers = ['名称', 'SKU', 'ASIN', '类目', '长(cm)', '宽(cm)', '高(cm)', '重量(kg)', '装箱数', '采购价(¥)', '售价($)', 'FBA手动($)', '标签', '备注'];
        const rows = products.map(p => [
            p.name, p.sku, p.asin || '', p.category || 'standard', p.length, p.width, p.height, p.weight, p.pcsPerBox, p.unitCost, p.defaultPrice, p.fbaFeeManual || '', (p.tags || []).join(';'), p.notes || ''
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `产品库_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 确认删除
    const handleDelete = (id: string) => {
        deleteProduct(id);
        setDeleteConfirmId(null);
        if (drawerProductId === id) setDrawerProductId(null);
    };

    // Form state
    const [form, setForm] = useState({ ...emptyForm });

    const resetForm = () => {
        setForm({ ...emptyForm });
        setEditingId(null);
        setShowForm(false);
        setErrors([]);
    };

    const openAddForm = () => {
        setForm({ ...emptyForm });
        setEditingId(null);
        setErrors([]);
        setShowForm(true);
    };

    const validateForm = (): string[] => {
        const errs: string[] = [];
        if (!form.name.trim()) errs.push('产品名称');
        if (form.length <= 0) errs.push('长度');
        if (form.width <= 0) errs.push('宽度');
        if (form.height <= 0) errs.push('高度');
        if (form.weight <= 0) errs.push('重量');
        if (form.pcsPerBox <= 0) errs.push('装箱数');
        if (form.unitCost <= 0) errs.push('采购单价');
        if (form.defaultPrice <= 0) errs.push('默认售价');
        return errs;
    };

    const handleSubmit = () => {
        const errs = validateForm();
        if (errs.length > 0) {
            setErrors(errs);
            return;
        }

        const productData = {
            name: form.name,
            sku: form.sku,
            length: form.length,
            width: form.width,
            height: form.height,
            weight: form.weight,
            pcsPerBox: form.pcsPerBox,
            // 整箱规格
            boxLength: form.boxLength || 0,
            boxWidth: form.boxWidth || 0,
            boxHeight: form.boxHeight || 0,
            boxWeight: form.boxWeight || 0,
            // 成本
            unitCost: form.unitCost,
            defaultPrice: form.defaultPrice,
            asin: form.asin,
            notes: form.notes,
            tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(t => t) : [],
            // FBA Fields
            category: form.category || 'standard',
            fbaFeeManual: form.fbaFeeManual || 0,
            fbaFeeYear: 2026, // Updated to 2026
            inboundPlacementMode: form.inboundPlacementMode || 'optimized',
            defaultStorageMonth: form.defaultStorageMonth || 'jan_sep',
        };

        if (editingId) {
            updateProduct(editingId, productData);
        } else {
            addProduct(productData);
        }
        resetForm();
    };

    const handleEdit = (product: ProductSpec) => {
        setForm({
            name: product.name,
            sku: product.sku,
            length: product.length,
            width: product.width,
            height: product.height,
            weight: product.weight,
            pcsPerBox: product.pcsPerBox,
            // 整箱规格
            boxLength: product.boxLength || 0,
            boxWidth: product.boxWidth || 0,
            boxHeight: product.boxHeight || 0,
            boxWeight: product.boxWeight || 0,
            // 成本
            unitCost: product.unitCost,
            defaultPrice: product.defaultPrice,
            asin: product.asin || '',
            notes: product.notes || '',
            tags: (product.tags || []).join(', '),
            category: product.category || 'standard',
            fbaFeeManual: product.fbaFeeManual || 0,
            inboundPlacementMode: product.inboundPlacementMode || 'optimized',
            defaultStorageMonth: product.defaultStorageMonth || 'jan_sep',
            defaultInventoryAge: product.defaultInventoryAge || 0,
            // Fee Manual Overrides
            inboundPlacementFeeManual: product.inboundPlacementFeeManual || 0,
            monthlyStorageFeeManual: product.monthlyStorageFeeManual || 0,
            agedInventoryFeeManual: product.agedInventoryFeeManual || 0,
            removalFeeManual: product.removalFeeManual || 0,
            disposalFeeManual: product.disposalFeeManual || 0,
            returnsProcessingFeeManual: product.returnsProcessingFeeManual || 0,
        });
        setEditingId(product.id);
        setErrors([]);
        setShowForm(true);
    };

    // 生成测试产品
    const generateTestProducts = () => {
        const testProducts = [
            { name: '无线蓝牙耳机 Pro', sku: 'BT-HP-001', asin: 'B09TEST001', length: 18, width: 15, height: 8, weight: 0.35, pcsPerBox: 50, boxLength: 60, boxWidth: 45, boxHeight: 35, boxWeight: 19, unitCost: 45, defaultPrice: 29.99, tags: ['电子', '热卖'], category: 'standard' as const },
            { name: '多功能数据线套装', sku: 'CB-SET-002', asin: 'B09TEST002', length: 12, width: 10, height: 3, weight: 0.15, pcsPerBox: 100, boxLength: 55, boxWidth: 40, boxHeight: 30, boxWeight: 17, unitCost: 8, defaultPrice: 12.99, tags: ['配件'], category: 'standard' as const },
            { name: '智能手表保护壳', sku: 'WC-PRO-003', asin: 'B09TEST003', length: 6, width: 5, height: 2, weight: 0.05, pcsPerBox: 200, boxLength: 50, boxWidth: 35, boxHeight: 25, boxWeight: 12, unitCost: 3.5, defaultPrice: 8.99, tags: ['配件', '新品'], category: 'standard' as const },
            { name: '便携式充电宝 20000mAh', sku: 'PB-20K-004', asin: 'B09TEST004', length: 15, width: 8, height: 3, weight: 0.45, pcsPerBox: 30, boxLength: 50, boxWidth: 35, boxHeight: 20, boxWeight: 15, unitCost: 65, defaultPrice: 39.99, tags: ['电子', '热卖'], category: 'standard' as const },
            { name: '运动水壶 750ml', sku: 'WB-750-005', asin: 'B09TEST005', length: 25, width: 8, height: 8, weight: 0.25, pcsPerBox: 40, boxLength: 55, boxWidth: 45, boxHeight: 40, boxWeight: 12, unitCost: 12, defaultPrice: 18.99, tags: ['运动', '新品'], category: 'standard' as const },
        ];
        testProducts.forEach(p => addProduct(p));
    };

    return (
        <PageShell
            title="产品库"
            subtitle="管理产品规格，供其他模块引用"
            icon="inventory_2"
            useMaterialIcon
            maxWidth="full"
            actions={
                <>
                    {/* 搜索框 */}
                    {products.length > 0 && (
                        <div className="relative w-[200px]">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="🔍 搜索..."
                                className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}
                    <Button
                        variant="secondary"
                        onClick={exportCSV}
                        disabled={products.length === 0}
                    >
                        📥 导出CSV
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={generateTestProducts}
                    >
                        🧪 生成测试产品
                    </Button>
                    <Button onClick={openAddForm}>
                        <span className="text-lg">+</span> 添加产品
                    </Button>
                </>
            }
        >

            {/* 筛选栏：排序 + 标签 */}
            {products.length > 0 && (
                <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
                    {/* 排序 */}
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-500">排序:</span>
                        <select
                            value={sortKey}
                            onChange={(e) => setSortKey(e.target.value as SortKey)}
                            className="bg-[#18181b] border border-[#27272a] rounded-lg px-2 py-1 text-zinc-300"
                        >
                            <option value="createdAt">创建时间</option>
                            <option value="name">名称</option>
                            <option value="unitCost">采购价</option>
                            <option value="defaultPrice">售价</option>
                        </select>
                        <button
                            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                            className="px-2 py-1 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a]"
                        >
                            {sortDir === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>

                    {/* 分隔线 */}
                    <div className="w-px h-5 bg-zinc-700"></div>

                    {/* 标签筛选 */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-500">🏷️</span>
                        <button
                            onClick={() => setFilterTag(null)}
                            className={`text-xs px-2 py-1 rounded transition-colors ${!filterTag
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#18181b] text-zinc-400 hover:bg-[#27272a]'
                                }`}
                        >
                            全部
                        </button>
                        {allTags.map(tag => {
                            const color = getTagColor(tag);
                            return (
                                <button
                                    key={tag}
                                    onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                                    className={`text-xs px-2 py-1 rounded transition-colors ${filterTag === tag
                                        ? 'ring-2 ring-white ring-offset-1 ring-offset-[#09090b]'
                                        : ''
                                        } ${color.bg} ${color.text} ${color.hover}`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>

                    {/* 统计 */}
                    <span className="text-zinc-600 ml-auto">
                        {filterTag || searchQuery ? `${sortedProducts.length} / ${products.length}` : `${products.length} 个产品`}
                    </span>
                </div>
            )}

            {/* Form Modal - 使用抽取的 ProductForm 组件 */}
            <ProductForm
                isOpen={showForm}
                editingId={editingId}
                form={form}
                errors={errors}
                onFormChange={setForm}
                onSubmit={handleSubmit}
                onCancel={resetForm}
            />

            {/* Products Table */}
            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                    <span className="text-6xl mb-4">📦</span>
                    <p className="text-lg">暂无产品</p>
                    <p className="text-sm">点击"添加产品"开始创建</p>
                </div>
            ) : (
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm min-w-[1000px]">
                        <thead>
                            <tr className="bg-[#1f2937] text-zinc-400 text-left">
                                <th className="py-3 px-4 font-bold w-[120px]">产品 ID</th>
                                <th className="py-3 px-4 font-bold">产品名称</th>
                                <th className="py-3 px-4 font-bold">SKU</th>
                                <th className="py-3 px-4 font-bold">标签</th>
                                <th className="py-3 px-4 font-bold text-center">尺寸 (cm)</th>
                                <th className="py-3 px-4 font-bold text-center">重量 (kg)</th>
                                <th className="py-3 px-4 font-bold text-center">装箱</th>
                                <th className="py-3 px-4 font-bold text-center">采购价</th>
                                <th className="py-3 px-4 font-bold text-center">售价</th>
                                <th className="py-3 px-4 font-bold text-center">FBA (2026)</th>
                                <th className="py-3 px-4 font-bold text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedProducts.map((product, index) => (
                                <tr
                                    key={product.id}
                                    className={`border-t border-[#27272a] hover:bg-[#1a1a1d] transition-colors cursor-pointer ${index % 2 === 0 ? '' : 'bg-[#0f0f11]'}`}
                                    onClick={() => setDrawerProductId(product.id)}
                                >
                                    <td className="py-3 px-4 font-mono text-zinc-500 text-xs">
                                        {product.displayId || '—'}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-white">{product.name}</div>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-400 font-mono">{product.sku || '-'}</td>
                                    <td className="py-3 px-4 w-[300px]" onClick={(e) => e.stopPropagation()}>
                                        {/* 标签：强制Grid布局，每行4个 */}
                                        <div className="grid grid-cols-4 gap-1">
                                            {product.tags && product.tags.map((tag, i) => {
                                                const color = getTagColor(tag);
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`group flex items-center gap-0.5 text-xs px-1 py-0.5 rounded ${color.bg} ${color.text} ${color.hover} min-w-0`}
                                                        title={tag}
                                                    >
                                                        <span className="truncate flex-1 text-center">{tag}</span>
                                                        <button
                                                            className="opacity-60 hover:opacity-100 hover:text-red-400 font-bold flex-shrink-0"
                                                            onClick={() => {
                                                                const newTags = product.tags!.filter((_, idx) => idx !== i);
                                                                updateProduct(product.id, { tags: newTags });
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                            {/* 快速添加标签 */}
                                            <button
                                                onClick={(e) => {
                                                    if (addTagProductId === product.id) {
                                                        setAddTagProductId(null);
                                                        setTagDropdownPos(null);
                                                    } else {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setTagDropdownPos({ x: rect.left, y: rect.bottom + 4 });
                                                        setAddTagProductId(product.id);
                                                    }
                                                }}
                                                className="w-full h-5 text-xs rounded bg-zinc-700/50 hover:bg-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono text-zinc-300">
                                        {product.length}×{product.width}×{product.height}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono text-zinc-300">{product.weight}</td>
                                    <td className="py-3 px-4 text-center font-mono text-zinc-300">{product.pcsPerBox}</td>
                                    <td className="py-3 px-4 text-center font-mono text-orange-400">¥{product.unitCost}</td>
                                    <td className="py-3 px-4 text-center font-mono text-green-400">${product.defaultPrice}</td>
                                    <td className="py-3 px-4 text-center font-mono">
                                        <div className="flex flex-col items-center">
                                            {/* 优先显示手动费用 */}
                                            {product.fbaFeeManual && product.fbaFeeManual > 0 ? (
                                                <span className="text-orange-500 font-bold" title="手动锁定费用">${product.fbaFeeManual}</span>
                                            ) : (
                                                <span className="text-zinc-400" title="系统自动计算 (2026)">
                                                    ${calculateFBAFeeFromProduct(product).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs"
                                                title="编辑"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirmId(product.id)}
                                                className="px-2 py-1 rounded bg-red-900/50 hover:bg-red-800 text-xs"
                                                title="删除"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 删除确认弹窗 */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 w-[320px]">
                        <div className="text-center mb-4">
                            <span className="text-4xl">⚠️</span>
                            <h3 className="text-lg font-bold mt-2">确认删除？</h3>
                            <p className="text-zinc-400 text-sm mt-1">
                                删除后无法恢复，确定要删除<br />
                                <strong>{products.find(p => p.id === deleteConfirmId)?.name}</strong> 吗？
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-bold"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold"
                            >
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 标签选择器弹窗 */}
            {addTagProductId && tagDropdownPos && (() => {
                const targetProduct = products.find(p => p.id === addTagProductId);
                const availableTags = allTags.filter(t => !(targetProduct?.tags || []).includes(t));
                return (
                    <>
                        {/* 透明遮罩用于点击关闭 */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => { setAddTagProductId(null); setTagDropdownPos(null); }}
                        />
                        {/* 下拉框 */}
                        <div
                            className="fixed z-50 bg-[#1f1f23] border border-[#3f3f46] rounded-lg shadow-2xl w-[200px] overflow-hidden"
                            style={{ left: tagDropdownPos.x, top: tagDropdownPos.y }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 搜索框 */}
                            <div className="p-2 border-b border-[#3f3f46]">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="搜索或创建..."
                                    className="w-full bg-transparent border-none text-sm text-white placeholder:text-zinc-500 focus:outline-none"
                                    id="tag-search-input"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const newTag = e.currentTarget.value.trim();
                                            if (newTag && targetProduct && !(targetProduct.tags || []).includes(newTag)) {
                                                updateProduct(targetProduct.id, { tags: [...(targetProduct.tags || []), newTag] });
                                            }
                                            setAddTagProductId(null);
                                            setTagDropdownPos(null);
                                        } else if (e.key === 'Escape') {
                                            setAddTagProductId(null);
                                            setTagDropdownPos(null);
                                        }
                                    }}
                                    onChange={(e) => {
                                        const list = document.getElementById('tag-options-list');
                                        if (list) {
                                            const query = e.target.value.toLowerCase();
                                            Array.from(list.children).forEach((child) => {
                                                const text = child.textContent?.toLowerCase() || '';
                                                (child as HTMLElement).style.display = text.includes(query) ? 'flex' : 'none';
                                            });
                                        }
                                    }}
                                />
                            </div>

                            {/* 标签列表 */}
                            <div id="tag-options-list" className="max-h-48 overflow-auto p-1">
                                {availableTags.length > 0 ? (
                                    availableTags.map((tag) => {
                                        const color = getTagColor(tag);
                                        return (
                                            <button
                                                key={tag}
                                                onClick={() => {
                                                    if (targetProduct) {
                                                        updateProduct(targetProduct.id, { tags: [...(targetProduct.tags || []), tag] });
                                                    }
                                                    setAddTagProductId(null);
                                                    setTagDropdownPos(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#3f3f46] transition-colors text-left"
                                            >
                                                <span className={`text-sm px-2 py-0.5 rounded ${color.bg} ${color.text}`}>
                                                    {tag}
                                                </span>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="text-center text-zinc-500 text-xs py-3">
                                        输入后按回车创建
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                );
            })()}

            {/* 右侧抽屉详情 */}
            {drawerProduct && (
                <>
                    {/* 遮罩层 */}
                    <div
                        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
                        onClick={() => setDrawerProductId(null)}
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
                        <div className="sticky top-0 bg-[#18181b] border-b border-[#27272a] p-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold">产品详情</h2>
                            <button
                                onClick={() => setDrawerProductId(null)}
                                className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        {/* 复制成功提示 */}
                        {copiedText && (
                            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg">
                                ✓ 已复制: {copiedText}
                            </div>
                        )}

                        {/* 抽屉内容 */}
                        <div className="p-4 space-y-6">
                            {/* 产品名称 */}
                            <div>
                                <div className="text-2xl font-black">{drawerProduct.name}</div>
                                {drawerProduct.asin && (
                                    <div className="text-blue-400 font-mono mt-1">{drawerProduct.asin}</div>
                                )}
                                <div className="text-zinc-500 text-sm mt-1">SKU: {drawerProduct.sku || '-'}</div>
                                {drawerProduct.tags && drawerProduct.tags.length > 0 && (
                                    <div className="flex gap-1 flex-wrap mt-2">
                                        {drawerProduct.tags.map((tag, i) => (
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
                                        onClick={() => copyToClipboard(`${drawerProduct.length}x${drawerProduct.width}x${drawerProduct.height}`, '尺寸(cm)')}
                                    >
                                        <div className="text-zinc-500">尺寸 (cm)</div>
                                        <div className="font-mono text-lg">{drawerProduct.length}×{drawerProduct.width}×{drawerProduct.height}</div>
                                    </div>
                                    <div
                                        className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                        onClick={() => copyToClipboard(`${(drawerProduct.length / 2.54).toFixed(1)}x${(drawerProduct.width / 2.54).toFixed(1)}x${(drawerProduct.height / 2.54).toFixed(1)}`, '尺寸(inch)')}
                                    >
                                        <div className="text-zinc-500">尺寸 (inch)</div>
                                        <div className="font-mono text-lg text-zinc-400">
                                            {(drawerProduct.length / 2.54).toFixed(1)}×{(drawerProduct.width / 2.54).toFixed(1)}×{(drawerProduct.height / 2.54).toFixed(1)}
                                        </div>
                                    </div>
                                    <div
                                        className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                        onClick={() => copyToClipboard(String(drawerProduct.weight), '重量(kg)')}
                                    >
                                        <div className="text-zinc-500">重量 (kg)</div>
                                        <div className="font-mono text-lg">{drawerProduct.weight}</div>
                                    </div>
                                    <div
                                        className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                        onClick={() => copyToClipboard((drawerProduct.weight * 2.205).toFixed(1), '重量(lb)')}
                                    >
                                        <div className="text-zinc-500">重量 (lb)</div>
                                        <div className="font-mono text-lg text-zinc-400">{(drawerProduct.weight * 2.205).toFixed(1)}</div>
                                    </div>
                                    <div
                                        className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                        onClick={() => copyToClipboard(((drawerProduct.length * drawerProduct.width * drawerProduct.height) / 1000000).toFixed(4), '体积(CBM)')}
                                    >
                                        <div className="text-zinc-500">体积 (CBM)</div>
                                        <div className="font-mono text-lg">
                                            {((drawerProduct.length * drawerProduct.width * drawerProduct.height) / 1000000).toFixed(4)}
                                        </div>
                                    </div>
                                    <div
                                        className="cursor-pointer hover:bg-[#27272a] p-2 rounded-lg transition-colors"
                                        onClick={() => copyToClipboard(String(drawerProduct.pcsPerBox), '装箱数')}
                                    >
                                        <div className="text-zinc-500">装箱数</div>
                                        <div className="font-mono text-lg">{drawerProduct.pcsPerBox} pcs</div>
                                    </div>
                                </div>
                            </div>

                            {/* 价格成本 */}
                            <div className="bg-[#0f0f11] rounded-xl p-4 space-y-3">
                                <div className="text-sm font-bold text-zinc-400 border-b border-[#27272a] pb-2">💰 价格成本</div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <div className="text-zinc-500">采购单价</div>
                                        <div className="font-mono text-xl text-orange-400">¥{drawerProduct.unitCost}</div>
                                    </div>
                                    <div>
                                        <div className="text-zinc-500">默认售价</div>
                                        <div className="font-mono text-xl text-green-400">${drawerProduct.defaultPrice}</div>
                                    </div>
                                </div>
                            </div>

                            {/* 备注 */}
                            {drawerProduct.notes && (
                                <div className="bg-[#0f0f11] rounded-xl p-4">
                                    <div className="text-sm font-bold text-zinc-400 border-b border-[#27272a] pb-2 mb-2">📝 备注</div>
                                    <div className="text-zinc-300 text-sm whitespace-pre-wrap">{drawerProduct.notes}</div>
                                </div>
                            )}

                            {/* 时间信息 */}
                            <div className="text-xs text-zinc-500 space-y-1">
                                <div>创建时间: {new Date(drawerProduct.createdAt).toLocaleString()}</div>
                                <div>更新时间: {new Date(drawerProduct.updatedAt).toLocaleString()}</div>
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex gap-3 pt-4 border-t border-[#27272a]">
                                <button
                                    onClick={() => { handleEdit(drawerProduct); setDrawerProductId(null); }}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold"
                                >
                                    ✏️ 编辑
                                </button>
                                <button
                                    onClick={() => { setDeleteConfirmId(drawerProduct.id); setDrawerProductId(null); }}
                                    className="flex-1 py-2 bg-red-900/50 hover:bg-red-800 rounded-lg font-bold"
                                >
                                    🗑️ 删除
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </PageShell>
    );
};

export default ProductLibrary;

