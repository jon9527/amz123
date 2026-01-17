import React from 'react';
import { SavedProfitModel, ProductSpec } from '../../types';
import { ProductSchemeDropdown } from '../shared/ProductSchemeDropdown';


interface ProfitHeaderProps {
    products: ProductSpec[];
    selectedProductId: string;
    onProductSelect: (id: string) => void;
    showLoadMenu: boolean;
    setShowLoadMenu: (show: boolean) => void;
    recentProducts: SavedProfitModel[];
    onLoadModel: (model: SavedProfitModel) => void;
    onSaveClick: () => void;
}

export const ProfitHeader: React.FC<ProfitHeaderProps> = ({
    products,
    selectedProductId,
    onProductSelect,
    recentProducts,
    onLoadModel,
    onSaveClick,
}) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <span className="material-symbols-outlined text-white">account_balance_wallet</span>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white">亚马逊利润测算</h1>
                    <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Version 1.0 • Real-time Profit Simulation</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 mr-2">
                    <div className="relative">
                        <select
                            value={selectedProductId}
                            onChange={(e) => onProductSelect(e.target.value)}
                            className="appearance-none bg-[#0c0c0e] hover:bg-[#18181b] border border-[#27272a] hover:border-zinc-600 text-zinc-300 text-xs font-bold h-10 pl-4 pr-10 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[200px]"
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

                {/* Use shared ProductSchemeDropdown */}
                <ProductSchemeDropdown
                    models={recentProducts}
                    onSelectModel={onLoadModel}
                    accentColor="blue"
                />

                <button
                    onClick={onSaveClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-10 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    保存当前方案
                </button>
            </div>
        </div>
    );
};
