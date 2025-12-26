
import React, { useState } from 'react';
import { MOCK_KPIS, MOCK_CAMPAIGNS } from '../constants';

const AdsAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('广告系列');

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight text-white">广告分析报告</h2>
        <div className="flex justify-between items-center mt-2">
          <p className="text-zinc-500 text-sm">深度分析亚马逊 PPC 表现及 ACOS 效率。</p>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20">
            <span className="material-symbols-outlined text-[20px]">download</span>
            导出详细报告
          </button>
        </div>
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
              <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${kpi.trend >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                <span className="material-symbols-outlined text-[14px]">{kpi.trend >= 0 ? 'trending_up' : 'trending_down'}</span>
                <span>{kpi.trend >= 0 ? '+' : ''}{kpi.trend}%</span>
                <span className="text-zinc-600 ml-1 font-normal lowercase tracking-normal">{kpi.trendLabel}</span>
              </div>
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
              className={`px-8 py-5 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab 
                  ? 'border-blue-600 text-blue-600 bg-blue-600/5' 
                  : 'border-transparent text-zinc-500 hover:text-white hover:bg-[#18181b]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-5 flex flex-wrap gap-4 justify-between items-center bg-[#111111]">
          <div className="flex gap-2">
            <button className="flex items-center justify-center p-2.5 rounded-xl border border-[#27272a] text-zinc-500 hover:bg-[#18181b] hover:text-white" title="过滤">
              <span className="material-symbols-outlined text-[20px]">filter_alt</span>
            </button>
            <button className="flex items-center justify-center p-2.5 rounded-xl border border-[#27272a] text-zinc-500 hover:bg-[#18181b] hover:text-white" title="列设置">
              <span className="material-symbols-outlined text-[20px]">view_column</span>
            </button>
          </div>
          <span className="text-xs text-zinc-500 font-mono">显示 1-10 个广告系列，共 42 个</span>
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
                <th className="px-6 py-4 text-right">订单数</th>
                <th className="px-6 py-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {MOCK_CAMPAIGNS.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-[#18181b]/50 transition-colors group">
                  <td className="px-6 py-4"><input type="checkbox" className="rounded border-zinc-800 bg-[#18181b]" /></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                      campaign.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${campaign.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-500'}`}></span>
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
                  <td className="px-6 py-4 text-right font-mono text-zinc-400">{campaign.orders}</td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-zinc-500 hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-[#27272a] bg-[#0c0c0e] flex items-center justify-between">
          <button className="px-4 py-2 bg-[#18181b] border border-zinc-800 rounded-lg text-xs font-bold text-zinc-500 hover:text-white transition-colors disabled:opacity-50">上一页</button>
          <div className="flex gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-[#18181b] text-xs font-bold transition-colors">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-[#18181b] text-xs font-bold transition-colors">3</button>
          </div>
          <button className="px-4 py-2 bg-[#18181b] border border-zinc-800 rounded-lg text-xs font-bold text-zinc-500 hover:text-white transition-colors">下一页</button>
        </div>
      </div>
    </div>
  );
};

export default AdsAnalysis;
