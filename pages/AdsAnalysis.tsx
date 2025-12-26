import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
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
  const [simBudget, setSimBudget] = useState<number>(10);
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

  // Manual Inputs (Used if no model selected)
  const [manualPrice, setManualPrice] = useState<number>(29.99);
  const [manualCost, setManualCost] = useState<number>(18.50);

  // Load Saved Models on mount
  useEffect(() => {
    // Determine strict sorting/loading - only once on mount
    const models = ProfitModelService.getAll().sort((a, b) => b.timestamp - a.timestamp);
    setSavedModels(models);
    if (models.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, []);

  // Determine Current Context for Simulator
  const context = useMemo(() => {
    const selectedModel = savedModels.find(m => m.id === selectedModelId);

    if (selectedModel) {
      const pb = selectedModel.results.planB;
      const totalDerivedCost = pb.price - pb.profit - (pb.adsVal || 0);

      const commRate = pb.commRate || 0.15;
      const commVal = pb.price * commRate;
      const fixedCost = totalDerivedCost - commVal;

      return {
        price: pb.price,
        cost: totalDerivedCost,
        fixedCost,
        commRate,
        name: selectedModel.productName,
        label: selectedModel.label
      };
    }

    // Manual Fallback
    const commRate = 0.15;
    const commVal = manualPrice * commRate;
    const fixedCost = manualCost - commVal;

    return {
      price: manualPrice,
      cost: manualCost,
      fixedCost,
      commRate,
      name: '自定义模拟',
      label: 'Manual'
    };
  }, [selectedModelId, savedModels, manualPrice, manualCost]);

  return (
    // OPTIMIZATION: Removed heavy 'animate-in' slide classes that cause layout thrashing on mount for large DOMs
    <div className="p-8 space-y-12 max-w-[1600px] mx-auto">

      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight text-white">广告投放分析</h2>
        <div className="flex justify-between items-center mt-2">
          <p className="text-zinc-500 text-sm">Real-time Advertising Simulation & Performance Analysis</p>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20">
            <span className="material-symbols-outlined text-[20px]">download</span>
            导出分析报告
          </button>
        </div>
      </div>

      {/* --- Module 1: Advertising Simulator --- */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/10 p-2.5 rounded-xl border border-purple-600/20">
              <span className="material-symbols-outlined text-purple-500">science</span>
            </div>
            <h3 className="text-xl font-black text-white">投放模拟器</h3>
          </div>

          {/* Data Source Selector */}
          <div className="flex items-center gap-4 bg-[#111111] border border-zinc-800 rounded-lg p-1.5 px-3">
            <span className="text-[11px] font-bold text-zinc-500 uppercase">数据源:</span>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="bg-zinc-900 border-none text-xs font-bold text-white rounded outline-none w-48 py-1"
            >
              <option value="">-- 手动输入 --</option>
              {savedModels.map(m => (
                <option key={m.id} value={m.id}>
                  {m.productName} ({new Date(m.timestamp).toLocaleDateString()}) - ${m.results.planB.price}
                </option>
              ))}
            </select>

            {/* Manual Inputs (only show if no model selected) */}
            {!selectedModelId && (
              <div className="flex items-center gap-3 pl-3 border-l border-zinc-700">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500">售价 $</span>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={e => setManualPrice(Number(e.target.value))}
                    className="w-16 bg-zinc-800 border-none rounded text-xs font-bold text-white text-center py-1"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500">成本 $</span>
                  <input
                    type="number"
                    value={manualCost}
                    onChange={e => setManualCost(Number(e.target.value))}
                    className="w-16 bg-zinc-800 border-none rounded text-xs font-bold text-white text-center py-1"
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
              productCost={context.cost}
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
