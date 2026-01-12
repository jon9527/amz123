import React from 'react';
import { SavedProfitModel, ProductSpec } from '../../types';
import { Product } from '../../contexts/ProductContext'; // Assuming Product type is exported here or I should import it from types if available

// Check where Product is defined. In ProfitCalculator it iterates products map.
// Line 9: import { useProducts } from '../contexts/ProductContext';
// I should check Product type definition.

interface ProfitHeaderProps {
    products: ProductSpec[]; // Simplify type or import strictly if possible
    selectedProductId: string;
    onProductSelect: (id: string) => void;
    showLoadMenu: boolean;
    setShowLoadMenu: (show: boolean) => void;
    recentProducts: SavedProfitModel[];
    groupedModels: Record<string, SavedProfitModel[]>;
    expandedGroups: Record<string, boolean>;
    toggleGroup: (groupName: string) => void;
    onLoadModel: (model: SavedProfitModel) => void;
    onSaveClick: () => void;
}

export const ProfitHeader: React.FC<ProfitHeaderProps> = ({
    products,
    selectedProductId,
    onProductSelect,
    showLoadMenu,
    setShowLoadMenu,
    recentProducts,
    groupedModels,
    expandedGroups,
    toggleGroup,
    onLoadModel,
    onSaveClick,
}) => {
    return (
        <div className="flex items-center justify-between gap-6 px-4 py-1 border-b border-[#27272a]/20">
            <div className="flex items-center gap-4">
                <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
                    <span className="material-symbols-outlined text-3xl text-blue-500 leading-none">account_balance_wallet</span>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-white tracking-tighter leading-none">亚马逊利润测算</h1>
                    <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-1">版本 V1.0 • 实时运营仿真系统</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2">
                    <div className="relative">
                        <select
                            value={selectedProductId}
                            onChange={(e) => onProductSelect(e.target.value)}
                            className="appearance-none bg-[#0c0c0e] hover:bg-[#18181b] border border-[#27272a] hover:border-zinc-600 text-zinc-300 text-xs font-bold py-3 pl-4 pr-10 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[200px]"
                        >
                            <option value="">-- 选择产品 (未关联) --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.sku || 'No SKU'})</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col">
                            <span className="material-symbols-outlined text-zinc-500 text-[18px]">expand_more</span>
                        </div>
                    </div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 ${selectedProductId ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-800/30 border-zinc-800'}`} title={selectedProductId ? "基础数据已同步" : "未关联产品"}>
                        <span className={`w-2 h-2 rounded-full transition-all duration-300 ${selectedProductId ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`}></span>
                    </div>
                </div>

                <div className="w-px h-8 bg-zinc-800 mx-1"></div>
                <div className="relative">
                    <button
                        onClick={() => setShowLoadMenu(!showLoadMenu)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all border border-zinc-700"
                    >
                        <span className="material-symbols-outlined text-[20px]">file_open</span>
                        导入数据
                    </button>
                    {showLoadMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowLoadMenu(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-72 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                                {recentProducts.length === 0 ? (
                                    <div className="px-4 py-8 text-center text-zinc-500 text-xs">
                                        暂无保存记录
                                    </div>
                                ) : (
                                    <div className="max-h-[400px] overflow-y-auto">
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
                                                            <span className="text-[10px] text-zinc-500 material-symbols-outlined transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>chevron_right</span>
                                                            <span className="text-xs font-bold text-zinc-300 group-hover:text-white">{groupName}</span>
                                                            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 rounded-full">{groupItems.length}</span>
                                                        </div>
                                                    </button>

                                                    {/* Group Content */}
                                                    {isExpanded && (
                                                        <div className="bg-zinc-900/30 pb-1">
                                                            {groupItems.map(model => {
                                                                // 计算利润率用于显示（margin 是小数，需要乘100）
                                                                const marginPct = (model.results?.planB?.margin ?? 0) * 100;
                                                                const marginColor = marginPct >= 20 ? 'text-emerald-400' : marginPct >= 10 ? 'text-yellow-400' : 'text-red-400';

                                                                return (
                                                                    <button
                                                                        key={model.id}
                                                                        className="load-item w-full text-left pl-9 pr-4 py-2 hover:bg-zinc-800 transition-colors flex items-center justify-between border-l-2 border-transparent hover:border-blue-500/50 ml-1"
                                                                        data-name={model.productName}
                                                                        onClick={() => onLoadModel(model)}
                                                                    >
                                                                        {/* 标签 */}
                                                                        <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium truncate max-w-[110px]">
                                                                            {model.label || '无标签'}
                                                                        </span>
                                                                        {/* 价格 + 利润率 */}
                                                                        <div className="flex items-center gap-4">
                                                                            <span className="text-sm font-black font-mono text-zinc-300 w-16 text-right">
                                                                                ${model.inputs.actualPrice}
                                                                            </span>
                                                                            <span className={`text-[10px] font-bold ${marginColor} flex items-center gap-0.5 w-14`}>
                                                                                <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                                                                {marginPct.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <button
                    onClick={onSaveClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    保存当前方案
                </button>
            </div>
        </div>
    );
};
