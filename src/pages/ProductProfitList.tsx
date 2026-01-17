
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { SavedProfitModel } from '../types';
import { ProfitModelService } from '../services/profitModelService';
import { useProducts } from '../contexts/ProductContext';


import { getTagColor } from '../utils/tagColors';
import { ReplenishmentModal } from '../components/ReplenishmentModal';



const ProductProfitList: React.FC = () => {
  const { products } = useProducts();
  const [models, setModels] = useState<SavedProfitModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<SavedProfitModel[]>([]);
  const [search, setSearch] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toDeleteIds, setToDeleteIds] = useState<string[]>([]);

  const [activeReplProductId, setActiveReplProductId] = useState<string | null>(null);

  // Grouped view state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Compute grouped models from filteredModels
  const groupedModels = React.useMemo(() => {
    const groups: Record<string, SavedProfitModel[]> = {};
    filteredModels.forEach(m => {
      const name = m.productName || '未命名产品';
      if (!groups[name]) groups[name] = [];
      groups[name].push(m);
    });
    return groups;
  }, [filteredModels]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [models, search]);

  const loadData = () => {
    const data = ProfitModelService.getAll();
    setModels(data);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...models];

    // 搜索过滤
    if (search) {
      filtered = ProfitModelService.search(search);
    }

    // 排序

    setFilteredModels(filtered);
  };



  const handleDelete = (ids: string[]) => {
    setToDeleteIds(ids);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    ProfitModelService.batchDelete(toDeleteIds);
    setSelectedIds(new Set());
    loadData();
    setShowDeleteConfirm(false);
    setToDeleteIds([]);
  };

  const handleExport = (ids?: string[]) => {
    const json = ProfitModelService.exportToJSON(ids);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit-models-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get all unique tags across all models
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    models.forEach(m => {
      (m.tags || []).forEach(tag => tagSet.add(tag));
      // Also include old label if exists
      if (m.label && !m.tags?.includes(m.label)) tagSet.add(m.label);
    });
    return Array.from(tagSet).sort();
  }, [models]);

  // Tag dropdown state
  const [showTagDropdown, setShowTagDropdown] = useState<string | null>(null);
  const [tagSearchValue, setTagSearchValue] = useState('');
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowTagDropdown(null);
    if (showTagDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showTagDropdown]);

  // Add tag to model
  const addTagToModel = (modelId: string, tag: string) => {
    const model = models.find(m => m.id === modelId);
    if (model && tag.trim()) {
      const currentTags = model.tags || [];
      if (!currentTags.includes(tag.trim())) {
        const updatedModel = { ...model, tags: [...currentTags, tag.trim()] };
        ProfitModelService.update(modelId, updatedModel);
        loadData();
      }
    }
    setShowTagDropdown(null);
    setTagSearchValue('');
  };

  // Remove tag from model
  // Remove tag from model (handles both tags array and old label field)
  const removeTagFromModel = (modelId: string, tagToRemove: string) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      const currentTags = model.tags || [];
      const updatedModel = {
        ...model,
        tags: currentTags.filter(t => t !== tagToRemove),
        // Also clear label if it matches the tag being removed
        label: model.label === tagToRemove ? '' : model.label
      };
      ProfitModelService.update(modelId, updatedModel);
      loadData();
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredModels.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredModels.map(m => m.id)));
    }
  };



  return (
    <div className="p-8 space-y-6 max-w-[1700px] mx-auto animate-in fade-in duration-700">
      {/* 顶部工具栏 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <span className="material-symbols-outlined text-white">savings</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">利润模型</h2>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Profit Model Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[18px]">search</span>
            <input
              type="text"
              placeholder="搜索品名或标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111111] border border-[#27272a] rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
            />
          </div>


        </div>
      </div>



      {/* 内容区域 */}
      {filteredModels.length === 0 ? (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-16 flex flex-col items-center justify-center">
          <div className="bg-[#1e293b] p-6 rounded-2xl mb-6 ring-1 ring-white/5">
            <span className="material-symbols-outlined text-6xl text-slate-400">analytics</span>
          </div>
          <h3 className="text-xl font-black text-slate-200 mb-2">暂无数据</h3>
          <p className="text-slate-500 text-sm">在利润计算器中保存方案后，数据将显示在这里</p>
        </div>
      ) : (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5">
          {/* Header Actions */}
          <div className="flex justify-between items-center px-5 py-3 bg-[#1e293b] border-b border-[#334155]">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
              Product Profit Models
              <span className="text-[10px] text-slate-500 font-normal ml-2">({Object.keys(groupedModels).length} 产品, {filteredModels.length} 方案)</span>
            </h3>
            <div className="flex items-center gap-1.5">
              {/* 展开/折叠切换按钮 */}
              <button
                onClick={() => {
                  const allGroupNames = Object.keys(groupedModels);
                  const allExpanded = allGroupNames.every(name => expandedGroups.has(name));
                  if (allExpanded) {
                    setExpandedGroups(new Set());
                  } else {
                    setExpandedGroups(new Set(allGroupNames));
                  }
                }}
                className="p-2 bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                title={Object.keys(groupedModels).every(name => expandedGroups.has(name)) ? '折叠全部' : '展开全部'}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {Object.keys(groupedModels).every(name => expandedGroups.has(name)) ? 'unfold_less' : 'unfold_more'}
                </span>
              </button>

              <div className="w-px h-5 bg-slate-600 mx-1"></div>

              {/* 选中数量 - 固定宽度 */}
              <span className={`text-xs font-bold w-8 text-center transition-opacity ${selectedIds.size > 0 ? 'text-blue-400 opacity-100' : 'opacity-0'}`}>
                {selectedIds.size || 0}项
              </span>

              {/* 智能导出按钮：有选中导出选中，无选中导出全部 */}
              <button
                onClick={() => selectedIds.size > 0 ? handleExport(Array.from(selectedIds)) : handleExport()}
                className={`p-2 rounded-lg transition-all ${selectedIds.size > 0 ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400' : 'bg-slate-700/50 hover:bg-slate-600 text-slate-300'}`}
                title={selectedIds.size > 0 ? `导出选中 (${selectedIds.size}项)` : '导出全部'}
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
              </button>

              {/* 删除选中 - 使用 opacity 控制显隐 */}
              <button
                onClick={() => selectedIds.size > 0 && handleDelete(Array.from(selectedIds))}
                className={`p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all ${selectedIds.size > 0 ? 'opacity-100 cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}
                title="删除选中"
                disabled={selectedIds.size === 0}
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>

            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse min-w-[1250px]" style={{ tableLayout: 'fixed' }}>
              <thead className="sticky top-0 z-20">
                {/* Row 1: Group Headers */}
                <tr className="bg-[#1e293b] border-b border-[#334155] text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  {/* Checkbox */}
                  <th rowSpan={2} className="px-2 py-2 text-center bg-[#1e293b] border-r border-[#334155]" style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredModels.length && filteredModels.length > 0}
                      onChange={selectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                    />
                  </th>
                  {/* 产品信息 */}
                  <th rowSpan={2} className="px-3 py-2 text-center bg-[#1e293b] text-slate-300 sticky left-0 z-10 shadow-[4px_0_12px_rgba(0,0,0,0.25)] border-r border-[#334155]" style={{ width: '130px' }}>
                    产品信息
                  </th>
                  {/* 售价 */}
                  <th rowSpan={2} className="px-2 py-2 text-center border-r border-[#334155] bg-[#1e293b]" style={{ width: '75px' }}>售价</th>
                  {/* 采购成本 */}
                  <th rowSpan={2} className="px-2 py-2 text-center border-r border-[#334155] bg-blue-500/10 text-blue-300" style={{ width: '65px' }}>采购成本</th>
                  {/* 头程 - 单独 */}
                  {/* 头程 - 单独 */}
                  <th rowSpan={2} className="px-2 py-2 text-center border-r border-[#334155] bg-sky-500/10 text-sky-300 leading-tight" style={{ width: '55px' }}>
                    <div>头程</div><div>物流</div>
                  </th>
                  {/* 运费仓储 Group (FBA配送费/仓储杂费) */}
                  <th colSpan={2} className="px-2 py-1 text-center border-r border-[#334155] bg-cyan-500/15 text-cyan-300">运费仓储</th>
                  {/* 退货损耗 */}
                  <th rowSpan={2} className="px-1 py-2 text-center border-r border-[#334155] bg-rose-500/10 text-rose-300 leading-tight" style={{ width: '50px' }}>
                    <div>退货</div><div>损耗</div>
                  </th>
                  {/* 佣金 Group */}
                  <th colSpan={2} className="px-2 py-1 text-center border-r border-[#334155] bg-orange-500/15 text-orange-300">佣金</th>
                  {/* 广告 Group */}
                  <th colSpan={2} className="px-2 py-1 text-center border-r border-[#334155] bg-purple-500/15 text-purple-300">广告(TACOS)</th>
                  {/* 盈亏平衡 */}
                  <th rowSpan={2} className="px-1 py-2 text-center border-r border-[#334155] bg-slate-600/20 text-slate-300 leading-tight" style={{ width: '50px' }}>
                    <div>盈亏</div><div>平衡</div>
                  </th>
                  {/* 回款 Group */}
                  <th colSpan={2} className="px-2 py-1 text-center border-r border-[#334155] bg-green-500/15 text-green-300">回款</th>
                  {/* 售卖成本 Group - 新增 */}
                  <th colSpan={2} className="px-2 py-1 text-center border-r border-[#334155] bg-amber-500/15 text-amber-300">售卖成本</th>
                  {/* 利润 Group */}
                  <th colSpan={3} className="px-2 py-1 text-center border-r border-[#334155] bg-emerald-500/15 text-emerald-300">利润</th>
                  {/* 操作 */}
                  <th rowSpan={2} className="px-2 py-2 text-center bg-[#1e293b]" style={{ width: '45px' }}>操作</th>
                </tr>
                {/* Row 2: Sub-headers */}
                <tr className="bg-[#1e293b] border-b border-[#334155] text-[10px] uppercase tracking-tight text-slate-500 font-bold">
                  {/* 运费仓储 Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 bg-cyan-500/10" style={{ width: '60px' }}>FBA配送费</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155] bg-cyan-500/10" style={{ width: '60px' }}>仓储杂费</th>
                  {/* 佣金 Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 bg-orange-500/10" style={{ width: '45px' }}>占比</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155] bg-orange-500/10" style={{ width: '50px' }}>金额</th>
                  {/* 广告 Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 bg-purple-500/10" style={{ width: '45px' }}>占比</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155] bg-purple-500/10" style={{ width: '50px' }}>金额</th>
                  {/* 回款 Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 bg-green-500/10" style={{ width: '45px' }}>回款率</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155] bg-green-500/10" style={{ width: '55px' }}>金额</th>
                  {/* 售卖成本 Sub-headers - 新增 */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 bg-amber-500/10" style={{ width: '45px' }}>占比</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155] bg-amber-500/10" style={{ width: '55px' }}>金额</th>
                  {/* 利润 Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 bg-emerald-500/10 text-slate-400" style={{ width: '50px' }}>目标率</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 bg-emerald-500/10 text-emerald-400" style={{ width: '45px' }}>净利率</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155] bg-emerald-500/10 text-emerald-400 font-bold" style={{ width: '55px' }}>净利润</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-300">
                {(Object.entries(groupedModels) as [string, SavedProfitModel[]][]).map(([groupName, groupItems]) => {
                  const isExpanded = expandedGroups.has(groupName);
                  const groupSelectedCount = groupItems.filter(m => selectedIds.has(m.id)).length;


                  return (
                    <React.Fragment key={groupName}>
                      {/* Group Header Row */}
                      {(() => {
                        // Get SKU from first model's linked product
                        const firstModel = groupItems[0];
                        const linkedProduct = firstModel?.productId
                          ? products.find(p => p.id === firstModel.productId)
                          : null;
                        const sku = linkedProduct?.sku || '';

                        return (
                          <tr
                            className="bg-[#1e293b] border-b border-[#334155] cursor-pointer hover:bg-[#334155] transition-colors group"
                            onClick={() => toggleGroup(groupName)}
                          >
                            <td
                              colSpan={20}
                              className="px-3 py-1.5 sticky left-0 z-10 bg-[#1e293b] group-hover:bg-[#334155] transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                >
                                  chevron_right
                                </span>
                                <span className="font-bold text-slate-100 text-sm w-48 truncate" title={groupName}>{groupName}</span>
                                {sku && (
                                  <span className="w-32 flex-shrink-0">
                                    <span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-[10px] font-mono block truncate">
                                      SKU: {sku}
                                    </span>
                                  </span>
                                )}
                                <span className="w-20 flex-shrink-0">
                                  <span className="px-2 py-0.5 bg-[#334155] text-slate-400 rounded-full text-[10px] font-bold block w-fit">
                                    {groupItems.length} 个方案
                                  </span>
                                </span>
                                {groupSelectedCount > 0 && (
                                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold">
                                    已选 {groupSelectedCount}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Action Column for Group Header - Replenishment Plan Button */}
                            <td className="px-2 py-1.5 text-center bg-[#1e293b] group-hover:bg-[#334155] transition-colors border-l border-[#334155]/50" onClick={(e) => e.stopPropagation()}>
                              {linkedProduct && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveReplProductId(linkedProduct.id);
                                  }}
                                  className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-500 rounded transition-colors"
                                  title="查看补货方案"
                                >
                                  <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Group Items */}
                      {isExpanded && groupItems.map((model) => {
                        const res = model.results.planB;

                        return (
                          <tr key={model.id} className="bg-[#0f172a] hover:bg-[#1e293b] transition-colors border-b border-[#334155]/30 group">
                            {/* Checkbox */}
                            <td className="px-2 py-2 text-center border-r border-[#334155]/30">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(model.id)}
                                onChange={() => toggleSelect(model.id)}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                              />
                            </td>
                            {/* 1. Product Info (Sticky) - Shows multiple tags */}
                            <td className="px-3 py-2 text-left bg-[#0f172a] group-hover:bg-[#1e293b] transition-colors sticky left-0 z-10 shadow-[4px_0_12px_rgba(0,0,0,0.25)] border-r border-[#334155]">
                              <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                                {/* Display existing tags - include old label if exists */}
                                {(() => {
                                  const allTags = model.tags || [];
                                  // Add old label if it exists and isn't already in tags
                                  if (model.label && !allTags.includes(model.label)) {
                                    allTags.push(model.label);
                                  }
                                  return allTags;
                                })().map((tag, i) => {
                                  const tagColor = getTagColor(tag);
                                  return (
                                    <span
                                      key={i}
                                      className={`px-2 py-0.5 ${tagColor.bg} ${tagColor.text} rounded text-[9px] font-medium flex items-center gap-1 w-fit`}
                                    >
                                      <span className="whitespace-nowrap">{tag}</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); removeTagFromModel(model.id, tag); }}
                                        className="hover:text-red-400 transition-colors opacity-70 hover:opacity-100 flex-shrink-0"
                                        title="删除标签"
                                      >
                                        <span className="material-symbols-outlined text-[10px]">close</span>
                                      </button>
                                    </span>
                                  );
                                })}
                                {/* Add tag button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                                    setShowTagDropdown(showTagDropdown === model.id ? null : model.id);
                                  }}
                                  className="px-2 py-0.5 bg-[#334155]/30 text-slate-500 rounded text-[9px] flex items-center gap-1 w-fit hover:bg-[#334155]/50 hover:text-slate-400 transition-all"
                                  title="添加标签"
                                >
                                  <span className="material-symbols-outlined text-[10px]">add</span>
                                  <span>添加</span>
                                </button>
                                {showTagDropdown === model.id && ReactDOM.createPortal(
                                  <div
                                    className="fixed z-[9999] bg-[#1e293b] border border-[#334155] rounded-lg shadow-2xl w-44 p-2"
                                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <input
                                      type="text"
                                      value={tagSearchValue}
                                      onChange={e => setTagSearchValue(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && tagSearchValue.trim()) {
                                          addTagToModel(model.id, tagSearchValue);
                                        }
                                        if (e.key === 'Escape') setShowTagDropdown(null);
                                      }}
                                      className="w-full px-2 py-1.5 bg-[#0f172a] border border-[#334155] rounded text-xs text-white outline-none mb-2"
                                      autoFocus
                                      placeholder="搜索或创建标签..."
                                    />
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                      {allTags
                                        .filter(t => !model.tags?.includes(t) && t !== model.label)
                                        .filter(t => t.toLowerCase().includes(tagSearchValue.toLowerCase()))
                                        .slice(0, 6)
                                        .map(tag => {
                                          const tagColor = getTagColor(tag);
                                          return (
                                            <button
                                              key={tag}
                                              onClick={() => addTagToModel(model.id, tag)}
                                              className={`w-full px-2 py-1 text-left text-xs rounded ${tagColor.bg} ${tagColor.text} ${tagColor.hover} transition-colors`}
                                            >
                                              {tag}
                                            </button>
                                          );
                                        })}
                                      {tagSearchValue.trim() && !allTags.includes(tagSearchValue.trim()) && (
                                        <button
                                          onClick={() => addTagToModel(model.id, tagSearchValue)}
                                          className="w-full px-2 py-1 text-left text-xs rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                                        >
                                          + 创建 "{tagSearchValue.trim()}"
                                        </button>
                                      )}
                                    </div>
                                  </div>,
                                  document.body
                                )}
                              </div>
                            </td>

                            {/* 2. 售价 */}
                            <td className="px-2 py-3 text-center border-r border-[#334155]">
                              <span className="font-bold text-white text-xs bg-[#1e293b]/50 px-2 py-1 rounded">${res.price.toFixed(2)}</span>
                            </td>

                            {/* 3. 采购成本 (USD) - Blue */}
                            <td className="px-2 py-3 text-center text-blue-300 border-r border-[#334155] bg-blue-500/5">${model.results.costProdUSD.toFixed(2)}</td>

                            {/* 4. 头程 - Sky (单独) */}
                            <td className="px-2 py-3 text-center text-sky-300 border-r border-[#334155] bg-sky-500/5">${model.inputs.shippingUSD}</td>

                            {/* 仓配组: FBA/仓储杂费 - Cyan */}
                            <td className="px-2 py-3 text-center text-cyan-300 border-r border-[#334155]/30 bg-cyan-500/5">${model.inputs.fbaFee}</td>
                            <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155] bg-cyan-500/5">${(model.inputs.miscFee + model.inputs.storageFee).toFixed(2)}</td>

                            {/* 退货损耗 (合计) - Rose */}
                            <td className="px-1 py-3 text-center text-rose-400 text-xs font-medium border-r border-[#334155] bg-rose-500/5">${res.ret.toFixed(2)}</td>

                            {/* 佣金组: 占比/金额 - Orange */}
                            <td className="px-2 py-3 text-center text-orange-400 border-r border-[#334155]/30 bg-orange-500/5">{(res.commRate * 100).toFixed(0)}%</td>
                            <td className="px-2 py-3 text-center text-orange-300 border-r border-[#334155] bg-orange-500/5">${res.commVal}</td>

                            {/* 广告组: 占比/金额 - Purple */}
                            <td className="px-2 py-3 text-center text-purple-400 font-medium border-r border-[#334155]/30 bg-purple-500/5">{model.inputs.targetAcos}%</td>
                            <td className="px-2 py-3 text-center text-purple-300 border-r border-[#334155] bg-purple-500/5">${res.adsVal}</td>

                            {/* 盈亏平衡 */}
                            <td className="px-1 py-3 text-center text-slate-300 text-xs font-medium border-r border-[#334155] bg-slate-600/5">${res.be}</td>

                            {/* 回款组: 回款率/金额 - Green */}
                            {(() => {
                              const recall = res.price - res.commVal - model.inputs.fbaFee - res.adsVal - res.ret - model.inputs.storageFee - model.inputs.miscFee;
                              const recallRate = res.price > 0 ? (recall / res.price) * 100 : 0;
                              return (
                                <>
                                  <td className="px-2 py-3 text-center text-green-400 border-r border-[#334155]/30 bg-green-500/5">{recallRate.toFixed(1)}%</td>
                                  <td className="px-2 py-3 text-center text-green-300 font-medium border-r border-[#334155] bg-green-500/5">${recall.toFixed(2)}</td>
                                </>
                              );
                            })()}

                            {/* 售卖成本组: 占比/金额 - Amber (新增) */}
                            {(() => {
                              const sellCostRatio = res.price > 0 ? (res.sellCost / res.price) * 100 : 0;
                              return (
                                <>
                                  <td className="px-2 py-3 text-center text-amber-400 border-r border-[#334155]/30 bg-amber-500/5">{sellCostRatio.toFixed(1)}%</td>
                                  <td className="px-2 py-3 text-center text-amber-300 font-medium border-r border-[#334155] bg-amber-500/5">${res.sellCost.toFixed(2)}</td>
                                </>
                              );
                            })()}

                            {/* 利润组: 目标/利率/净利 - Emerald */}
                            <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]/30 bg-emerald-500/5">{model.inputs.targetMargin}%</td>
                            <td className="px-2 py-3 text-center text-emerald-400 font-bold border-r border-[#334155]/30 bg-emerald-500/10">{(res.margin * 100).toFixed(1)}%</td>
                            <td className="px-2 py-3 text-center text-emerald-400 font-bold text-xs bg-emerald-500/10">${res.profit}</td>

                            {/* 操作 */}
                            <td className="px-1 py-3">
                              <div className="flex items-center justify-center h-full">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete([model.id]); }}
                                  className="p-1 text-slate-600 hover:text-rose-500 transition-colors rounded hover:bg-[#334155]/50"
                                  title="删除">
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {
        showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0c0c0e] border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[#27272a] flex items-center gap-3">
                <div className="bg-red-600/10 p-2.5 rounded-xl border border-red-500/20">
                  <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">确认删除</h2>
                  <p className="text-xs text-zinc-500 font-bold mt-0.5">此操作不可恢复</p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-zinc-400">
                  确定要删除选中的 <span className="text-white font-bold">{toDeleteIds.length}</span> 个方案吗？
                </p>
              </div>
              <div className="p-6 border-t border-[#27272a] flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* 补货 Modal */}
      {
        activeReplProductId && (
          <ReplenishmentModal
            strategies={filteredModels.filter(m => m.productId === activeReplProductId)} // Pass all known strategies for context if needed
            productId={activeReplProductId}
            productName={products.find(p => p.id === activeReplProductId)?.name}
            onClose={() => setActiveReplProductId(null)}
            onSave={(modelId: string, updates: Partial<SavedProfitModel>) => {
              console.log('[Debug] ProductProfitList onSave', modelId, updates);
              const success = ProfitModelService.update(modelId, updates);
              if (success) {
                // Optimistic update with explicit null
                setModels(prev => prev.map(m => {
                  if (m.id === modelId) {
                    const newModel = { ...m, ...updates };
                    if (updates.replenishment === null) {
                      delete (newModel as any).replenishment;
                    }
                    return newModel;
                  }
                  return m;
                }));

                // Force sync with storage after a tick to ensure write completes
                setTimeout(() => loadData(), 50);
              }
            }}

          />
        )
      }
    </div >
  );
};

export default ProductProfitList;
