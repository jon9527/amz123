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
    displayMode?: 'products' | 'standard' | 'apparel' | 'multi' | 'single';
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
    onGroupClick,
    displayMode = 'apparel', // 默认为服装模式
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
                        {displayMode === 'standard' ? (
                            <>
                                <th className="py-3 px-4 font-bold whitespace-nowrap" style={{ width: '30%' }}>产品名称</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '10%' }}>简称</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap" style={{ width: '20%' }}>SKU</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '20%' }}>ASIN</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '10%' }}>店铺</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '10%' }}>运营</th>
                            </>
                        ) : displayMode === 'products' ? (
                            // 产品库模式：基础信息扁平表格
                            <>
                                <th className="py-3 px-4 font-bold whitespace-nowrap" style={{ width: '22%' }}>产品名称</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap" style={{ width: '12%' }}>款号</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '10%' }}>父ASIN</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '6%' }}>类目</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '6%' }}>颜色</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '6%' }}>SKU数</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '8%' }}>店铺</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '8%' }}>运营</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '10%' }}>分类</th>
                            </>

                        ) : displayMode === 'single' ? (
                            // 单变体模式：销量占比%替代颜色%+尺码%
                            <>
                                <th className="py-3 pl-12 pr-2 font-bold whitespace-nowrap" style={{ width: '28%' }}>产品名称</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '6%' }}>简称</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap" style={{ width: '21%' }}>SKU</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '12%' }}>父ASIN</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '12%' }}>ASIN</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '7%' }}>店铺</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '7%' }}>运营</th>
                                <th className="py-3 px-2 font-bold text-center text-orange-300 whitespace-nowrap" style={{ width: '7%' }}>销量占比</th>
                                <th className="py-3 px-2 font-bold text-center whitespace-nowrap" style={{ width: '0%' }}></th>
                            </>
                        ) : (
                            // 服装/多变体模式：完整列
                            <>
                                <th className="py-3 pl-12 pr-2 font-bold whitespace-nowrap" style={{ width: '22%' }}>产品名称</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '5%' }}>简称</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap" style={{ width: '18%' }}>SKU</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '9%' }}>父ASIN</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '9%' }}>ASIN</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '4%' }}>类目</th>
                                <th className="py-3 px-2 font-bold text-center whitespace-nowrap" style={{ width: '5%' }}>尺码</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '6%' }}>店铺</th>
                                <th className="py-3 px-2 font-bold whitespace-nowrap text-center" style={{ width: '6%' }}>运营</th>
                                <th className="py-3 px-2 font-bold text-center text-blue-300 whitespace-nowrap" style={{ width: '5%' }}>颜色%</th>
                                <th className="py-3 px-2 font-bold text-center text-blue-300 whitespace-nowrap" style={{ width: '5%' }}>尺码%</th>
                                <th className="py-3 px-2 font-bold text-center whitespace-nowrap" style={{ width: '6%' }}>权重</th>
                            </>

                        )}
                    </tr>
                </thead>
                <tbody>
                    {filteredGroups.map((group, groupIndex) => {
                        const isParentExpanded = expandedParents.has(group.parentAsin);
                        // 尺码统计逻辑（保持不变）
                        const sizeSet = new Set<string>();
                        group.colorGroups.forEach(cg => cg.items.forEach(item => sizeSet.add(item.尺码)));
                        const sizeCount = sizeSet.size;

                        // 标品模式：直接显示单行详情（取第一个SKU的信息）
                        if (displayMode === 'standard') {
                            const firstItem = group.colorGroups[0]?.items[0];
                            if (!firstItem) return null;

                            return (
                                <tr
                                    key={group.parentAsin}
                                    className={`border-t border-[#27272a] hover:bg-[#1a1a1d] transition-colors cursor-pointer ${groupIndex % 2 === 0 ? '' : 'bg-[#0f0f11]'}`}
                                    onClick={() => onGroupClick?.(group)}
                                >
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-white">{group.品名}</div>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">{group.简称 || '—'}</td>
                                    <td className="py-3 px-4 font-mono text-zinc-300 text-xs break-all">{firstItem.SKU}</td>
                                    <td className="py-3 px-4 font-mono text-zinc-400 text-xs truncate text-center">{firstItem.ASIN || '—'}</td>
                                    <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">{group.店铺}</td>
                                    <td className="py-3 px-4 text-zinc-400 truncate text-center">{group.运营}</td>

                                </tr>
                            );
                        }

                        // 产品库模式：扁平表格显示父体基础信息
                        if (displayMode === 'products') {
                            // 分类标签颜色
                            const getClassificationBadge = () => {
                                if (group.productType === 'apparel') {
                                    return <span className="px-2 py-0.5 bg-pink-900/30 text-pink-300 rounded text-xs">服装</span>;
                                } else if (group.totalSkuCount === 1) {
                                    return <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-xs">标准</span>;
                                } else if (group.variantType === 'single') {
                                    return <span className="px-2 py-0.5 bg-cyan-900/30 text-cyan-300 rounded text-xs">单变体</span>;
                                } else {
                                    return <span className="px-2 py-0.5 bg-purple-900/30 text-purple-300 rounded text-xs">多变体</span>;
                                }
                            };

                            return (
                                <tr
                                    key={group.parentAsin}
                                    className={`border-t border-[#27272a] hover:bg-[#1a1a1d] transition-colors cursor-pointer ${groupIndex % 2 === 0 ? '' : 'bg-[#0f0f11]'}`}
                                    onClick={() => onGroupClick?.(group)}
                                >
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-white">{group.品名}</div>
                                    </td>
                                    <td className="py-3 px-2 font-mono text-zinc-400 text-xs break-all">{group.款号}</td>
                                    <td className="py-3 px-2 font-mono text-blue-400 text-xs truncate text-center">{group.parentAsin}</td>
                                    <td className="py-3 px-2 text-zinc-400 text-xs truncate text-center">
                                        {group.productType === 'apparel' ? '服装' : '标品'}
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        <span className="text-purple-400">{group.colorGroups.length}</span>
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        <span className="text-green-400">{group.totalSkuCount}</span>
                                    </td>
                                    <td className="py-3 px-2 text-zinc-400 text-xs truncate text-center">{group.店铺}</td>
                                    <td className="py-3 px-2 text-zinc-400 truncate text-center">{group.运营}</td>
                                    <td className="py-3 px-2 text-center">{getClassificationBadge()}</td>
                                    <td className="py-3 px-2 text-center">{getClassificationBadge()}</td>
                                    <td className="py-3 px-2 text-center">
                                    </td>
                                </tr>
                            );
                        }

                        // 单变体模式：父体+子体列表（不分颜色组，直接展示）
                        if (displayMode === 'single') {
                            const allItems = group.colorGroups.flatMap(cg => cg.items);
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
                                                    <div className="font-bold text-white">{group.品名}</div>
                                                    <span className="shrink-0 text-xs text-cyan-400 bg-cyan-900/20 px-1.5 py-0.5 rounded ml-auto">📦 {allItems.length}个</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">{group.简称 || '—'}</td>
                                        <td className="py-3 px-4 font-mono text-zinc-400 text-xs break-all">{group.款号}</td>
                                        <td className="py-3 px-4 font-mono text-blue-400 text-xs truncate text-center">{group.parentAsin}</td>
                                        <td className="py-3 px-4 text-zinc-500 text-center">—</td>
                                        <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">{group.店铺}</td>
                                        <td className="py-3 px-4 text-zinc-400 truncate text-center">{group.运营}</td>
                                        <td className="py-3 px-4 text-center text-zinc-500">—</td>
                                        <td className="py-3 px-4 text-center"></td>
                                    </tr>

                                    {/* 子体SKU行 */}
                                    {isParentExpanded && allItems.map((item, idx) => (
                                        <tr
                                            key={item.id}
                                            className={`border-t border-[#27272a]/30 hover:bg-[#1a1a1d] cursor-pointer ${idx % 2 === 0 ? 'bg-[#08080a]' : 'bg-[#0c0c0e]'}`}
                                            onClick={() => onItemClick?.(item)}
                                        >
                                            <td className="py-2 px-4 pl-10 text-zinc-400 text-xs">
                                                {item.颜色 || item.Color || item.尺码 || item.品名}
                                            </td>
                                            <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                            <td className="py-2 px-4 font-mono text-xs text-zinc-300 break-all">{item.SKU}</td>
                                            <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                            <td className="py-2 px-4 font-mono text-xs text-zinc-400 truncate text-center">{item.ASIN}</td>
                                            <td className="py-2 px-4 text-zinc-600 truncate text-center">{item.店铺 || '—'}</td>
                                            <td className="py-2 px-4 text-zinc-600 truncate text-center">{item.运营}</td>
                                            <td
                                                className="py-2 px-4 text-center font-mono text-orange-300 cursor-help"
                                                title={item.salesInfo ? `子体销量占比\n父体总销量: ${item.salesInfo.totalSales}` : ''}
                                            >
                                                {item.salesWeight !== undefined ? `${(item.salesWeight * 100).toFixed(2)}%` : '—'}
                                            </td>
                                            <td className="py-2 px-4 text-center text-zinc-600">—</td>

                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        }

                        // 服装/多变体模式：树形结构
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
                                                <div className="font-bold text-white">{group.品名}</div>
                                                <span className="shrink-0 text-xs text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded ml-auto">🎨 {group.colorGroups.length}色</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">{group.简称 || '—'}</td>
                                    <td className="py-3 px-4 font-mono text-zinc-400 text-xs break-all">{group.款号}</td>
                                    <td className="py-3 px-4 font-mono text-blue-400 text-xs truncate text-center">{group.parentAsin}</td>
                                    <td className="py-3 px-4 text-zinc-500 text-center">—</td>
                                    <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">
                                        {group.productType === 'apparel' ? '服装' : '标准'}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className="text-green-400">📦 {sizeCount}</span>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-400 text-xs truncate text-center">{group.店铺}</td>
                                    <td className="py-3 px-4 text-zinc-400 truncate text-center">{group.运营}</td>
                                    <td className="py-3 px-4 text-center text-zinc-500">—</td>
                                    <td className="py-3 px-4 text-center text-zinc-500">—</td>
                                    <td className="py-3 px-4 text-center text-zinc-500">—</td>
                                    <td className="py-3 px-4 text-center"></td>
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
                                                    <td className="py-2 px-4 pl-14 text-zinc-500 text-xs">
                                                        {item.品名}
                                                    </td>
                                                    <td className="py-2 px-4 text-zinc-600 text-center">—</td>
                                                    <td className="py-2 px-4 font-mono text-xs text-zinc-300 break-all">{item.SKU}</td>
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
