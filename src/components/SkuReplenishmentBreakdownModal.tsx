import React, { useMemo, useState } from 'react';
import { useCombinedProducts } from '../hooks/useCombinedProducts';
import { SkuParentGroup } from '../types/skuTypes';

interface SkuReplenishmentBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    batches: any[]; // ReplenishmentBatch[]
    productId: string;
}

import { STORAGE_KEYS } from '../repositories/StorageKeys';

// ... (keep surrounding imports if needed, but replace_file_content targets specific block)

export const SkuReplenishmentBreakdownModal: React.FC<SkuReplenishmentBreakdownModalProps> = ({
    isOpen,
    onClose,
    planName,
    batches,
    productId,
}) => {
    const products = useCombinedProducts();
    const [expandedColors, setExpandedColors] = useState<Set<string>>(new Set());

    // Toggle color expansion
    const toggleColor = (color: string) => {
        const newSet = new Set(expandedColors);
        if (newSet.has(color)) {
            newSet.delete(color);
        } else {
            newSet.add(color);
        }
        setExpandedColors(newSet);
    };

    // 1. Filter valid batches (qty > 0) for display columns
    const activeBatches = useMemo(() => {
        return batches.filter(b => b.qty > 0 || b.name); // Keep named batches even if 0, or just qty > 0
    }, [batches]);

    const breakdownData = useMemo(() => {
        if (!isOpen || !productId) return null;

        try {
            const saved = localStorage.getItem(STORAGE_KEYS.SKU_GROUPS);
            if (saved) {
                const groups: SkuParentGroup[] = JSON.parse(saved);
                const targetGroup = groups.find(g => g.parentAsin === productId);

                if (targetGroup) {
                    // Group by Color
                    const colorGroups: {
                        colorKey: string; // Unique key for state (usually English or Chinese)
                        colorName: string; // English Name
                        colorNameCN: string; // Chinese Name
                        rows: {
                            size: string;
                            sku: string;
                            name: string;
                            weight: number;
                            batchQtys: number[]; // Corresponds to activeBatches
                            totalQty: number;
                        }[];
                    }[] = [];

                    targetGroup.colorGroups.forEach(cg => {
                        const rows = cg.items.map(sku => {
                            const weight = sku.salesWeight || 0;

                            const finalBatchQtys = activeBatches.map(b => {
                                const finalBatchTotal = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
                                return Math.round(finalBatchTotal * weight);
                            });

                            return {
                                size: sku.尺码,
                                sku: sku.MSKU || sku.SKU,
                                name: sku.品名,
                                weight: weight,
                                batchQtys: finalBatchQtys,
                                totalQty: finalBatchQtys.reduce((a, c) => a + c, 0)
                            };
                        });

                        // Sort rows by Size
                        const sizeOrder: Record<string, number> = {
                            'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5,
                            '2XL': 6, 'XXL': 6, '3XL': 7, '4XL': 8, '5XL': 9,
                            '28': 10, '29': 11, '30': 12, '31': 13, '32': 14,
                        };
                        rows.sort((a, b) => (sizeOrder[a.size?.toUpperCase()] ?? 99) - (sizeOrder[b.size?.toUpperCase()] ?? 99));

                        colorGroups.push({
                            colorKey: cg.color,
                            colorName: cg.color,
                            colorNameCN: cg.颜色 || cg.color, // Fallback if no Chinese
                            rows
                        });
                    });

                    // Sort color groups by Chinese name (primary) or English (secondary)
                    colorGroups.sort((a, b) => a.colorNameCN.localeCompare(b.colorNameCN));

                    return { type: 'group', colorGroups };
                }
            }
        } catch (e) {
            console.error('Failed to parse sku groups', e);
        }

        // Fallback for Standard Product
        const product = products.find(p => p.id === productId);
        if (product) {
            const finalBatchQtys = activeBatches.map(b => Math.round(b.qty * (1 + (b.extraPercent || 0) / 100)));
            return {
                type: 'standard',
                colorGroups: [{
                    colorKey: 'Standard',
                    colorName: 'Standard',
                    colorNameCN: '标准',
                    rows: [{
                        size: '-',
                        sku: product.sku,
                        name: product.name,
                        weight: 1,
                        batchQtys: finalBatchQtys,
                        totalQty: finalBatchQtys.reduce((a, c) => a + c, 0)
                    }]
                }]
            };
        }

        return null;
    }, [isOpen, productId, activeBatches, products]);

    // Export to CSV
    const handleExport = () => {
        if (!breakdownData || !activeBatches) return;

        // CSV Header
        const header = [
            'SKU', '品名', '颜色 (CN)', '颜色 (EN)', '尺码', '权重',
            ...activeBatches.map((b, i) => `${b.type === 'sea' ? '海运' : b.type === 'air' ? '空运' : '快递'}批次${i + 1}`),
            '合计'
        ].join(',');

        // CSV Rows
        const rows: string[] = [];
        breakdownData.colorGroups.forEach(group => {
            group.rows.forEach(row => {
                const rowData = [
                    `"${row.sku}"`,
                    `"${row.name}"`,
                    `"${group.colorNameCN}"`,
                    `"${group.colorName}"`,
                    `"${row.size}"`,
                    `${(row.weight * 100).toFixed(2)}%`,
                    ...row.batchQtys,
                    row.totalQty
                ];
                rows.push(rowData.join(','));
            });
        });

        // Generate Blob and Download
        const csvContent = "\uFEFF" + [header, ...rows].join('\n'); // Add BOM for Excel
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${planName}_SKU补货明细.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#121214] border border-[#27272a] rounded-2xl shadow-2xl w-[1200px] max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#27272a] flex justify-between items-center bg-[#18181b]">
                    <div className="flex items-center gap-6">
                        <div>
                            <h3 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <span className="material-symbols-outlined text-emerald-500">splitscreen</span>
                                </div>
                                SKU 补货拆分
                            </h3>
                            <p className="text-sm text-zinc-400 mt-2 flex items-center gap-3">
                                <span className="bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/50 text-xs">
                                    方案: <span className="text-zinc-200 font-bold ml-1">{planName}</span>
                                </span>
                                <span className="bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-900/30 text-xs text-emerald-400">
                                    <span className="font-bold">{activeBatches.length}</span> 个批次
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg border border-zinc-700 hover:border-zinc-600 transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                            导出Excel
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-[#27272a] rounded-full text-zinc-500 hover:text-white transition-all duration-200 transform hover:rotate-90">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-track-[#121214] scrollbar-thumb-zinc-700">
                    {!breakdownData ? (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-4">
                            <span className="material-symbols-outlined text-4xl opacity-50">search_off</span>
                            <p>无法找到该产品的 SKU 明细数据</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm border-collapse table-fixed">
                            <thead className="bg-[#18181b] sticky top-0 z-10 text-xs font-bold uppercase text-zinc-500 tracking-wider shadow-sm border-b border-[#27272a]">
                                <tr>
                                    <th className="px-6 py-3 font-black text-zinc-400 w-[20%]">SKU / 品名</th>
                                    <th className="px-4 py-3 text-center w-[8%] whitespace-nowrap">SKU数</th>
                                    <th className="px-4 py-3 text-center w-[8%]">尺码</th>
                                    <th className="px-4 py-3 text-right w-[10%]">权重</th>
                                    {activeBatches.map((b, i) => (
                                        <th key={i} className="px-4 py-3 text-center whitespace-nowrap">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${b.type === 'sea' ? 'bg-blue-900/20 text-blue-400 border-blue-900/30' :
                                                    b.type === 'air' ? 'bg-sky-900/20 text-sky-400 border-sky-900/30' :
                                                        'bg-purple-900/20 text-purple-400 border-purple-900/30'
                                                    }`}>
                                                    {b.type === 'sea' ? '🚢' : b.type === 'air' ? '✈️' : '🚀'} 批次{i + 1}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-3 text-right text-emerald-500 font-black w-[12%] whitespace-nowrap">合计</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#27272a]/50">
                                {breakdownData.colorGroups.map((group, gIdx) => {
                                    const isExpanded = expandedColors.has(group.colorKey);

                                    // Calculate Color Totals
                                    const colorTotalQty = group.rows.reduce((sum, r) => sum + r.totalQty, 0);
                                    const colorTotalWeight = group.rows.reduce((sum, r) => sum + r.weight, 0);
                                    const colorBatchQtys = activeBatches.map((_, i) =>
                                        group.rows.reduce((sum, r) => sum + r.batchQtys[i], 0)
                                    );

                                    return (
                                        <React.Fragment key={gIdx}>
                                            {/* Color Group Header */}
                                            <tr
                                                className={`
                                                    cursor-pointer transition-all duration-200 border-l-4
                                                    ${isExpanded
                                                        ? 'bg-gradient-to-r from-zinc-800 to-transparent border-emerald-500 shadow-inner'
                                                        : 'bg-[#18181b] hover:bg-zinc-800/50 border-transparent hover:border-zinc-700'
                                                    }
                                                `}
                                                onClick={() => toggleColor(group.colorKey)}
                                            >
                                                <td className="px-6 py-1.5">
                                                    <div className="flex items-center gap-3 w-full">
                                                        <div className={`
                                                            p-1 rounded-md transition-all duration-200 flex items-center justify-center
                                                            ${isExpanded ? 'bg-emerald-500/20 text-emerald-400 rotate-90' : 'text-zinc-600'}
                                                        `}>
                                                            <span className="material-symbols-outlined text-xl">arrow_right</span>
                                                        </div>

                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                                <span className={`text-sm font-bold min-w-[5em] text-left ${isExpanded ? 'text-white' : 'text-zinc-300'}`}>
                                                                    {group.colorNameCN}
                                                                </span>
                                                                <span className="text-[10px] text-zinc-500 font-medium font-mono bg-zinc-800/80 px-1.5 rounded border border-zinc-700/50">
                                                                    {group.colorName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* SKU Count Badge (Dedicated Column) */}
                                                <td className="px-4 py-1.5 text-center">
                                                    <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700 whitespace-nowrap inline-block">
                                                        {group.rows.length} SKUs
                                                    </span>
                                                </td>

                                                {/* Size Spacer */}
                                                <td className="px-4 py-1.5"></td>

                                                {/* Weight (Aggregated) */}
                                                <td className="px-4 py-1.5 text-right">
                                                    <span className={`font-mono text-xs font-bold ${isExpanded ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                        {(colorTotalWeight * 100).toFixed(2)}%
                                                    </span>
                                                </td>

                                                {/* Color Level Batch Totals (Visible when collapsed) */}
                                                {activeBatches.map((_, i) => (
                                                    <td key={i} className="px-4 py-1 text-center">
                                                        {!isExpanded && (
                                                            <div className="flex flex-col items-center animate-in fade-in duration-300">
                                                                <span className="text-zinc-400 text-xs font-mono font-medium">{colorBatchQtys[i].toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                ))}

                                                <td className="px-6 py-1 text-right">
                                                    <span className={`font-mono text-sm font-bold ${isExpanded ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                        {colorTotalQty.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* SKU Rows (Indented) */}
                                            {isExpanded && group.rows.map((row, rIdx) => (
                                                <tr key={rIdx} className="bg-[#141416] hover:bg-[#1a1a1d] transition-colors group animate-in slide-in-from-top-1 duration-100">
                                                    <td className="px-6 py-1 pl-14 border-r border-[#27272a]/20">
                                                        <div className="font-bold text-zinc-300 font-mono text-xs tracking-wide">{row.sku}</div>
                                                        <div className="text-[10px] text-zinc-600 truncate max-w-[240px] mt-0.5">{row.name}</div>
                                                    </td>
                                                    <td className="px-4 py-1 border-r border-[#27272a]/20"></td> {/* Empty SKU Count Col */}
                                                    <td className="px-4 py-1 text-center border-r border-[#27272a]/20">
                                                        <span className="inline-block min-w-[32px] px-1.5 py-0.5 rounded bg-[#27272a] text-zinc-400 text-xs font-mono font-bold border border-zinc-700/50 shadow-sm group-hover:bg-[#323238] transition-colors">
                                                            {row.size}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-1 text-right font-mono text-zinc-500 text-xs border-r border-[#27272a]/20 bg-[#18181b]/30">
                                                        {(row.weight * 100).toFixed(2)}%
                                                    </td>
                                                    {row.batchQtys.map((qty, qIdx) => (
                                                        <td key={qIdx} className="px-4 py-1 text-center font-mono text-zinc-300 border-r border-[#27272a]/20">
                                                            {qty > 0 ? (
                                                                <span className="text-sm font-medium opacity-90 group-hover:text-white transition-colors">{qty.toLocaleString()}</span>
                                                            ) : (
                                                                <span className="text-zinc-800 text-xs">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-1 text-right">
                                                        <span className="font-bold font-mono text-emerald-400/90 text-sm group-hover:text-emerald-400 transition-colors">
                                                            {row.totalQty.toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}

                                {/* Grand Total Row */}
                                <tr className="bg-[#121214] border-t border-[#3f3f46] sticky bottom-0 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
                                    <td colSpan={4} className="px-6 py-3 text-right font-black text-zinc-300 uppercase text-xl tracking-widest">总计</td>
                                    {activeBatches.map((_, i) => {
                                        const colTotal = breakdownData.colorGroups.flatMap(g => g.rows).reduce((sum, r) => sum + r.batchQtys[i], 0);
                                        return (
                                            <td key={i} className="px-4 py-3 text-center font-bold font-mono text-white text-base">
                                                {colTotal.toLocaleString()}
                                            </td>
                                        );
                                    })}
                                    <td className="px-6 py-3 text-right font-black font-mono text-emerald-400 text-xl tracking-tight">
                                        {breakdownData.colorGroups.flatMap(g => g.rows).reduce((sum, r) => sum + r.totalQty, 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
