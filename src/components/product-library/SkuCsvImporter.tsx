import React, { useCallback, useState } from 'react';
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
    const parseCSV = useCallback((text: string) => {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) {
            setError('CSV文件为空或格式错误');
            return;
        }

        // 解析表头
        const headers = lines[0].split(',').map(h => h.trim());

        // 验证必需的表头
        const requiredHeaders = ['父ASIN', 'ASIN', 'SKU', '品名'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            setError(`CSV缺少必需列: ${missingHeaders.join(', ')}`);
            return;
        }

        // 解析数据行
        const items: SkuItem[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;

            const item: Record<string, string> = {};
            headers.forEach((header, idx) => {
                item[header] = values[idx]?.trim() || '';
            });

            items.push({
                id: crypto.randomUUID(),
                简称: item['简称'] || '',
                店铺: item['店铺'] || '',
                款号: item['款号'] || '',
                父ASIN: item['父ASIN'] || '',
                ASIN: item['ASIN'] || '',
                SKU: item['SKU'] || '',
                MSKU: item['MSKU'] || '',
                品名: item['品名'] || '',
                Color: item['Color'] || '',
                颜色: item['颜色'] || '',
                尺码: item['尺码'] || '',
                运营: item['运营'] || '',
            });
        }

        if (items.length === 0) {
            setError('未能解析到有效数据');
            return;
        }

        setRawItems(items);
        setGroups(groupSkuByParent(items));
        setError(null);
    }, []);

    // 处理CSV行（考虑引号内的逗号）
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    // 处理文件上传
    const handleFile = (file: File) => {
        if (!file.name.endsWith('.csv')) {
            setError('请上传CSV文件');
            return;
        }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            parseCSV(text);
        };
        reader.onerror = () => setError('文件读取失败');
        reader.readAsText(file, 'UTF-8');
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
                                                <span>📦 {group.totalSkuCount} SKU</span>
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
