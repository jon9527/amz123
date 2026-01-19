import React, { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { SkuItem, SKU_CSV_HEADERS, groupSkuByParent, SkuParentGroup } from '../../types/skuTypes';

interface SkuCsvImporterProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (groups: SkuParentGroup[], rawItems: SkuItem[]) => void;
}

/**
 * 服装SKU CSV导入组件
 * 支持拖拽上传、预览分组结构
 */
export const SkuCsvImporter: React.FC<SkuCsvImporterProps> = ({ isOpen, onClose, onImport }) => {
    const [dragOver, setDragOver] = useState(false);
    const [rawItems, setRawItems] = useState<SkuItem[]>([]);
    const [groups, setGroups] = useState<SkuParentGroup[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');

    // 解析CSV文件
    const parseCSV = useCallback((file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as Record<string, string>[];
                if (data.length === 0) {
                    setError('CSV文件为空或格式错误');
                    return;
                }

                // 获取实际的表头（去除BOM和首尾空格）
                const headers = (results.meta.fields || []).map(h => h.trim().replace(/^\ufeff/, ''));

                // 列名映射配置 (标准字段Key -> 可能的CSV表头Values)
                const headerMapping: Record<string, string[]> = {
                    '父ASIN': ['父ASIN', '（父）ASIN', 'Parent ASIN', 'parent_asin'],
                    'ASIN': ['ASIN', '（子）ASIN', 'Child ASIN', 'asin'],
                    'SKU': ['SKU', 'sku', '库存单位'],
                    '品名': ['品名', '标题', '商品名称', 'Product Name', 'name']
                };

                // 查找CSV中对应的实际列名
                const foundHeaders: Record<string, string> = {};
                const missingFields: string[] = [];

                Object.entries(headerMapping).forEach(([key, aliases]) => {
                    const match = headers.find(h => aliases.includes(h) || aliases.some(a => h.includes(a))); // supports partial match if needed, but exact alias match is safer. 
                    // Let's stick to exact alias match first, or case-insensitive?
                    // The file 30.csv has '（父）ASIN', so we need exact match for that.
                    const exactMatch = headers.find(h => aliases.includes(h));
                    if (exactMatch) {
                        foundHeaders[key] = exactMatch;
                    } else {
                        missingFields.push(key);
                    }
                });

                if (missingFields.length > 0) {
                    setError(`CSV缺少必需列: ${missingFields.join(', ')} (支持: ${missingFields.map(k => headerMapping[k].join('/')).join(' 或 ')})`);
                    return;
                }

                // 辅助函数：安全获取列值
                const getValue = (row: any, key: string) => {
                    // 1. 尝试使用映射到的列名
                    const mappedHeader = foundHeaders[key];
                    if (mappedHeader && row[mappedHeader]) return row[mappedHeader].trim();

                    // 2. 尝试直接使用Key (fallback)
                    if (row[key]) return row[key].trim();

                    // 3. 特殊处理其他非必需字段的别名
                    if (key === '简称') return row['简称']?.trim() || row['Short Name']?.trim() || '';
                    if (key === '店铺') return row['店铺']?.trim() || row['Store']?.trim() || '';
                    if (key === '款号') return row['款号']?.trim() || row['Style No']?.trim() || '';
                    if (key === 'Color') return row['Color']?.trim() || row['color']?.trim() || '';
                    if (key === '颜色') return row['颜色']?.trim() || row['color_cn']?.trim() || '';
                    if (key === '尺码') return row['尺码']?.trim() || row['Size']?.trim() || row['size']?.trim() || '';
                    if (key === '运营') return row['运营']?.trim() || row['Operator']?.trim() || '';
                    if (key === 'manualType') return row['分类']?.trim() || row['类型']?.trim() || row['Type']?.trim() || '';

                    return '';
                };

                // 解析数据行
                const items: SkuItem[] = data.map(item => ({
                    id: crypto.randomUUID(),
                    简称: getValue(item, '简称'),
                    店铺: getValue(item, '店铺'),
                    款号: getValue(item, '款号'),
                    父ASIN: getValue(item, '父ASIN'),
                    ASIN: getValue(item, 'ASIN'),
                    SKU: getValue(item, 'SKU'),
                    MSKU: item['MSKU'] || getValue(item, 'SKU'), // Default MSKU to SKU if missing
                    品名: getValue(item, '品名'),
                    Color: getValue(item, 'Color'),
                    颜色: getValue(item, '颜色'),
                    尺码: getValue(item, '尺码'),
                    运营: getValue(item, '运营'),
                    manualType: getValue(item, 'manualType'),
                })).filter(item => item.ASIN); // 过滤掉没有ASIN的无效行

                if (items.length === 0) {
                    setError('未能解析到有效数据');
                    return;
                }

                setRawItems(items);
                setGroups(groupSkuByParent(items));
                setError(null);
            },
            error: (err) => {
                setError(`CSV解析错误: ${err.message}`);
            }
        });
    }, []);

    // 处理文件上传
    const handleFile = (file: File) => {
        if (!file.name.endsWith('.csv')) {
            setError('请上传CSV文件');
            return;
        }
        setFileName(file.name);
        parseCSV(file);
    };

    // 拖拽处理
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    // 确认导入
    const handleConfirmImport = () => {
        onImport(groups, rawItems);
        resetState();
        onClose();
    };

    const resetState = () => {
        setRawItems([]);
        setGroups([]);
        setError(null);
        setFileName('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#18181b] border border-[#27272a] rounded-xl w-[700px] max-h-[80vh] flex flex-col shadow-2xl">
                {/* 头部 */}
                <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
                    <h2 className="text-lg font-bold">📂 导入服装SKU</h2>
                    <button
                        onClick={() => { resetState(); onClose(); }}
                        className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {/* 内容区 */}
                <div className="p-4 flex-1 overflow-auto space-y-4">
                    {/* 上传区域 */}
                    {rawItems.length === 0 ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-600 hover:border-zinc-500'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="text-4xl mb-3">📄</div>
                            <p className="text-zinc-300 mb-2">拖拽CSV文件到这里</p>
                            <p className="text-zinc-500 text-sm mb-4">或者</p>
                            <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer inline-block">
                                选择文件
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                />
                            </label>
                            <p className="text-zinc-600 text-xs mt-4">
                                支持格式: {SKU_CSV_HEADERS.join(', ')}
                            </p>
                            <a
                                href="/sku_template.csv"
                                download="sku_template.csv"
                                className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline inline-block"
                            >
                                📥 下载模板
                            </a>
                        </div>
                    ) : (
                        <>
                            {/* 文件信息 */}
                            <div className="flex items-center justify-between bg-[#0f0f11] rounded-lg p-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">📄</span>
                                    <div>
                                        <div className="font-bold">{fileName}</div>
                                        <div className="text-xs text-zinc-500">{rawItems.length} 条SKU记录</div>
                                    </div>
                                </div>
                                <button
                                    onClick={resetState}
                                    className="text-sm text-zinc-400 hover:text-white"
                                >
                                    重新选择
                                </button>
                            </div>

                            {/* 统计概览 */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-black text-blue-400">{groups.length}</div>
                                    <div className="text-sm text-zinc-400">父体(款)</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-black text-purple-400">
                                        {groups.reduce((sum, g) => sum + g.colorGroups.length, 0)}
                                    </div>
                                    <div className="text-sm text-zinc-400">颜色变体</div>
                                </div>
                                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 rounded-xl p-4 text-center">
                                    <div className="text-3xl font-black text-green-400">{rawItems.length}</div>
                                    <div className="text-sm text-zinc-400">SKU总数</div>
                                </div>
                            </div>

                            {/* 分类统计 */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-[#18181b] rounded-xl p-3 text-center border border-zinc-800">
                                    <div className="text-xl font-bold text-zinc-300">
                                        {groups.filter(g => g.productType === 'standard').length}
                                    </div>
                                    <div className="text-xs text-zinc-500">标品</div>
                                </div>
                                <div className="bg-[#18181b] rounded-xl p-3 text-center border border-zinc-800">
                                    <div className="text-xl font-bold text-zinc-300">
                                        {groups.filter(g => g.productType === 'apparel').length}
                                    </div>
                                    <div className="text-xs text-zinc-500">服装</div>
                                </div>
                                <div className="bg-[#18181b] rounded-xl p-3 text-center border border-zinc-800">
                                    <div className="text-xl font-bold text-zinc-300">
                                        {groups.filter(g => g.variantType === 'single').length}
                                    </div>
                                    <div className="text-xs text-zinc-500">单变体</div>
                                </div>
                                <div className="bg-[#18181b] rounded-xl p-3 text-center border border-zinc-800">
                                    <div className="text-xl font-bold text-zinc-300">
                                        {groups.filter(g => g.variantType === 'multi').length}
                                    </div>
                                    <div className="text-xs text-zinc-500">多变体</div>
                                </div>
                            </div>

                            {/* 预览前10个父体 */}
                            <div className="bg-[#0f0f11] rounded-xl p-3">
                                <div className="text-sm font-bold text-zinc-400 mb-2">预览 (前10款)</div>
                                <div className="space-y-2 max-h-48 overflow-auto">
                                    {groups.slice(0, 10).map((group) => (
                                        <div key={group.parentAsin} className="flex items-center justify-between text-sm bg-[#18181b] rounded-lg px-3 py-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold truncate">{group.品名}</div>
                                                <div className="text-xs text-zinc-500">
                                                    {group.款号} | {group.parentAsin}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-zinc-400">
                                                <span>🎨 {group.colorGroups.length}色</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${group.productType === 'apparel' ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'
                                                    }`}>
                                                    {group.productType === 'apparel' ? '服装' : '标品'}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${group.variantType === 'multi' ? 'bg-orange-900/50 text-orange-300' : 'bg-zinc-800 text-zinc-400'
                                                    }`}>
                                                    {group.variantType === 'multi' ? '多变体' : '单变体'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {groups.length > 10 && (
                                        <div className="text-center text-xs text-zinc-500 py-2">
                                            ... 还有 {groups.length - 10} 款
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* 错误提示 */}
                    {error && (
                        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="flex gap-3 p-4 border-t border-[#27272a]">
                    <button
                        onClick={() => { resetState(); onClose(); }}
                        className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-bold"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirmImport}
                        disabled={rawItems.length === 0}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg font-bold"
                    >
                        确认导入 ({groups.length} 款)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SkuCsvImporter;
