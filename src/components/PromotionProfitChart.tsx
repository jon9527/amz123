import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, ReferenceDot, Label } from 'recharts';

interface PromotionProfitChartProps {
    monthlyProfits: number[];
}

const fmtUSD = (num: number) => {
    const sign = num < 0 ? '-' : '+';
    return (num === 0 ? '$0' : sign + '$' + Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }));
};

const PromotionProfitChart: React.FC<PromotionProfitChartProps> = ({ monthlyProfits }) => {
    const chartState = useMemo(() => {
        const data: { name: string; cumulative: number; monthProfit: number }[] = [];
        let cumulative = 0;
        let maxLoss = 0;
        let maxLossIdx = -1;
        let maxLossLabel = '';
        let breakEvenIdx = -1;
        let breakEvenDay = 0; // Days into the break-even month
        let breakEvenDate = '';

        // Get current date for calculating actual dates
        const now = new Date();
        const startYear = now.getFullYear();
        const startMonth = now.getMonth();

        monthlyProfits.forEach((profit, i) => {
            const prevCumulative = cumulative;
            cumulative += profit;

            // Calculate actual month label
            const monthIdx = (startMonth + i + 1) % 12;
            const label = `${monthIdx + 1}月`;

            if (cumulative < maxLoss) {
                maxLoss = cumulative;
                maxLossIdx = i;
                maxLossLabel = label;
            }

            // Calculate break-even point
            if (prevCumulative < 0 && cumulative >= 0 && breakEvenIdx < 0) {
                breakEvenIdx = i;
                // Calculate exact day within this month
                // prevCumulative is negative, profit is positive
                // days = |prevCumulative| / (profit / 30)
                const dailyProfit = profit / 30;
                if (dailyProfit > 0) {
                    breakEvenDay = Math.ceil(Math.abs(prevCumulative) / dailyProfit);
                    breakEvenDay = Math.min(breakEvenDay, 30);

                    // Calculate actual date
                    const beMonthIdx = (startMonth + i + 1) % 12;
                    const beYearOffset = Math.floor((startMonth + i + 1) / 12);
                    const beYear = startYear + beYearOffset;
                    breakEvenDate = `${beYear}/${beMonthIdx + 1}/${breakEvenDay}`;
                }
            }

            data.push({ name: label, cumulative: Math.round(cumulative), monthProfit: Math.round(profit) });
        });

        const values = data.map(d => d.cumulative);
        const minVal = Math.min(0, ...values);
        const maxVal = Math.max(0, ...values);

        // Calculate total days to break-even
        let totalDaysToBreakEven = 0;
        if (breakEvenIdx >= 0) {
            totalDaysToBreakEven = breakEvenIdx * 30 + breakEvenDay;
        }

        return { data, maxLoss, maxLossIdx, maxLossLabel, breakEvenIdx, breakEvenDate, totalDaysToBreakEven, finalValue: cumulative, minVal, maxVal };
    }, [monthlyProfits]);

    const { data, maxLoss, maxLossIdx, maxLossLabel, breakEvenIdx, breakEvenDate, totalDaysToBreakEven, finalValue, minVal, maxVal } = chartState;

    return (
        <div className="bg-[#111111] border border-[#27272a] rounded-2xl p-6">
            <h4 className="text-base font-black text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">bar_chart</span>
                推广周期累计盈亏
            </h4>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-zinc-900/50 rounded-lg p-2.5 text-center">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase">推广期</div>
                    <div className="text-lg font-black text-white">{monthlyProfits.length} 个月</div>
                </div>
                <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-2.5 text-center">
                    <div className="text-[9px] text-red-400 font-bold uppercase">资金谷底 ({maxLossLabel || '-'})</div>
                    <div className="text-lg font-black text-red-500">{fmtUSD(maxLoss)}</div>
                </div>
                <div className={`rounded-lg p-2.5 text-center ${breakEvenIdx >= 0 ? 'bg-blue-900/20 border border-blue-500/20' : 'bg-zinc-900/50'}`}>
                    <div className={`text-[9px] font-bold uppercase ${breakEvenIdx >= 0 ? 'text-blue-400' : 'text-zinc-500'}`}>
                        盈亏平衡
                    </div>
                    <div className={`text-sm font-black ${breakEvenIdx >= 0 ? 'text-blue-500' : 'text-zinc-600'}`}>
                        {breakEvenDate || '未达成'}
                    </div>
                    {breakEvenIdx >= 0 && (
                        <div className="text-[9px] text-blue-400/70">约 {totalDaysToBreakEven} 天</div>
                    )}
                </div>
            </div>

            {/* Bar Chart */}
            <div className="h-[220px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 30, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />

                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#a1a1aa', fontWeight: 600 }}
                        />

                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#71717a' }}
                            tickFormatter={(val) => {
                                if (val === 0) return '$0';
                                const sign = val < 0 ? '-' : '';
                                const abs = Math.abs(val);
                                if (abs >= 1000) return sign + '$' + (abs / 1000).toFixed(0) + 'k';
                                return sign + '$' + abs;
                            }}
                            domain={[minVal * 1.2, maxVal * 1.2]}
                            width={50}
                        />

                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            isAnimationActive={false}
                            animationDuration={0}
                            contentStyle={{
                                backgroundColor: '#000',
                                borderColor: '#3f3f46',
                                borderRadius: '8px',
                                fontSize: '12px',
                                padding: '10px 14px'
                            }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}
                            formatter={(value: number, name: string, props: any) => {
                                const monthProfit = props.payload.monthProfit;
                                return [
                                    <div key="v" style={{ color: '#fff', lineHeight: '1.6' }}>
                                        <div>
                                            本月: <strong style={{ color: monthProfit >= 0 ? '#10b981' : '#ef4444' }}>{fmtUSD(monthProfit)}</strong>
                                        </div>
                                        <div style={{ color: '#a1a1aa' }}>
                                            累计: <strong style={{ color: value >= 0 ? '#10b981' : '#ef4444' }}>{fmtUSD(value)}</strong>
                                        </div>
                                    </div>,
                                    ''
                                ];
                            }}
                        />

                        <ReferenceLine y={0} stroke="#52525b" strokeWidth={1} />

                        <Bar
                            dataKey="cumulative"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive={false}
                        >
                            {data.map((entry, index) => {
                                let fill = entry.cumulative >= 0 ? '#10b981' : '#ef4444';
                                if (index === maxLossIdx) fill = '#dc2626';
                                if (index === breakEvenIdx && entry.cumulative >= 0) fill = '#3b82f6';
                                return <Cell key={`cell-${index}`} fill={fill} />;
                            })}
                        </Bar>

                        {/* Break-even dot marker */}
                        {breakEvenIdx >= 0 && (
                            <ReferenceDot
                                x={data[breakEvenIdx].name}
                                y={0}
                                r={6}
                                fill="#3b82f6"
                                stroke="#fff"
                                strokeWidth={2}
                            >
                                <Label
                                    value={`⚖️ ${breakEvenDate}`}
                                    position="top"
                                    offset={10}
                                    fill="#3b82f6"
                                    fontSize={10}
                                    fontWeight="bold"
                                />
                            </ReferenceDot>
                        )}
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mt-2 text-[10px]">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-600" />
                    <span className="text-zinc-400">资金谷底</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-red-500" />
                    <span className="text-zinc-400">亏损</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span className="text-zinc-400">盈利</span>
                </div>
                {breakEvenIdx >= 0 && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                        <span className="text-zinc-400">盈亏平衡</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionProfitChart;
