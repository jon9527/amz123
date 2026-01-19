import React, { useState, useMemo } from 'react';
import { ProductSpec } from '../types';
import { useProducts } from '../contexts/ProductContext';
import { getTagColor } from '../utils/tagColors';
import { Button } from '../components/ui';
import { PageShell } from '../components/page-layout';
import { ProductForm, ProductFormData, SkuCsvImporter, SkuTreeTable, ProductDetailDrawer } from '../components/product-library';
import { calculateSalesWeights } from '../utils/salesWeightCalculator';
import { calculateFBAFeeFromProduct } from '../utils/fbaCalculator.utils';
import { SkuParentGroup, SkuItem } from '../types/skuTypes';

// 适配器：将 SkuParentGroup 转换为 ProductSpec 以复用详情抽屉
const mapGroupToProduct = (group: SkuParentGroup): ProductSpec => ({
    id: group.parentAsin,
    name: group.品名,
    sku: group.款号,
    asin: group.parentAsin,
    length: group.length || 0,
    width: group.width || 0,
    height: group.height || 0,
    weight: group.weight || 0,
    boxLength: group.boxLength || 0,
    boxWidth: group.boxWidth || 0,
    boxHeight: group.boxHeight || 0,
    boxWeight: group.boxWeight || 0,
    pcsPerBox: group.pcsPerBox || 0,
    unitCost: group.unitCost || 0,
    defaultPrice: group.defaultPrice || 0,
    tags: group.tags ? group.tags.split(' ').filter(t => t.trim()) : [],
    notes: group.notes,
    imageUrl: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fbaFeeManual: group.fbaFeeManual || 0,
    category: group.category || 'apparel',
    inboundPlacementMode: group.inboundPlacementMode || 'optimized',
    defaultStorageMonth: group.defaultStorageMonth || 'jan_sep',
    defaultInventoryAge: group.defaultInventoryAge || 0,
    displayType: group.displayType,
});

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
    displayType: 'standard',
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
    const [drawerProduct, setDrawerProduct] = useState<ProductSpec | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [addTagProductId, setAddTagProductId] = useState<string | null>(null);
    const [editingSkuParentAsin, setEditingSkuParentAsin] = useState<string | null>(null);

    // 服装SKU相关状态
    const [showSkuImporter, setShowSkuImporter] = useState(false);
    const [skuGroups, setSkuGroups] = useState<SkuParentGroup[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sku_groups_data');
            try {
                return saved ? JSON.parse(saved) : [];
            } catch (e) {
                console.error('Failed to load SKU groups', e);
                return [];
            }
        }
        return [];
    });

    // 监听 skuGroups 变化并保存到本地存储
    React.useEffect(() => {
        localStorage.setItem('sku_groups_data', JSON.stringify(skuGroups));
    }, [skuGroups]);

    type DisplayMode = 'products' | 'standard' | 'apparel' | 'multi' | 'single';
    const [displayMode, setDisplayMode] = useState<DisplayMode>('products');
    // SKU展开状态
    const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
    const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());
    const [tagDropdownPos, setTagDropdownPos] = useState<{ x: number, y: number } | null>(null);


    // const drawerParent = drawerProduct?.parentId ? products.find(p => p.id === drawerProduct.parentId) : null;

    // 收集所有唯一标签（只显示在用的）
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        products.forEach(p => {
            (p.tags || []).forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }, [products]);

    // 计算占比显示的辅助函数
    const formatPercent = (val: number | undefined) => {
        if (typeof val !== 'number') return '-';
        return `${(val * 100).toFixed(1)}%`;
    };

    const getSalesInfoTooltip = (item: SkuItem) => {
        if (!item.salesInfo) return '';
        const { colorSales, sizeSales, totalSales } = item.salesInfo;
        return `Color Sales: ${colorSales}\nSize Sales: ${sizeSales}\nTotal: ${totalSales}`;
    };

    // 搜索、筛选和排序产品列表
    const sortedProducts = useMemo(() => {
        let filtered = products;

        // 搜索
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.sku && p.sku.toLowerCase().includes(q))
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

    // SKU展开控制函数
    const toggleSkuParent = (parentAsin: string) => {
        setExpandedParents(prev => {
            const next = new Set(prev);
            next.has(parentAsin) ? next.delete(parentAsin) : next.add(parentAsin);
            return next;
        });
    };

    const toggleSkuColor = (parentAsin: string, color: string) => {
        const key = `${parentAsin}-${color}`;
        setExpandedColors(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const expandAllSku = () => {
        setExpandedParents(new Set(skuGroups.map(g => g.parentAsin)));
        const allColors = new Set<string>();
        skuGroups.forEach(g => g.colorGroups.forEach(cg => allColors.add(`${g.parentAsin}-${cg.color}`)));
        setExpandedColors(allColors);
    };

    const collapseAllSku = () => {
        setExpandedParents(new Set());
        setExpandedColors(new Set());
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
        // 尝试从 products 中删除
        const isProduct = products.some(p => p.id === id);
        if (isProduct) {
            deleteProduct(id);
        } else {
            // 尝试从 skuGroups 中删除
            setSkuGroups(prev => {
                const updated = prev.filter(g => g.parentAsin !== id);
                localStorage.setItem('skuGroups', JSON.stringify(updated));
                return updated;
            });
        }

        setDeleteConfirmId(null);
        if (drawerProduct?.id === id || (drawerProduct && 'parentAsin' in drawerProduct && drawerProduct.parentAsin === id)) {
            setDrawerProduct(null);
        }
    };

    // 更新SkuGroup属性（如标签）
    const updateSkuGroup = (parentAsin: string, updates: Partial<SkuParentGroup>) => {
        setSkuGroups(prev => {
            const updated = prev.map(g =>
                g.parentAsin === parentAsin ? { ...g, ...updates } : g
            );
            localStorage.setItem('skuGroups', JSON.stringify(updated));
            return updated;
        });
    };

    // 为SkuGroup添加标签
    const addTagToSkuGroup = (parentAsin: string, tag: string) => {
        const group = skuGroups.find(g => g.parentAsin === parentAsin);
        if (group) {
            const currentTags = group.tags ? group.tags.split(',').filter(t => t.trim()) : [];
            if (!currentTags.includes(tag)) {
                const newTags = [...currentTags, tag].join(',');
                updateSkuGroup(parentAsin, { tags: newTags });
            }
        }
        setAddTagProductId(null);
        setTagDropdownPos(null);
    };

    // Form state
    const [form, setForm] = useState({ ...emptyForm });

    const resetForm = () => {
        setForm({ ...emptyForm });
        setEditingId(null);
        setEditingSkuParentAsin(null);
        setShowForm(false);
        setErrors([]);
    };

    const handleEditSkuGroup = (group: SkuParentGroup) => {
        setEditingSkuParentAsin(group.parentAsin);
        setForm({
            ...emptyForm,
            name: group.品名,
            sku: group.款号,
            asin: group.parentAsin,
            // 扩展属性
            length: group.length || 0,
            width: group.width || 0,
            height: group.height || 0,
            weight: group.weight || 0,
            boxLength: group.boxLength || 0,
            boxWidth: group.boxWidth || 0,
            boxHeight: group.boxHeight || 0,
            boxWeight: group.boxWeight || 0,
            pcsPerBox: group.pcsPerBox || 0,
            unitCost: group.unitCost || 0,
            defaultPrice: group.defaultPrice || 0,
            tags: group.tags || '',
            notes: group.notes || '',
            category: group.category || 'apparel',
            fbaFeeManual: group.fbaFeeManual || 0,
            inboundPlacementMode: group.inboundPlacementMode || 'optimized',
            defaultStorageMonth: group.defaultStorageMonth || 'jan_sep',
            defaultInventoryAge: group.defaultInventoryAge || 0,
        });
        setShowForm(true);
    };

    const handleSkuGroupClick = (group: SkuParentGroup) => {
        setDrawerProduct(mapGroupToProduct(group));
    };

    const handleDrawerEdit = (product: ProductSpec) => {
        const group = skuGroups.find(g => g.parentAsin === product.id);
        if (group) {
            handleEditSkuGroup(group);
            setDrawerProduct(null);
        } else {
            handleEdit(product);
            setDrawerProduct(null);
        }
    };

    const handleDrawerDelete = (productId: string) => {
        const isProduct = products.some(p => p.id === productId);
        if (isProduct) {
            setDeleteConfirmId(productId);
            setDrawerProduct(null);
        }
    };

    const handleImportSalesWeights = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);
        try {
            const updatedGroups = await calculateSalesWeights(files, skuGroups);
            setSkuGroups(updatedGroups);
            alert(`权重计算完成！已更新 ${updatedGroups.length} 个父体数据。`);
        } catch (err) {
            console.error(err);
            alert('计算失败，请检查文件格式。');
        }
        e.target.value = '';
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

        // 处理SKU组编辑保存 (父体维度)
        if (editingSkuParentAsin) {
            const updatedGroups = skuGroups.map(group => {
                if (group.parentAsin === editingSkuParentAsin) {
                    return {
                        ...group,
                        ...form, // 扩展属性直接覆盖
                        品名: form.name,
                        款号: form.sku,
                        parentAsin: form.asin || group.parentAsin, // 允许修改ASIN
                    };
                }
                return group;
            });
            setSkuGroups(updatedGroups);
            resetForm();
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
            inboundPlacementMode: form.inboundPlacementMode || 'optimized',
            defaultStorageMonth: form.defaultStorageMonth || 'jan_sep',
            displayType: form.displayType || 'standard',
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
            displayType: product.displayType || 'standard',
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
        // 生成后自动切换到产品库Tab
        setDisplayMode('products');
    };

    // 辅助函数：获取显示类型
    const getDisplayType = (item: SkuParentGroup | ProductSpec): 'standard' | 'apparel' | 'multi' | 'single' => {
        if (item.displayType) return item.displayType;

        // 判断是否为 SkuParentGroup (有 parentAsin)
        if ('parentAsin' in item) {
            const group = item as SkuParentGroup;
            if (group.productType === 'apparel') return 'apparel';
            if (group.variantType === 'multi') return 'multi';
            // 单变体逻辑：必须 sku 数量 > 1 或者是显式标记
            if (group.variantType === 'single' && group.totalSkuCount > 1) return 'single';
            return 'standard';
        }

        // ProductSpec
        const product = item as ProductSpec;
        if (product.category === 'apparel') return 'apparel';
        return 'standard';
    };

    // 辅助函数：将 ProductSpec 转换为 SkuParentGroup 以兼容 SkuTreeTable
    const mapProductToGroup = (p: ProductSpec): SkuParentGroup => {
        // 构造虚拟 SkuItem
        const dummyItem: SkuItem = {
            id: p.id,
            简称: p.name,
            店铺: '',
            款号: p.sku,
            父ASIN: p.id,
            ASIN: p.asin,
            SKU: p.sku,
            MSKU: p.sku,
            品名: p.name,
            Color: '',
            颜色: '',
            尺码: '',
            运营: '',
            salesWeight: 1,
            salesInfo: { colorSales: 0, sizeSales: 0, totalSales: 0 }
        };

        return {
            parentAsin: p.id,
            款号: p.sku,
            品名: p.name,
            简称: p.name,
            店铺: '',
            运营: '',
            colorGroups: [{
                color: 'default',
                颜色: 'default',
                items: [dummyItem]
            }],
            totalSkuCount: 1,
            isExpanded: false,
            length: p.length,
            width: p.width,
            height: p.height,
            weight: p.weight,
            boxLength: p.boxLength || 0,
            boxWidth: p.boxWidth || 0,
            boxHeight: p.boxHeight || 0,
            boxWeight: p.boxWeight || 0,
            pcsPerBox: p.pcsPerBox,
            unitCost: p.unitCost,
            defaultPrice: p.defaultPrice,
            tags: (p.tags || []).join(','),
            notes: p.notes,
            category: p.category,
            fbaFeeManual: p.fbaFeeManual,
            inboundPlacementMode: p.inboundPlacementMode,
            defaultStorageMonth: p.defaultStorageMonth,
            defaultInventoryAge: p.defaultInventoryAge,
            displayType: p.displayType,
        };
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
                    <Button
                        variant="secondary"
                        onClick={() => setShowSkuImporter(true)}
                    >
                        📂 导入服装SKU
                    </Button>

                    <Button onClick={openAddForm}>
                        <span className="text-lg">+</span> 添加产品
                    </Button>
                </>
            }
        >
            {/* 服装SKU导入弹窗 */}
            <SkuCsvImporter
                isOpen={showSkuImporter}
                onClose={() => setShowSkuImporter(false)}
                onImport={(groups, rawItems) => {
                    // 累加而非覆盖：合并新旧数据
                    setSkuGroups(prev => {
                        // 根据parentAsin去重或合并
                        const existingAsins = new Set(prev.map(g => g.parentAsin));
                        const newGroups = groups.filter(g => !existingAsins.has(g.parentAsin));
                        const merged = [...prev, ...newGroups];
                        localStorage.setItem('skuGroups', JSON.stringify(merged));
                        return merged;
                    });
                    // 上传后切换到产品库Tab显示
                    setDisplayMode('products');
                }}
            />

            {/* 显示模式切换 - 始终显示 */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                <button
                    onClick={() => setDisplayMode('products')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${displayMode === 'products'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                        }`}
                >
                    📦 产品库 ({skuGroups.length + products.length})
                </button>

                {/* SKU 分类 Tabs - 始终显示 */}
                <div className="w-px h-6 bg-zinc-700 mx-1"></div>

                <button
                    onClick={() => setDisplayMode('standard')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${displayMode === 'standard'
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                        }`}
                >
                    📦 标品 ({
                        skuGroups.filter(g => getDisplayType(g) === 'standard').length +
                        products.filter(p => getDisplayType(p) === 'standard').length
                    })
                </button>

                <button
                    onClick={() => setDisplayMode('apparel')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${displayMode === 'apparel'
                        ? 'bg-purple-600 text-white'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                        }`}
                >
                    👕 服装 ({
                        skuGroups.filter(g => getDisplayType(g) === 'apparel').length +
                        products.filter(p => getDisplayType(p) === 'apparel').length
                    })
                </button>

                <button
                    onClick={() => setDisplayMode('multi')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${displayMode === 'multi'
                        ? 'bg-orange-600 text-white'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                        }`}
                >
                    🧩 多变体 ({
                        skuGroups.filter(g => getDisplayType(g) === 'multi').length +
                        products.filter(p => getDisplayType(p) === 'multi').length
                    })
                </button>

                <button
                    onClick={() => setDisplayMode('single')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${displayMode === 'single'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                        }`}
                >
                    🔢 单变体 ({
                        skuGroups.filter(g => getDisplayType(g) === 'single').length +
                        products.filter(p => getDisplayType(p) === 'single').length
                    })
                </button>

                <div className="ml-auto flex items-center gap-2">
                    {/* 计算权重按钮 - 仅在服装、多变体、单变体Tab显示 */}
                    {['apparel', 'multi', 'single'].includes(displayMode) && (
                        <label className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-[#18181b] border border-[#27272a] hover:bg-[#27272a] cursor-pointer text-zinc-400">
                            <span className="text-orange-400">📊</span>
                            <span>计算权重</span>
                            <input
                                type="file"
                                multiple
                                accept=".csv"
                                className="hidden"
                                onChange={handleImportSalesWeights}
                            />
                        </label>
                    )}

                    {/* 统一的清空产品库按钮 - 始终显示 */}
                    {(skuGroups.length > 0 || products.length > 0) && (
                        <button
                            onClick={() => {
                                if (window.confirm('确定要清空所有产品数据吗？此操作不可恢复！')) {
                                    // 清空skuGroups
                                    setSkuGroups([]);
                                    localStorage.removeItem('skuGroups');
                                    // 清空products
                                    [...products].forEach(p => deleteProduct(p.id));
                                    // 回到产品库Tab
                                    setDisplayMode('products');
                                }
                            }}
                            className="px-3 py-1.5 rounded-lg text-sm bg-red-900/50 hover:bg-red-800 text-red-300 whitespace-nowrap"
                        >
                            清空产品库
                        </button>
                    )}
                </div>
            </div>

            {/* 筛选栏：排序 + 标签（产品库）/ 统计 + 展开按钮（服装SKU） */}
            <div className="flex items-center gap-4 mb-4 text-sm flex-wrap min-h-[36px]">
                {displayMode === 'products' && (
                    <>
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
                        <span className="text-zinc-600 ml-auto">
                            {filterTag || searchQuery ? `${sortedProducts.length} / ${products.length}` : `${products.length} 个产品`}
                        </span>
                    </>
                )}
                {displayMode !== 'products' && (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">当前视角:</span>
                            <span className="text-zinc-300 font-bold">
                                {displayMode === 'standard' && '标品 (单SKU)'}
                                {displayMode === 'apparel' && '服装 (颜色+尺码)'}
                                {displayMode === 'multi' && '多变体 (非服装)'}
                                {displayMode === 'single' && '单变体 (单属性)'}
                            </span>
                        </div>
                        <div className="w-px h-5 bg-zinc-700"></div>
                        <button
                            onClick={() => {
                                import('react').then(React => {
                                    React.startTransition(() => {
                                        expandedParents.size > 0 ? collapseAllSku() : expandAllSku();
                                    });
                                });
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-[#18181b] border border-[#27272a] rounded-lg hover:bg-[#27272a] text-zinc-400"
                        >
                            <span className={`transition-transform ${expandedParents.size > 0 ? 'rotate-90' : ''}`}>▶</span>
                            {expandedParents.size > 0 ? '全部收起' : '全部展开'}
                        </button>

                    </>
                )}
            </div>

            {/* Form Modal - 使用抽取的 ProductForm 组件 */}
            <ProductForm
                isOpen={showForm}
                editingId={editingId || editingSkuParentAsin}
                form={form}
                errors={errors}
                onFormChange={setForm}
                onSubmit={handleSubmit}
                onCancel={resetForm}
            />

            {/* SKU树形表格 (只在非产品库Tab显示) */}
            {displayMode !== 'products' && (
                <SkuTreeTable
                    groups={[...skuGroups, ...products.map(mapProductToGroup)].filter(g => getDisplayType(g) === displayMode)}
                    searchQuery={searchQuery}
                    expandedParents={expandedParents}
                    expandedColors={expandedColors}
                    onToggleParent={toggleSkuParent}
                    onToggleColor={toggleSkuColor}
                    onEditGroup={(group) => {
                        // 尝试在 products 中查找
                        const product = products.find(p => p.id === group.parentAsin);
                        if (product) {
                            handleEdit(product);
                        } else {
                            handleEditSkuGroup(group);
                        }
                    }}
                    onGroupClick={(group) => {
                        handleSkuGroupClick(group);
                    }}
                    displayMode={displayMode}
                />
            )}
            {/* 产品库表格 - 始终显示完整UI（包括空表格） */}
            {displayMode === 'products' && (
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
                    <table className="w-full text-sm table-fixed">
                        <thead>
                            <tr className="bg-[#1f2937] text-zinc-400 text-left text-xs">
                                <th className="py-3 px-2 font-bold w-[17%]">产品名称</th>
                                <th className="py-3 px-2 font-bold w-[14%]">SKU</th>
                                <th className="py-3 px-2 font-bold w-[5%] text-center">尺码</th>
                                <th className="py-3 px-2 font-bold w-[6%]">类目</th>
                                <th className="py-3 px-2 font-bold w-[12%]">标签</th>
                                <th className="py-3 px-2 font-bold text-center w-[8%]">尺寸 (cm)</th>
                                <th className="py-3 px-2 font-bold text-center w-[5%] whitespace-nowrap">重量 (kg)</th>
                                <th className="py-3 px-2 font-bold text-center w-[5%]">装箱</th>
                                <th className="py-3 px-2 font-bold text-center w-[5%]">采购价</th>
                                <th className="py-3 px-2 font-bold text-center w-[5%]">售价</th>
                                <th className="py-3 px-2 font-bold text-center w-[8%]">FBA (2026)</th>
                                <th className="py-3 px-2 font-bold text-center w-[6%]">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* 显示导入的skuGroups (以父体为维度) */}
                            {skuGroups.map((group, groupIndex) => {
                                const isExpanded = expandedParents.has(group.parentAsin);
                                const isVariant = group.totalSkuCount > 1;
                                // 将tags字符串转为数组
                                const groupTags = group.tags ? group.tags.split(',').filter(t => t.trim()) : [];

                                return (
                                    <React.Fragment key={group.parentAsin}>
                                        {/* 父体行 */}
                                        <tr
                                            className={`border-t border-[#27272a] hover:bg-[#1a1a1d] transition-colors cursor-pointer ${groupIndex % 2 === 0 ? '' : 'bg-[#0f0f11]'}`}
                                            onClick={() => handleSkuGroupClick(group)}
                                        >
                                            <td className="py-3 px-2">
                                                <div className="flex items-start gap-2">
                                                    <span
                                                        className={`text-zinc-500 transition-transform text-xs mt-0.5 ${isExpanded ? 'rotate-90' : ''} ${!isVariant ? 'invisible' : ''}`}
                                                        onClick={(e) => {
                                                            if (isVariant) {
                                                                e.stopPropagation();
                                                                toggleSkuParent(group.parentAsin);
                                                            }
                                                        }}
                                                    >▶</span>
                                                    <span className="font-bold text-white break-words">{group.品名}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-zinc-400 font-mono break-all">{group.款号 || '-'}</td>
                                            <td className="py-3 px-2 text-center text-zinc-500">-</td>
                                            <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                                                {/* 产品类型：4个选项 */}
                                                <select
                                                    value={group.displayType || (
                                                        group.productType === 'apparel' ? 'apparel' :
                                                            group.variantType === 'multi' ? 'multi' :
                                                                group.variantType === 'single' ? 'single' :
                                                                    'standard'
                                                    )}
                                                    onChange={(e) => {
                                                        const val = e.target.value as 'standard' | 'apparel' | 'multi' | 'single';
                                                        updateSkuGroup(group.parentAsin, { displayType: val });
                                                    }}
                                                    className="bg-transparent border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500 focus:outline-none focus:border-blue-500 cursor-pointer w-full text-ellipsis"
                                                >
                                                    <option value="standard">标品</option>
                                                    <option value="apparel">服装</option>
                                                    <option value="multi">多变体</option>
                                                    <option value="single">单变体</option>
                                                </select>
                                            </td>
                                            <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                                                {/* 标签：Flex布局 */}
                                                <div className="flex flex-wrap gap-1">
                                                    {groupTags.map((tag, i) => {
                                                        const color = getTagColor(tag.trim());
                                                        return (
                                                            <span
                                                                key={i}
                                                                className={`group flex items-center gap-0.5 text-xs px-1 py-0.5 rounded ${color.bg} ${color.text} ${color.hover} max-w-full`}
                                                                title={tag.trim()}
                                                            >
                                                                <span className="truncate flex-1 text-center">{tag.trim()}</span>
                                                                <button
                                                                    className="opacity-60 hover:opacity-100 hover:text-red-400 font-bold flex-shrink-0"
                                                                    onClick={() => {
                                                                        const newTags = groupTags.filter((_, idx) => idx !== i).join(',');
                                                                        updateSkuGroup(group.parentAsin, { tags: newTags });
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
                                                            if (addTagProductId === group.parentAsin) {
                                                                setAddTagProductId(null);
                                                                setTagDropdownPos(null);
                                                            } else {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setTagDropdownPos({ x: rect.left, y: rect.bottom + 4 });
                                                                setAddTagProductId(group.parentAsin);
                                                            }
                                                        }}
                                                        className="h-5 w-5 text-xs rounded bg-zinc-700/50 hover:bg-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center flex-shrink-0"
                                                        title="添加标签"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-center font-mono text-zinc-500">
                                                {group.length && group.width && group.height ? `${group.length}×${group.width}×${group.height}` : '-'}
                                            </td>
                                            <td className="py-3 px-2 text-center font-mono text-zinc-500">{group.weight || '-'}</td>
                                            <td className="py-3 px-2 text-center font-mono text-zinc-500">{group.pcsPerBox || '-'}</td>
                                            <td className="py-3 px-2 text-center font-mono text-orange-400">
                                                {group.unitCost ? `¥${group.unitCost}` : '-'}
                                            </td>
                                            <td className="py-3 px-2 text-center font-mono text-green-400">
                                                {group.defaultPrice ? `$${group.defaultPrice}` : '-'}
                                            </td>
                                            <td className="py-3 px-2 text-center font-mono">
                                                <div className="flex flex-col items-center">
                                                    {group.fbaFeeManual && group.fbaFeeManual > 0 ? (
                                                        <span className="text-orange-500 font-bold" title="手动锁定费用">${group.fbaFeeManual}</span>
                                                    ) : (
                                                        (() => {
                                                            const clsFee = calculateFBAFeeFromProduct({
                                                                length: group.length || 0,
                                                                width: group.width || 0,
                                                                height: group.height || 0,
                                                                weight: group.weight || 0,
                                                                category: (group.displayType === 'apparel' || group.category === 'apparel') ? 'apparel' : 'standard',
                                                                defaultPrice: group.defaultPrice
                                                            });
                                                            return clsFee > 0 ? (
                                                                <span className="text-zinc-500" title="系统自动计算 (2026)">
                                                                    ${clsFee.toFixed(2)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-zinc-600">-</span>
                                                            );
                                                        })()
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditSkuGroup(group)}
                                                        className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-xs transition-colors"
                                                        title="编辑"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(group.parentAsin)}
                                                        className="p-1.5 rounded bg-red-900/50 hover:bg-red-800 text-xs transition-colors"
                                                        title="删除"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* 颜色分组行 & 子体行 - 展开时显示 */}
                                        {isExpanded && isVariant && group.colorGroups.map((colorGroup) => {
                                            const colorKey = `${group.parentAsin}-${colorGroup.color}`;
                                            const isColorExpanded = expandedColors.has(colorKey);

                                            return (
                                                <React.Fragment key={colorKey}>
                                                    {/* 颜色分组行 */}
                                                    <tr
                                                        className="border-t border-[#27272a]/50 bg-[#0a0a0c] hover:bg-[#12121a] cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSkuColor(group.parentAsin, colorGroup.color);
                                                        }}
                                                    >
                                                        <td className="py-2 px-2 pl-8">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-zinc-600 transition-transform text-xs ${isColorExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                                <span className="text-zinc-300 text-sm font-bold w-28 truncate" title={colorGroup.颜色}>{colorGroup.颜色}</span>
                                                                <span className="text-zinc-600 text-xs">({colorGroup.items.length} 码)</span>
                                                            </div>
                                                        </td>
                                                        <td colSpan={11} className="py-2 px-2 text-zinc-600 text-xs text-center border-l border-[#27272a]/30">
                                                            {/* 产品库不显示权重占比信息 */}
                                                            <span className="opacity-30">-</span>
                                                        </td>
                                                    </tr>

                                                    {/* 具体SKU行 (尺码) */}
                                                    {isColorExpanded && colorGroup.items.map((item, idx) => (
                                                        <tr
                                                            key={item.id}
                                                            className={`border-t border-[#27272a]/30 hover:bg-[#1a1a1d] cursor-pointer ${idx % 2 === 0 ? 'bg-[#08080a]' : 'bg-[#0c0c0e]'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // TODO: Add item click handler if needed
                                                            }}
                                                        >
                                                            <td className="py-2 px-2 pl-14">
                                                                <span className="text-zinc-400 text-sm break-words block">
                                                                    {item.品名}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-2 text-zinc-500 font-mono text-xs break-all">{item.SKU}</td>
                                                            <td className="py-2 px-2 text-zinc-400 text-xs text-center font-bold">{item.尺码 || '-'}</td>
                                                            <td className="py-2 px-2 text-zinc-600 text-xs">-</td>
                                                            <td className="py-2 px-2 text-zinc-600">-</td>
                                                            <td className="py-2 px-2 text-center font-mono text-zinc-600">-</td>
                                                            <td className="py-2 px-2 text-center font-mono text-zinc-600">-</td>
                                                            <td className="py-2 px-2 text-center font-mono text-zinc-600">-</td>
                                                            <td className="py-2 px-2 text-center font-mono text-zinc-600">-</td>
                                                            <td className="py-2 px-2 text-center font-mono text-zinc-600">-</td>
                                                            <td className="py-2 px-2 text-center font-mono text-zinc-600">-</td>
                                                            <td className="py-2 px-2 text-center text-zinc-600">
                                                                {/* 产品库不显示权重占比信息 */}
                                                                -
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}


                            {/* 显示手动添加的products（始终显示，与skuGroups并存）*/}
                            {sortedProducts.map((product, index) => (
                                <tr
                                    key={product.id}
                                    className={`border-t border-[#27272a] hover:bg-[#1a1a1d] transition-colors cursor-pointer ${index % 2 === 0 ? '' : 'bg-[#0f0f11]'}`}
                                    onClick={() => setDrawerProduct(product)}
                                >
                                    <td className="py-3 px-2">
                                        <div className="flex items-start gap-2">
                                            {/* 占位箭头，确保对齐 */}
                                            <span className="text-zinc-500 text-xs mt-0.5 invisible">▶</span>
                                            <span className="font-bold text-white break-words">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-zinc-400 font-mono break-all">{product.sku || '-'}</td>
                                    <td className="py-3 px-2 text-center text-zinc-500">-</td>
                                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                                        {/* 类目：4个选项 */}
                                        {/* 产品类型：4个选项 */}
                                        <select
                                            value={product.displayType || (
                                                product.category === 'apparel' ? 'apparel' : 'standard'
                                            )}
                                            onChange={(e) => {
                                                const newType = e.target.value as 'standard' | 'apparel' | 'multi' | 'single';
                                                updateProduct(product.id, { displayType: newType });
                                            }}
                                            className="bg-transparent border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500 focus:outline-none focus:border-blue-500 cursor-pointer w-full"
                                        >
                                            <option value="standard">标品</option>
                                            <option value="apparel">服装</option>
                                            <option value="multi">多变体</option>
                                            <option value="single">单变体</option>
                                        </select>
                                    </td>
                                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                                        {/* 标签：Flex布局 */}
                                        <div className="flex flex-wrap gap-1">
                                            {product.tags && product.tags.map((tag, i) => {
                                                const color = getTagColor(tag);
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`group flex items-center gap-0.5 text-xs px-1 py-0.5 rounded ${color.bg} ${color.text} ${color.hover} max-w-full`}
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
                                                className="h-5 w-5 text-xs rounded bg-zinc-700/50 hover:bg-zinc-600 text-zinc-400 hover:text-white flex items-center justify-center flex-shrink-0"
                                                title="添加标签"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono text-zinc-300">
                                        {product.length}×{product.width}×{product.height}
                                    </td>
                                    <td className="py-3 px-2 text-center font-mono text-zinc-300">{product.weight}</td>
                                    <td className="py-3 px-2 text-center font-mono text-zinc-300">{product.pcsPerBox}</td>
                                    <td className="py-3 px-2 text-center font-mono text-orange-400">¥{product.unitCost}</td>
                                    <td className="py-3 px-2 text-center font-mono text-green-400">${product.defaultPrice}</td>
                                    <td className="py-3 px-2 text-center font-mono">
                                        <div className="flex flex-col items-center">
                                            {/* 优先显示手动费用 */}
                                            {product.fbaFeeManual && product.fbaFeeManual > 0 ? (
                                                <span className="text-orange-500 font-bold" title="手动锁定费用">${product.fbaFeeManual}</span>
                                            ) : (
                                                (() => {
                                                    const clsFee = calculateFBAFeeFromProduct(product);
                                                    return clsFee > 0 ? (
                                                        <span className="text-zinc-400" title="系统自动计算 (2026)">
                                                            ${clsFee.toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-600">-</span>
                                                    );
                                                })()
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-xs transition-colors"
                                                title="编辑"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirmId(product.id)}
                                                className="p-1.5 rounded bg-red-900/50 hover:bg-red-800 text-xs transition-colors"
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
                                <strong>{products.find(p => p.id === deleteConfirmId)?.name || skuGroups.find(g => g.parentAsin === deleteConfirmId)?.品名}</strong> 吗？
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
                // 判断是Product还是SkuGroup
                const targetProduct = products.find(p => p.id === addTagProductId);
                const targetSkuGroup = skuGroups.find(g => g.parentAsin === addTagProductId);

                // 获取当前已有标签
                const currentTags = targetProduct
                    ? (targetProduct.tags || [])
                    : (targetSkuGroup?.tags ? targetSkuGroup.tags.split(',').filter(t => t.trim()) : []);

                const availableTags = allTags.filter(t => !currentTags.includes(t));

                // 添加标签的处理函数
                const handleAddTag = (tag: string) => {
                    if (targetProduct) {
                        updateProduct(targetProduct.id, { tags: [...(targetProduct.tags || []), tag] });
                    } else if (targetSkuGroup) {
                        addTagToSkuGroup(targetSkuGroup.parentAsin, tag);
                    }
                    setAddTagProductId(null);
                    setTagDropdownPos(null);
                };

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
                                            if (newTag && !currentTags.includes(newTag)) {
                                                handleAddTag(newTag);
                                            }
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
                                                onClick={() => handleAddTag(tag)}
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

            {/* 产品详情抽屉 (支持产品和SKU组) */}
            <ProductDetailDrawer
                product={drawerProduct}
                onClose={() => setDrawerProduct(null)}
                onEdit={handleDrawerEdit}
                onDelete={handleDrawerDelete}
            />
        </PageShell>
    );
};

export default ProductLibrary;

