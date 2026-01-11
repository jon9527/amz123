
import React from 'react';
import { MOCK_KPIS } from '../constants';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: '周一', sales: 4000, profit: 2400 },
  { name: '周二', sales: 3000, profit: 1398 },
  { name: '周三', sales: 2000, profit: 9800 },
  { name: '周四', sales: 2780, profit: 3908 },
  { name: '周五', sales: 1890, profit: 4800 },
  { name: '周六', sales: 2390, profit: 3800 },
  { name: '周日', sales: 3490, profit: 4300 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-2">总览面板</h2>
          <p className="text-zinc-500 text-sm">亚马逊店铺实时运营数据监控。</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 rounded-lg text-sm font-bold transition-all border border-blue-600/20">
            <span className="material-symbols-outlined text-[18px]">edit_square</span>
            编辑布局
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '利润计算', icon: 'calculate' },
          { label: '广告模拟', icon: 'science' },
          { label: '新建货件', icon: 'local_shipping' },
          { label: '添加产品', icon: 'add_circle' }
        ].map((action) => (
          <button key={action.label} className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border border-dashed border-[#27272a] bg-[#111111] hover:bg-blue-600/5 hover:border-blue-600/50 transition-all group">
            <div className="p-3 rounded-full bg-zinc-900 group-hover:bg-blue-600 transition-colors">
              <span className="material-symbols-outlined text-zinc-500 group-hover:text-white">
                {action.icon}
              </span>
            </div>
            <span className="text-xs font-bold text-zinc-500 group-hover:text-white uppercase tracking-widest">{action.label}</span>
          </button>
        ))}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_KPIS.slice(0, 4).map((kpi) => (
          <div key={kpi.label} className="bg-[#111111] rounded-2xl p-6 border border-[#27272a] flex flex-col justify-between h-[160px] shadow-sm hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{kpi.label}</p>
              <span className={`p-2 rounded-lg bg-zinc-900 text-${kpi.color}`}>
                <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
              </span>
            </div>
            <div>
              <p className="text-white text-3xl font-black font-mono tracking-tight">{kpi.value}</p>
              <p className={`text-xs font-bold mt-2 flex items-center gap-1 ${kpi.trend >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                {kpi.trend >= 0 ? '↑' : '↓'} {Math.abs(kpi.trend)}%
                <span className="text-zinc-600 font-normal">较上周</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-8 bg-[#111111] rounded-2xl border border-[#27272a] p-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-lg font-bold">销售额 vs 利润 趋势</h3>
              <p className="text-sm text-zinc-500">可视化业务健康状况随时间的变化</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <div className="size-2 rounded-full bg-blue-600"></div> 销售额
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <div className="size-2 rounded-full bg-emerald-500"></div> 利润
              </div>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" name="销售额" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="profit" name="利润" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Mini List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#111111] rounded-2xl border border-[#27272a] p-6">
            <h3 className="text-lg font-bold mb-6">库存预警</h3>
            <div className="space-y-4">
              {[
                { name: '不锈钢运动水壶', level: '危急 (剩余 12)', days: '预计 3 天售罄', img: '1' },
                { name: '越野跑鞋 V2', level: '库存偏低 (剩余 45)', days: '预计 9 天售罄', img: '2' },
              ].map(item => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 transition-all hover:border-zinc-600">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-zinc-800 overflow-hidden">
                      <img src={`https://picsum.photos/seed/${item.img}/100/100`} alt="Prod" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-[120px]">{item.name}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{item.level}</p>
                    </div>
                  </div>
                  <button className="text-blue-500 text-xs font-bold hover:underline">立即补货</button>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2.5 rounded-xl border border-zinc-800 text-zinc-500 text-xs font-bold hover:text-white transition-all uppercase tracking-widest">查看完整库存</button>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/20">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="font-black text-xl mb-1">AI 助力店铺增长</h4>
                <p className="text-blue-100 text-xs">解锁预测性模拟和全天候补货建议。</p>
              </div>
              <span className="material-symbols-outlined text-3xl opacity-50">auto_awesome</span>
            </div>
            <button className="w-full py-3 bg-white text-blue-600 rounded-xl text-sm font-black shadow-lg">升级方案</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
