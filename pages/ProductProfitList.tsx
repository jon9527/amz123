
import React, { useState } from 'react';

const fmtUSD = (num: number) => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (num: number) => (num).toFixed(1) + '%';

interface ProductProfitRecord {
  id: string;
  name: string;
  asin: string;
  img: string;
  // 运营目标
  targetAcos: number;
  targetMargin: number;
  // 产品成本
  purchaseRMB: number;
  exchangeRate: number;
  // 物流仓储
  shippingUSD: number;
  fbaFee: number;
  miscFee: number;
  storageFee: number;
  // 退货损耗
  returnRate: number;
  unsellableRate: number;
  // Plan B 结果
  actualPrice: number;
  planBMargin: number;
  planBProfit: number;
  planBBE: number;
  planBCost: number;
  planBCommRate: number;
}

const MOCK_DATA: ProductProfitRecord[] = [
  {
    id: '1', name: 'Air Zoom Pegasus 39', asin: 'B09X9Y4Z', img: '1',
    targetAcos: 15, targetMargin: 15,
    purchaseRMB: 120, exchangeRate: 7.1,
    shippingUSD: 2.5, fbaFee: 5.69, miscFee: 0.5, storageFee: 0.45,
    returnRate: 10, unsellableRate: 20,
    actualPrice: 49.99, planBMargin: 18.5, planBProfit: 9.25, planBBE: 32.40, planBCost: 40.74, planBCommRate: 15
  },
  {
    id: '2', name: '智能降噪蓝牙耳机 Pro', asin: 'B07V2X9Q', img: '2',
    targetAcos: 20, targetMargin: 25,
    purchaseRMB: 85, exchangeRate: 7.1,
    shippingUSD: 1.2, fbaFee: 3.28, miscFee: 0.2, storageFee: 0.15,
    returnRate: 5, unsellableRate: 10,
    actualPrice: 29.99, planBMargin: 32.1, planBProfit: 9.62, planBBE: 18.50, planBCost: 20.37, planBCommRate: 15
  },
  {
    id: '3', name: '不锈钢运动水壶 32oz', asin: 'B08F9K2L', img: '3',
    targetAcos: 10, targetMargin: 20,
    purchaseRMB: 19.9, exchangeRate: 7.1,
    shippingUSD: 0.9, fbaFee: 5.69, miscFee: 0, storageFee: 0.45,
    returnRate: 8, unsellableRate: 15,
    actualPrice: 17.99, planBMargin: 15.0, planBProfit: 2.71, planBBE: 12.06, planBCost: 12.66, planBCommRate: 10
  }
];

const ProductProfitList: React.FC = () => {
  const [search, setSearch] = useState('');

  const filteredData = MOCK_DATA.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.asin.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-[1700px] mx-auto animate-in fade-in duration-700">
      {/* 顶部工具栏 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">产品利润矩阵</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">Product Profit Analysis Matrix</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="搜索品名或 ASIN..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111111] border border-[#27272a] rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap">
            <span className="material-symbols-outlined text-[18px]">add</span>
            新增产品分析
          </button>
        </div>
      </div>

      {/* 利润表格主体 */}
      <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl overflow-x-auto no-scrollbar">
        <table className="w-full text-center text-sm border-collapse min-w-[1400px]">
          <thead>
            {/* 一级聚合表头 */}
            <tr className="bg-[#111111] text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] border-b border-[#27272a]">
              <th className="px-6 py-4 border-r border-[#27272a]" colSpan={1}>产品信息</th>
              <th className="px-6 py-4 border-r border-[#27272a]" colSpan={2}>运营目标</th>
              <th className="px-6 py-4 border-r border-[#27272a]" colSpan={2}>产品成本</th>
              <th className="px-6 py-4 border-r border-[#27272a]" colSpan={4}>物流仓储</th>
              <th className="px-6 py-4 border-r border-[#27272a]" colSpan={2}>退货损耗</th>
              <th className="px-6 py-4 text-blue-500 bg-blue-500/5" colSpan={6}>Plan B 测算结果</th>
            </tr>
            {/* 二级明细表头 */}
            <tr className="bg-[#0c0c0e] text-[11px] font-bold text-zinc-400 border-b border-[#27272a]">
              <th className="px-6 py-3 border-r border-[#27272a] text-left">品名 / ASIN</th>
              
              <th className="px-4 py-3 border-r border-[#27272a]">ACOS %</th>
              <th className="px-4 py-3 border-r border-[#27272a]">目标利润 %</th>
              
              <th className="px-4 py-3 border-r border-[#27272a]">采购 ¥</th>
              <th className="px-4 py-3 border-r border-[#27272a]">汇率</th>
              
              <th className="px-4 py-3 border-r border-[#27272a]">头程 $</th>
              <th className="px-4 py-3 border-r border-[#27272a]">FBA $</th>
              <th className="px-4 py-3 border-r border-[#27272a]">杂费 $</th>
              <th className="px-4 py-3 border-r border-[#27272a]">仓储 $</th>
              
              <th className="px-4 py-3 border-r border-[#27272a]">退货 %</th>
              <th className="px-4 py-3 border-r border-[#27272a]">不可售 %</th>
              
              <th className="px-4 py-3 border-r border-blue-500/10 bg-blue-500/5 text-white">售价 $</th>
              <th className="px-4 py-3 border-r border-blue-500/10 bg-blue-500/5 text-white">净利润率</th>
              <th className="px-4 py-3 border-r border-blue-500/10 bg-blue-500/5 text-white">净利润 $</th>
              <th className="px-4 py-3 border-r border-blue-500/10 bg-blue-500/5 text-white">盈亏平衡</th>
              <th className="px-4 py-3 border-r border-blue-500/10 bg-blue-500/5 text-white">总成本 $</th>
              <th className="px-4 py-3 bg-blue-500/5 text-white">佣金 %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]">
            {filteredData.map((row) => (
              <tr key={row.id} className="hover:bg-[#18181b]/50 transition-colors group">
                {/* 产品信息 */}
                <td className="px-6 py-4 border-r border-[#27272a]">
                  <div className="flex items-center gap-3 text-left">
                    <div className="size-10 rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700 group-hover:border-blue-500 transition-all shrink-0">
                      <img src={`https://picsum.photos/seed/p${row.img}/100/100`} alt="prod" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-black text-white truncate max-w-[150px]">{row.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">{row.asin}</span>
                    </div>
                  </div>
                </td>

                {/* 运营目标 */}
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{fmtPct(row.targetAcos)}</td>
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{fmtPct(row.targetMargin)}</td>

                {/* 产品成本 */}
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{row.purchaseRMB.toFixed(2)}</td>
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{row.exchangeRate.toFixed(2)}</td>

                {/* 物流仓储 */}
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{row.shippingUSD.toFixed(2)}</td>
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{row.fbaFee.toFixed(2)}</td>
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{row.miscFee.toFixed(2)}</td>
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{row.storageFee.toFixed(2)}</td>

                {/* 退货损耗 */}
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{fmtPct(row.returnRate)}</td>
                <td className="px-4 py-4 border-r border-[#27272a] font-mono font-bold text-zinc-400">{fmtPct(row.unsellableRate)}</td>

                {/* Plan B 结果 */}
                <td className="px-4 py-4 border-r border-blue-500/10 bg-blue-500/5 font-mono font-black text-white">{fmtUSD(row.actualPrice)}</td>
                <td className={`px-4 py-4 border-r border-blue-500/10 bg-blue-500/5 font-mono font-black ${row.planBMargin >= 10 ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {fmtPct(row.planBMargin)}
                </td>
                <td className={`px-4 py-4 border-r border-blue-500/10 bg-blue-500/5 font-mono font-black ${row.planBProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {fmtUSD(row.planBProfit)}
                </td>
                <td className="px-4 py-4 border-r border-blue-500/10 bg-blue-500/5 font-mono font-bold text-zinc-400">{fmtUSD(row.planBBE)}</td>
                <td className="px-4 py-4 border-r border-blue-500/10 bg-blue-500/5 font-mono font-bold text-orange-600">{fmtUSD(row.planBCost)}</td>
                <td className="px-4 py-4 bg-blue-500/5 font-mono font-bold text-zinc-400">{row.planBCommRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部摘要 */}
      <div className="flex justify-between items-center p-6 bg-[#111111] border border-[#27272a] rounded-2xl">
        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">录入产品数</span>
            <span className="text-2xl font-black text-white font-mono">{filteredData.length} SKUs</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">平均毛利率</span>
            <span className="text-2xl font-black text-emerald-500 font-mono">21.8%</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-[#27272a] text-zinc-400 text-xs font-bold rounded-lg hover:text-white transition-all">导出分析</button>
          <button className="px-4 py-2 bg-zinc-800 text-white text-xs font-bold rounded-lg hover:bg-zinc-700 transition-all">批量编辑</button>
        </div>
      </div>
    </div>
  );
};

export default ProductProfitList;
