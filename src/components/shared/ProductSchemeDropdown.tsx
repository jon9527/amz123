import React, { useState, useMemo, useCallback } from 'react';
import { SavedProfitModel } from '../../types';

interface ProductSchemeDropdownProps {
    /** All saved profit models */
    models: SavedProfitModel[];
    /** Currently selected model ID */
    selectedModelId?: string;
    /** Callback when a model is selected */
    onSelectModel: (model: SavedProfitModel) => void;
    /** Accent color theme (default: 'blue') */
    accentColor?: 'blue' | 'purple';
    /** Show "Manual Input" option at top */
    showManualOption?: boolean;
    /** Callback when manual mode is selected */
    onManualSelect?: () => void;
}

/**
 * Reusable dropdown for selecting profit models, grouped by product name.
 * Used across: ProfitHeader, PromotionAnalysis, AdsAnalysis, PromotionDeduction
 */
export const ProductSchemeDropdown: React.FC<ProductSchemeDropdownProps> = ({
    models,
    selectedModelId,
    onSelectModel,
    accentColor = 'blue',
    showManualOption = false,
    onManualSelect,
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Group models by product name
    const groupedModels = useMemo(() => {
        const groups: Record<string, SavedProfitModel[]> = {};
        models.forEach(m => {
            const key = m.productName || '未分类';
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        return groups;
    }, [models]);

    // Toggle group expand/collapse
    const toggleGroup = useCallback((groupName: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    }, []);

    // Color mappings based on accent
    const colors = {
        blue: {
            icon: 'text-blue-500',
            tagBg: 'bg-blue-500/15',
            tagBgSelected: 'bg-blue-500/30',
            tagText: 'text-blue-400',
            tagTextSelected: 'text-blue-300',
            tagBorder: 'border-blue-500/20',
            selectedBg: 'bg-blue-900/20',
            selectedBorder: 'border-blue-500',
            hoverBorder: 'hover:border-blue-500/50',
        },
        purple: {
            icon: 'text-purple-500',
            tagBg: 'bg-purple-500/15',
            tagBgSelected: 'bg-purple-500/30',
            tagText: 'text-purple-400',
            tagTextSelected: 'text-purple-300',
            tagBorder: 'border-purple-500/20',
            selectedBg: 'bg-purple-900/20',
            selectedBorder: 'border-purple-500',
            hoverBorder: 'hover:border-purple-500/50',
        },
    }[accentColor];

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 bg-[#0c0c0e] border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 h-10 shadow-lg transition-colors min-w-[120px] justify-center"
            >
                <span className={`material-symbols-outlined ${colors.icon} text-lg`}>description</span>
                <span className="text-sm font-bold text-white">导入数据</span>
                <span className="material-symbols-outlined text-zinc-500 text-sm">
                    {showDropdown ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {/* Dropdown Panel */}
            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

                    <div
                        className="absolute right-0 mt-2 w-56 bg-[#111111] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                        onMouseLeave={() => setShowDropdown(false)}
                    >
                        <div className="max-h-[360px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {/* Manual Mode Option */}
                            {showManualOption && (
                                <button
                                    className={`w-full text-left px-4 py-2.5 hover:bg-zinc-800 transition-colors flex items-center gap-2 border-b border-zinc-800 ${!selectedModelId ? colors.selectedBg : ''}`}
                                    onClick={() => { onManualSelect?.(); setShowDropdown(false); }}
                                >
                                    <span className="material-symbols-outlined text-zinc-500 text-sm">edit</span>
                                    <span className="text-sm font-bold text-zinc-300">-- 手动输入 --</span>
                                </button>
                            )}

                            {/* Empty State */}
                            {models.length === 0 && (
                                <div className="px-4 py-8 text-center text-zinc-500 text-xs">
                                    暂无保存记录
                                </div>
                            )}

                            {/* Grouped Models */}
                            {Object.keys(groupedModels).map(groupName => {
                                const groupItems = groupedModels[groupName];
                                const isExpanded = expandedGroups[groupName];

                                return (
                                    <div key={groupName} className="border-b border-zinc-800/50 last:border-0">
                                        {/* Group Header */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleGroup(groupName); }}
                                            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="text-[10px] text-zinc-500 material-symbols-outlined transition-transform duration-200"
                                                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                                                >
                                                    chevron_right
                                                </span>
                                                <span className="text-xs font-bold text-zinc-300 group-hover:text-white">{groupName}</span>
                                                <span className="text-[11px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold leading-none">{groupItems.length}</span>
                                            </div>
                                        </button>

                                        {/* Group Content */}
                                        {isExpanded && (
                                            <div className="bg-zinc-900/30 pb-1">
                                                {groupItems.map(model => {
                                                    const marginPct = (model.results?.planB?.margin ?? 0) * 100;
                                                    const marginColor = marginPct >= 20 ? 'text-emerald-400' : marginPct >= 10 ? 'text-yellow-400' : 'text-red-400';
                                                    const isSelected = model.id === selectedModelId;

                                                    return (
                                                        <button
                                                            key={model.id}
                                                            className={`w-full text-left pl-9 pr-4 py-1.5 hover:bg-zinc-800 transition-colors flex items-center justify-start gap-4 border-l-2 ml-1 ${isSelected ? `${colors.selectedBg} ${colors.selectedBorder}` : `border-transparent ${colors.hoverBorder}`}`}
                                                            onClick={() => { onSelectModel(model); setShowDropdown(false); }}
                                                        >
                                                            {/* Label Tag */}
                                                            <span className={`text-[10px] ${isSelected ? `${colors.tagBgSelected} ${colors.tagTextSelected}` : `${colors.tagBg} ${colors.tagText}`} border ${colors.tagBorder} px-1.5 py-0.5 rounded font-medium truncate max-w-[110px]`}>
                                                                {model.label || '无标签'}
                                                            </span>
                                                            {/* Margin */}
                                                            <span className={`text-[10px] font-bold ${marginColor} flex items-center gap-0.5 w-14`}>
                                                                <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                                                {marginPct.toFixed(1)}%
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProductSchemeDropdown;
