
import React, { useState, useEffect } from 'react';
import { SavedProfitModel } from '../types';
import { ProfitModelService } from '../services/profitModelService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const fmtUSD = (num: number) => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (num: number) => (num * 100).toFixed(1) + '%';

type SortKey = 'timestamp' | 'planBProfit' | 'planBMargin' | 'actualPrice' | 'productName';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'table' | 'comparison';

const ProductProfitList: React.FC = () => {
  const [models, setModels] = useState<SavedProfitModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<SavedProfitModel[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toDeleteIds, setToDeleteIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [models, search, sortKey, sortOrder]);

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
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortKey) {
        case 'timestamp':
          aVal = a.timestamp;
          bVal = b.timestamp;
          break;
        case 'planBProfit':
          aVal = a.results.planB.profit;
          bVal = b.results.planB.profit;
          break;
        case 'planBMargin':
          aVal = a.results.planB.margin;
          bVal = b.results.planB.margin;
          break;
        case 'actualPrice':
          aVal = a.inputs.actualPrice;
          bVal = b.inputs.actualPrice;
          break;
        case 'productName':
          aVal = a.productName.toLowerCase();
          bVal = b.productName.toLowerCase();
          break;
        default:
          aVal = a.timestamp;
          bVal = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredModels(filtered);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
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

  const getComparisonData = () => {
    const selected = filteredModels.filter(m => selectedIds.has(m.id));
    if (selected.length === 0) return [];

    return selected.map(m => ({
      name: `${m.label}\n${fmtUSD(m.inputs.actualPrice)}`,
      product: m.productName,
      利润率: (m.results.planB.margin * 100),
      净利润: m.results.planB.profit,
      售价: m.inputs.actualPrice,
      成本: m.results.planB.sellCost,
    }));
  };

  const SortIcon = ({ active, order }: { active: boolean, order: SortOrder }) => (
    <span className={`material-symbols-outlined text-xs transition-all ${active ? 'text-blue-500' : 'text-zinc-600'}`}>
      {active ? (order === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
    </span>
  );

  return (
    <div className="p-8 space-y-6 max-w-[1700px] mx-auto animate-in fade-in duration-700">
      {/* 顶部工具栏 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">利润模型</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">Profit Model Management</p>
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

          <div className="flex gap-2 border border-[#27272a] rounded-xl p-1 bg-[#111111]">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[16px]">table_rows</span>
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'comparison' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            </button>
          </div>
        </div>
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="text-blue-500 font-black text-sm">{selectedIds.size} 项已选中</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport(Array.from(selectedIds))}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              导出选中
            </button>
            <button
              onClick={() => handleDelete(Array.from(selectedIds))}
              className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-500 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              删除选中
            </button>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      {filteredModels.length === 0 ? (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-16 flex flex-col items-center justify-center">
          <div className="bg-[#1e293b] p-6 rounded-2xl mb-6 ring-1 ring-white/5">
            <span className="material-symbols-outlined text-6xl text-slate-400">analytics</span>
          </div>
          <h3 className="text-xl font-black text-slate-200 mb-2">暂无数据</h3>
          <p className="text-slate-500 text-sm">在利润计算器中保存方案后，数据将显示在这里</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/5">
          {/* Header Actions */}
          <div className="flex justify-between items-center px-5 py-3 bg-[#1e293b] border-b border-[#334155]">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
              Product Profit Models
            </h3>
            <button
              onClick={() => handleExport()}
              className="group flex items-center gap-2 px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-slate-200 rounded-md transition-all text-xs font-semibold shadow-sm ring-1 ring-inset ring-white/10"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>导出全部</span>
            </button>
          </div>

          <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-[#1e293b] border-b border-[#334155] text-[13px] uppercase tracking-wider text-slate-400 font-bold">
                  {/* Group 1: Product Info (Sticky) */}
                  <th rowSpan={2} className="px-3 py-3 text-left bg-[#1e293b] text-slate-300 sticky left-0 z-10 min-w-[150px] shadow-[4px_0_12px_rgba(0,0,0,0.25)] border-r border-[#334155]">
                    产品信息
                  </th>

                  {/* Group 2: Selling Price */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]" rowSpan={2}>售价 $</th>

                  {/* Group 3: Product Cost */}
                  <th colSpan={2} className="px-2 py-1 text-center border-r border-[#334155]">产品成本</th>

                  {/* Group 4: Logistics */}
                  <th colSpan={4} className="px-2 py-1 text-center border-r border-[#334155]">物流仓储</th>

                  {/* Group 5: Returns */}
                  <th colSpan={5} className="px-2 py-1 text-center border-r border-[#334155]">退货损耗</th>

                  {/* Group 6: Fees & Marketing */}
                  <th colSpan={4} className="px-2 py-1 text-center border-r border-[#334155]">费用 & 广告</th>

                  {/* Group 7: Profit Results */}
                  <th colSpan={5} className="px-2 py-1 text-center bg-[#1e293b] text-slate-300 border-l border-indigo-500/30">
                    核心利润指标
                  </th>

                  {/* Group 8: Actions */}
                  <th rowSpan={2} className="px-2 py-1 text-center bg-[#1e293b] border-l border-[#334155]">操作</th>
                </tr>
                <tr className="bg-[#1e293b] border-b border-[#334155] text-[11px] uppercase tracking-tight text-slate-500 font-bold">
                  {/* Product Cost Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">采购 ¥</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]">汇率</th>

                  {/* Logistics Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">头程 $</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">FBA $</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">杂费 $</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]">仓储 $</th>

                  {/* Returns Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">退货 %</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">不可售 %</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">处理费 $</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">管理费 $</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]">移除费 $</th>

                  {/* Fees & Ads Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">佣金 %</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">佣金 $</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 text-indigo-400">TACOS %</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]">广告费 $</th>

                  {/* Results Sub-headers */}
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 text-amber-500">总成本 <br /><span className="text-[9px] opacity-60 font-normal">(无广)</span></th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">盈亏平衡</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30">目标利润 %</th>
                  <th className="px-2 py-2 text-center border-r border-[#334155]/30 text-emerald-400">净利率 %</th>
                  <th className="px-2 py-2 text-center text-emerald-400 font-bold bg-[#1e293b]">净利润 $</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-slate-300">
                {filteredModels.map((model) => {
                  const res = model.results.planB;
                  const adminFee = (res.price * res.commRate * 0.20).toFixed(2);
                  const totalCostExclAds = res.sellCost.toFixed(2);

                  return (
                    <tr key={model.id} className="hover:bg-[#1e293b]/50 transition-colors border-b border-[#334155]/50 group">
                      {/* 1. Product Info (Sticky) */}
                      <td className="px-3 py-3 text-left bg-[#0f172a] sticky left-0 z-10 shadow-[4px_0_12px_rgba(0,0,0,0.25)] border-r border-[#334155]">
                        <div className="flex flex-col">
                          <span className="text-slate-100 font-bold text-sm truncate max-w-[140px]" title={model.productName}>{model.productName}</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            {model.label && (
                              <span className="px-1.5 py-0.5 bg-[#334155]/50 text-slate-400 rounded text-[10px] border border-[#334155]">
                                {model.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Selling Price */}
                      <td className="px-2 py-3 text-center border-r border-[#334155]">
                        <span className="font-bold text-white text-sm bg-[#1e293b]/50 px-2 py-1 rounded">${res.price.toFixed(2)}</span>
                      </td>

                      {/* 3. Product Cost */}
                      <td className="px-2 py-3 text-center text-slate-400 border-r border-[#334155]/30">¥{model.inputs.purchaseRMB}</td>
                      <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]">{model.inputs.exchangeRate}</td>

                      {/* 4. Logistics */}
                      <td className="px-2 py-3 text-center text-slate-400 border-r border-[#334155]/30">${model.inputs.shippingUSD}</td>
                      <td className="px-2 py-3 text-center text-slate-400 border-r border-[#334155]/30">${model.inputs.fbaFee}</td>
                      <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]/30">${model.inputs.miscFee}</td>
                      <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]">${model.inputs.storageFee}</td>

                      {/* 5. Returns */}
                      <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]/30">{model.inputs.returnRate}%</td>
                      <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]/30">{model.inputs.unsellableRate}%</td>
                      <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]/30">${model.inputs.retProcFee}</td>
                      <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]/30">${adminFee}</td>
                      <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]">${model.inputs.retRemFee}</td>

                      {/* 6. Fees & Ads */}
                      <td className="px-2 py-3 text-center text-slate-400 border-r border-[#334155]/30">{(res.commRate * 100).toFixed(0)}%</td>
                      <td className="px-2 py-3 text-center text-slate-400 border-r border-[#334155]/30">${res.commVal}</td>
                      <td className="px-2 py-3 text-center text-indigo-400 font-medium border-r border-[#334155]/30">{model.inputs.targetAcos}%</td>
                      <td className="px-2 py-3 text-center text-slate-400 border-r border-[#334155]">${res.adsVal}</td>

                      {/* 7. Results */}
                      <td className="px-2 py-3 text-center text-amber-500 font-medium border-r border-[#334155]/30">${totalCostExclAds}</td>
                      <td className="px-2 py-3 text-center text-slate-400 border-r border-[#334155]/30">${res.be}</td>
                      <td className="px-2 py-3 text-center text-slate-500 border-r border-[#334155]/30">{model.inputs.targetMargin}%</td>
                      <td className="px-2 py-3 text-center text-emerald-400 font-bold border-r border-[#334155]/30 bg-[#1e293b]/20">{(res.margin * 100).toFixed(1)}%</td>
                      <td className="px-2 py-3 text-center text-emerald-400 font-black text-sm bg-[#1e293b]/20">${res.profit}</td>

                      {/* 8. Actions */}
                      <td className="px-2 py-3 text-center border-l border-[#334155]/30">
                        <button
                          onClick={() => handleDelete([model.id])}
                          className="p-1.5 text-slate-600 hover:text-rose-500 transition-colors rounded hover:bg-[#334155]/50"
                          title="删除">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl p-8">
          {selectedIds.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="bg-zinc-900/50 p-6 rounded-2xl mb-6">
                <span className="material-symbols-outlined text-6xl text-zinc-700">bar_chart</span>
              </div>
              <h3 className="text-xl font-black text-white mb-2">请选择要对比的方案</h3>
              <p className="text-zinc-500 text-sm">在表格视图中选择多个方案后查看对比图表</p>
            </div>
          ) : (
            <div>
              <div className="mb-8">
                <h3 className="text-2xl font-black text-white mb-2">利润对比分析</h3>
                <p className="text-zinc-500 text-sm">已选中 {selectedIds.size} 个方案进行对比</p>
              </div>

              <div className="h-[500px] mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getComparisonData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '12px',
                        padding: '12px'
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '8px' }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Bar yAxisId="left" dataKey="净利润" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="成本" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="利润率" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )
      }


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
    </div >
  );
};

export default ProductProfitList;
