import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';
import { fmtUSD } from '../utils/formatters';

export interface WaterfallDataPoint {
    name: string;
    val: number;
    range: [number, number];
    color: string;
}

export interface WaterfallChartProps {
    data: WaterfallDataPoint[];
    height?: number;
}

/**
 * WaterfallChart - 瀑布图组件
 * 用于显示利润构成的分解过程
 */
const WaterfallChart: React.FC<WaterfallChartProps> = ({ data, height = 420 }) => {
    return (
        <div style={{ height }} className="w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 30, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e21" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525b', fontSize: 13, fontWeight: 900, letterSpacing: '0.05em' }}
                        dy={20}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#52525b', fontSize: 12, fontWeight: 600 }}
                        tickFormatter={(v) => `$${v} `}
                        domain={[0, 'auto']}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        animationDuration={0}
                        isAnimationActive={false}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const item = payload[0].payload as WaterfallDataPoint;
                                return (
                                    <div className="bg-[#18181b] border border-zinc-800 p-6 rounded-2xl shadow-2xl ring-1 ring-white/5 backdrop-blur-xl pointer-events-none min-w-[160px]">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 border-b border-zinc-800 pb-2">
                                            {item.name}
                                        </p>
                                        <p className={`text-2xl font-black font-mono ${item.val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {fmtUSD(item.val)}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="range" isAnimationActive={false} barSize={85}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                fillOpacity={0.9}
                                radius={[4, 4, 4, 4] as any}
                            />
                        ))}
                        <LabelList
                            dataKey="val"
                            position="top"
                            formatter={(v: unknown) => fmtUSD(Number(v))}
                            style={{ fill: '#a1a1aa', fontSize: 14, fontWeight: 900, fontFamily: 'JetBrains Mono' }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default WaterfallChart;
