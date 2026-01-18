import React, { useMemo, memo } from 'react';
import { SkuParentGroup, SkuItem } from '../../types/skuTypes';

interface SkuTreeTableProps {
    groups: SkuParentGroup[];
    searchQuery?: string;
    onItemClick?: (item: SkuItem) => void;
    expandedParents: Set<string>;
    expandedColors: Set<string>;
    onToggleParent: (parentAsin: string) => void;
    onToggleColor: (parentAsin: string, color: string) => void;
    onEditGroup?: (group: SkuParentGroup) => void;
    onGroupClick?: (group: SkuParentGroup) => void;
}

/**
 * 服装SKU树形表格组件
 */
export const SkuTreeTable: React.FC<SkuTreeTableProps> = ({
    groups,
    searchQuery = '',
    onItemClick,
    expandedParents,
    expandedColors,
    onToggleParent,
    onToggleColor,
    onEditGroup,
    onGroupClick,
}) => {
    // 搜索过滤
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return groups;

        const q = searchQuery.toLowerCase();
        return groups.map(group => {
            const matchedColorGroups = group.colorGroups.map(colorGroup => {
                const matchedItems = colorGroup.items.filter(item =>
                    item.ASIN.toLowerCase().includes(q) ||
                    item.SKU.toLowerCase().includes(q) ||
                    item.MSKU.toLowerCase().includes(q) ||
                    item.品名.toLowerCase().includes(q)
                );
                return { ...colorGroup, items: matchedItems };
            }).filter(cg => cg.items.length > 0);

            return { ...group, colorGroups: matchedColorGroups };
        }).filter(g => g.colorGroups.length > 0);
    }, [groups, searchQuery]);

    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                <span className="text-6xl mb-4">👕</span>
                <p className="text-lg">暂无服装SKU数据</p>
                <p className="text-sm">点击「📂 导入服装SKU」开始</p>
            </div>
        );
    }

    return (
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
            <table className="w-full text-sm table-fixed">
                <thead>
                    <tr className="bg-[#1f2937] text-zinc-400 text-left text-xs">
                        <th className="py-3 pl-12 pr-2 font-bold whitespace-nowrap" style={{ width: '23%' }}>产品名称</th>
                        <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '5%' }}>简称</th>
                        <th className="py-3 px-2 font-bold whitespace-nowrap" style={{ width: '16%' }}>SKU</th>
                        <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '8%' }}>父ASIN</th>
                        <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '8%' }}>ASIN</th>
                        <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '4%' }}>类目</th>
                        <th className="py-3 px-2 font-bold text-center whitespace-nowrap" style={{ width: '5%' }}>尺码</th>
                        <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '6%' }}>店铺</th>
                        <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '6%' }}>运营</th>
                        <th className="py-3 px-2 font-bold text-center text-blue-300 whitespace-nowrap" style={{ width: '5%' }}>颜色%</th>
                        <th className="py-3 px-2 font-bold text-center text-blue-300 whitespace-nowrap" style={{ width: '5%' }}>尺码%</th>
                        <th className="py-3 px-2 font-bold text-center whitespace-nowrap" style={{ width: '4%' }}>权重</th>
                        <th className="py-3 px-2 font-bold text-center whitespace-nowrap" style={{ width: '5%' }}>操作</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredGroups.map((group, groupIndex) => {
                        const isParentExpanded = expandedParents.has(group.parentAsin);
                        // 尺码统计逻辑（保持不变）
                        const sizeSet = new Set<string>();
                        group.colorGroups.forEach(cg => cg.items.forEach(item => sizeSet.add(item.尺码)));
                        const sizeCount = sizeSet.size;

                        return (
                            <React.Fragment key={group.parentAsin}>
                                {/* 父体行 */}
                                <tr
                                    className={`border-t border-[#27272a] hover:bg-[#1a1a1d] transition-colors cursor-pointer ${groupIndex % 2 === 0 ? '' : 'bg-[#0f0f11]'}`}
                                    onClick={() => onGroupClick?.(group)}
                                >
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onToggleParent(group.parentAsin);
                                                }}
                                                className={`text-zinc-500 transition-transform text-xs p-1 hover:text-zinc-300 ${isParentExpanded ? 'rotate-90' : ''}`}
                                            >
                                                ▶
                                            </button>
                                            <div className="flex items-center justify-between gap-2 overflow-hidden flex-1">
                                                <div className="font-bold text-white truncate">{group.品名}</div>
                                                <span className="shrink-0 text-xs text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded ml-auto">🎨 {group.colorGroups.length}色</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">{group.简称 || '—'}</td>
                                    <td className="py-3 px-4 font-mono text-zinc-400 text-xs truncate">{group.款号}</td>
                                    <td className="py-3 px-4 font-mono text-blue-400 text-xs truncate text-center">{group.parentAsin}</td>
                                    <td className="py-3 px-4 text-zinc-500 text-center">—</td>
                                    <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">
                                        {group.category === 'standard' ? '标准' : '服装'}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="text-green-400">📦 {sizeCount}</span>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">{group.店铺}</td>
                                    <td className="py-3 px-4 text-zinc-400 truncate text-center">{group.运营}</td>
                                    <td className="py-3 px-4 text-center text-zinc-500">—</td>
                                    <td className="py-3 px-4 text-center text-zinc-500">—</td>
                                    <td className="py-3 px-4 text-center text-zinc-500">—</td>
                                    <td className="py-3 px-4 text-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditGroup?.(group);
                                            }}
                                            className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-blue-400 transition-colors"
                                            title="编辑父体属性"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                    </td>
                                </tr>

                                {/* 颜色分组行 */}
                                {isParentExpanded && group.colorGroups.map((colorGroup) => {
                                    const colorKey = `${group.parentAsin}-${colorGroup.color}`;
                                    const isColorExpanded = expandedColors.has(colorKey);
                                    const firstItem = colorGroup.items[0];
                                    const colorRatio = firstItem?.salesInfo ? ((firstItem.salesInfo.colorSales / firstItem.salesInfo.totalSales) * 100).toFixed(1) : null;

                                    return (
                                        <React.Fragment key={colorKey}>
                                            <tr
                                                className="border-t border-[#27272a]/50 bg-[#0a0a0c] hover:bg-[#12121a] cursor-pointer"
                                                onClick={() => onToggleColor(group.parentAsin, colorGroup.color)}
                                            >
                                                <td className="py-2 px-4 pl-8">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs text-zinc-600 transition-transform ${isColorExpanded ? 'rotate-90' : ''}`}>▶</span>
                                                        <span className="text-purple-300">{colorGroup.颜色}</span>
                                                        <span className="text-zinc-600 text-xs">({colorGroup.color})</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                <td className="py-2 px-4 text-zinc-600">—</td>
                                                <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                <td className="py-2 px-4 text-center">
                                                    <span className="text-xs text-zinc-400">{colorGroup.items.length} 码</span>
                                                </td>
                                                <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                <td className="py-2 px-4 text-center font-mono text-blue-300">
                                                    {colorRatio ? `${colorRatio}%` : '—'}
                                                </td>
                                                <td className="py-2 px-4 text-center text-zinc-600">—</td>
                                                <td className="py-2 px-4 text-center text-zinc-600">—</td>
                                                <td className="py-2 px-4 text-center text-zinc-600">—</td>
                                            </tr>

                                            {/* 子体SKU行 */}
                                            {isColorExpanded && colorGroup.items.map((item, idx) => (
                                                <tr
                                                    key={item.id}
                                                    className={`border-t border-[#27272a]/30 hover:bg-[#1a1a1d] cursor-pointer ${idx % 2 === 0 ? 'bg-[#08080a]' : 'bg-[#0c0c0e]'}`}
                                                    onClick={() => onItemClick?.(item)}
                                                >
                                                    <td className="py-2 px-4 pl-14 text-zinc-500 text-xs truncate">{item.品名}</td>
                                                    <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                    <td className="py-2 px-4 font-mono text-xs text-zinc-300 truncate">{item.SKU}</td>
                                                    <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                    <td className="py-2 px-4 font-mono text-xs text-zinc-400 truncate text-center">{item.ASIN}</td>
                                                    <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                    <td className="py-2 px-4 text-center">
                                                        <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-xs">{item.尺码}</span>
                                                    </td>
                                                    <td className="py-2 px-4 text-zinc-600 truncate text-center">{item.店铺 || '—'}</td>
                                                    <td className="py-2 px-4 text-zinc-600 truncate text-center">{item.运营}</td>
                                                    <td className="py-2 px-4 text-center text-zinc-600">
                                                        {item.salesInfo ? `${((item.salesInfo.colorSales / item.salesInfo.totalSales) * 100).toFixed(1)}%` : '—'}
                                                    </td>
                                                    <td className="py-2 px-4 text-center font-mono text-blue-300">
                                                        {item.salesInfo ? `${((item.salesInfo.sizeSales / item.salesInfo.totalSales) * 100).toFixed(1)}%` : '—'}
                                                    </td>
                                                    <td
                                                        className="py-2 px-4 text-center font-mono text-blue-300 cursor-help"
                                                        title={item.salesInfo ? `销量依据:\n颜色销量: ${item.salesInfo.colorSales}\n尺码销量: ${item.salesInfo.sizeSales}\n父体总销量: ${item.salesInfo.totalSales}` : ''}
                                                    >
                                                        {item.salesWeight !== undefined ? `${(item.salesWeight * 100).toFixed(2)}%` : '-'}
                                                    </td>
                                                    <td className="py-2 px-4 text-center text-zinc-600">—</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default memo(SkuTreeTable);
