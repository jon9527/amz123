import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { MOCK_KPIS, MOCK_CAMPAIGNS } from '../constants';
import { AdvertisingAnalysisPanel } from '../components/AdvertisingAnalysisPanel';
import { SensitivityMatrix } from '../components/SensitivityMatrix';
import { ProfitModelService } from '../services/profitModelService';
import { SavedProfitModel } from '../types';

// Memoize Child Components to prevent unnecessary re-renders
const MemoizedAdPanel = React.memo(AdvertisingAnalysisPanel);
const MemoizedSensitivityMatrix = React.memo(SensitivityMatrix);

const AdsAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('广告系列');

  // --- Simulation State (Shared) ---
  const [simBudget, setSimBudget] = useState<number>(100);
  const [simCpc, setSimCpc] = useState<number>(0.54);
  const [simCvr, setSimCvr] = useState<number>(10);

  // OPTIMIZATION: Defer the updates to the Matrix. 
  // This keeps the Input Fields (AdPanel) responsive (High Priority)
  // while the Matrix updates slightly later (Low Priority).
  const deferredBudget = useDeferredValue(simBudget);
  const deferredCpc = useDeferredValue(simCpc);
  const deferredCvr = useDeferredValue(simCvr);

  const [savedModels, setSavedModels] = useState<SavedProfitModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // Dropdown State
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Manual Inputs (Used if no model selected)
  const [manualPrice, setManualPrice] = useState<number>(29.99);
  const [manualCost, setManualCost] = useState<number>(18.50);

  // Load Saved Models on mount
  useEffect(() => {
    const models = ProfitModelService.getAll().sort((a, b) => b.timestamp - a.timestamp);
    setSavedModels(models);
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, []);

  // Group models by product name
  const groupedModels = useMemo(() => {
    const groups: Record<string, SavedProfitModel[]> = {};
    savedModels.forEach(m => {
      const key = m.productName || '未分类';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [savedModels]);

  // Toggle group expand/collapse
  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  }, []);

  // Get selected model for display
  const selectedModel = savedModels.find(m => m.id === selectedModelId);

  // Determine Current Context for Simulator
  const context = useMemo(() => {
    const selectedModel = savedModels.find(m => m.id === selectedModelId);

    if (selectedModel) {
      const pb = selectedModel.results.planB;
      // 直接使用模型中的数据
      // grossProfit = 广告前毛利 = 净利润 + 广告费
      const grossProfit = pb.profit + (pb.adsVal || 0);
      const commRate = pb.commRate || 0.15;
      // fixedCost = sellCost - 佣金 (用于 SensitivityMatrix)
      const fixedCost = pb.sellCost - (pb.price * commRate);

      return {
        price: pb.price,
        cost: pb.sellCost,        // 包含所有成本
        grossProfit,              // 广告前毛利
        fixedCost,                // 不含佣金的成本
        commRate,
        name: selectedModel.productName,
        label: selectedModel.label
      };
    }

    // Manual Fallback
    const commRate = 0.15;
    const grossProfit = manualPrice - manualCost;
    const fixedCost = manualCost - (manualPrice * commRate);

    return {
      price: manualPrice,
      cost: manualCost,
      grossProfit,
      fixedCost,
      commRate,
      name: '自定义模拟',
      label: 'Manual'
    };
  }, [selectedModelId, savedModels, manualPrice, manualCost]);

  // 当切换模型时，自动将 simCpc 设置为盈亏平衡 CPC
  // 盈亏 CPC = 广告前毛利 × 转化率%
  useEffect(() => {
    const breakEvenCpc = context.grossProfit * (simCvr / 100);
    if (breakEvenCpc > 0) {
      setSimCpc(parseFloat(breakEvenCpc.toFixed(2)));
    }
  }, [selectedModelId, context.grossProfit]);

  return (
    // OPTIMIZATION: Removed heavy 'animate-in' slide classes that cause layout thrashing on mount for large DOMs
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

      <div className="flex flex-col gap-0.5">
        <h2 className="text-2xl font-black tracking-tight text-white">广告投放模拟</h2>
        <p className="text-zinc-500 text-xs">Real-time Advertising Simulation & Performance Analysis</p>
      </div>

      {/* --- Module 1: Advertising Simulator --- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/10 p-2.5 rounded-xl border border-purple-600/20">
              <span className="material-symbols-outlined text-purple-500">science</span>
            </div>
            <h3 className="text-xl font-black text-white">投放模拟器</h3>
          </div>

          {/* Current Model Indicator + Data Source Selector */}
          <div className="flex items-center gap-3">
            {/* Current Model Indicator with breathing light */}
            {selectedModel && (
              <div className="flex items-center gap-2.5 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                </span>
                <span className="text-xs text-zinc-400">当前方案:</span>
                <span className="text-sm font-bold text-white">{selectedModel.productName}</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-medium">
                  {selectedModel.label || '无标签'}
                </span>
                <span className="text-sm font-black font-mono text-zinc-300">${selectedModel.inputs.actualPrice}</span>
                <span className={`text-[10px] font-bold flex items-center gap-0.5 ${(selectedModel.results?.planB?.margin ?? 0) * 100 >= 20 ? 'text-emerald-400' : (selectedModel.results?.planB?.margin ?? 0) * 100 >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                  <span className="material-symbols-outlined text-[12px]">trending_up</span>
                  {((selectedModel.results?.planB?.margin ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            )}

            {/* Data Source Selector - Custom Grouped Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 bg-[#0c0c0e] border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-2.5 shadow-lg transition-colors"
              >
                <span className="material-symbols-outlined text-purple-500 text-lg">description</span>
                <span className="text-sm font-bold text-white">导入数据</span>
                <span className="material-symbols-outlined text-zinc-500 text-sm">{showDropdown ? 'expand_less' : 'expand_more'}</span>
              </button>

              {/* Dropdown Panel */}
              {showDropdown && (
                <div
                  className="absolute right-0 mt-2 w-[320px] bg-[#111111] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="max-h-[360px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                    {/* Manual Mode Option */}
                    <button
                      className={`w-full text-left px-4 py-2.5 hover:bg-zinc-800 transition-colors flex items-center gap-2 border-b border-zinc-800 ${!selectedModelId ? 'bg-purple-900/20' : ''}`}
                      onClick={() => { setSelectedModelId(''); setShowDropdown(false); }}
                    >
                      <span className="material-symbols-outlined text-zinc-500 text-sm">edit</span>
                      <span className="text-sm font-bold text-zinc-300">-- 手动输入 --</span>
                    </button>

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
                                const marginPct = (model.results?.planB?.margin ?? 0) * 100;
                                const marginColor = marginPct >= 20 ? 'text-emerald-400' : marginPct >= 10 ? 'text-yellow-400' : 'text-red-400';
                                const isSelected = model.id === selectedModelId;

                                return (
                                  <button
                                    key={model.id}
                                    className={`w-full text-left pl-9 pr-4 py-2 hover:bg-zinc-800 transition-colors flex items-center justify-between border-l-2 ml-1 ${isSelected ? 'bg-purple-900/20 border-purple-500' : 'border-transparent hover:border-purple-500/50'}`}
                                    onClick={() => { setSelectedModelId(model.id); setShowDropdown(false); }}
                                  >
                                    <span className={`text-[10px] ${isSelected ? 'bg-purple-500/30 text-purple-300' : 'bg-purple-500/15 text-purple-400'} border border-purple-500/20 px-1.5 py-0.5 rounded font-medium truncate max-w-[110px]`}>
                                      {model.label || '无标签'}
                                    </span>
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
                </div>
              )}
            </div>

            {/* Manual Inputs (only show if no model selected) */}
            {!selectedModelId && (
              <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-700/50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500">售价 $</span>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={e => setManualPrice(Number(e.target.value))}
                    className="w-16 bg-zinc-800 border border-zinc-700 rounded text-xs font-bold text-white text-center py-1"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500">成本 $</span>
                  <input
                    type="number"
                    value={manualCost}
                    onChange={e => setManualCost(Number(e.target.value))}
                    className="w-16 bg-zinc-800 border border-zinc-700 rounded text-xs font-bold text-white text-center py-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* The Simulator Panel & Sensitivity Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Input & Analysis Panel - High Priority Updates */}
          <div className="w-full">
            <MemoizedAdPanel
              sellingPrice={context.price}
              productCost={context.price - context.grossProfit} // Panel 内部用 price - cost = grossProfit
              // Direct State (Immediate Response)
              budget={simBudget}
              onBudgetChange={setSimBudget}
              cpc={simCpc}
              onCpcChange={setSimCpc}
              cvr={simCvr}
              onCvrChange={setSimCvr}
            />
          </div>

          {/* Right: Sensitivity Matrix (New) - Defer updates to prevent input lag */}
          <div className="w-full h-full">
            <MemoizedSensitivityMatrix
              basePrice={context.price}
              baseCpc={deferredCpc} // Deferred
              baseCvr={deferredCvr} // Deferred
              totalBudget={deferredBudget} // Deferred
              fixedCost={context.fixedCost}
              commRate={context.commRate}
            />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>

      {/* --- Module 2: Campaign Reports (Mock Data) --- */}
      <section className="space-y-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-zinc-800 p-2 rounded-lg">
            <span className="material-symbols-outlined text-zinc-400">table_chart</span>
          </div>
          <h3 className="text-lg font-bold text-zinc-300">历史广告报表 (Mock Data)</h3>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {MOCK_KPIS.map((kpi) => (
            <div key={kpi.label} className="bg-[#111111] p-5 rounded-2xl border border-[#27272a] flex flex-col gap-4 shadow-sm group hover:border-zinc-700 transition-all">
              <div className="flex justify-between items-start">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{kpi.label}</p>
                <div className={`p-2 rounded-lg bg-zinc-900 group-hover:scale-110 transition-transform`}>
                  <span className={`material-symbols-outlined text-[18px] text-${kpi.color}`}>{kpi.icon}</span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black font-mono text-white tracking-tight">{kpi.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Table Section */}
        <div className="bg-[#111111] rounded-2xl border border-[#27272a] overflow-hidden flex flex-col shadow-xl">
          <div className="flex border-b border-[#27272a] overflow-x-auto no-scrollbar bg-[#0c0c0e]">
            {['广告系列', '广告组', '关键词', '搜索词', '推广产品'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-5 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${activeTab === tab
                  ? 'border-blue-600 text-blue-600 bg-blue-600/5'
                  : 'border-transparent text-zinc-500 hover:text-white hover:bg-[#18181b]'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#0c0c0e] text-[10px] uppercase text-zinc-500 font-black tracking-widest">
                <tr>
                  <th className="px-6 py-4 w-10"><input type="checkbox" className="rounded border-zinc-800 bg-[#18181b]" /></th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4">广告系列名称</th>
                  <th className="px-6 py-4 text-right">花费</th>
                  <th className="px-6 py-4 text-right">销售额</th>
                  <th className="px-6 py-4 text-right">ACOS</th>
                  <th className="px-6 py-4 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {MOCK_CAMPAIGNS.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-[#18181b]/50 transition-colors group">
                    <td className="px-6 py-4"><input type="checkbox" className="rounded border-zinc-800 bg-[#18181b]" /></td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${campaign.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                        {campaign.status === 'Active' ? '正在运行' : '已暂停'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-white group-hover:text-blue-500 transition-colors cursor-pointer">{campaign.name}</td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-400">￥{campaign.spend.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-400">￥{campaign.sales.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono font-bold ${campaign.acos < 30 ? 'text-emerald-500' : 'text-orange-500'}`}>{campaign.acos.toFixed(1)}%</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-400">{campaign.roas.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdsAnalysis;
