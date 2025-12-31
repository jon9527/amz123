import React, { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    BarController,
    LineController,
    ScatterController
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SimulationResult } from '../types/simulation';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    BarController,
    LineController,
    ScatterController,
    annotationPlugin,
    ChartDataLabels
);

interface CapitalInventoryChartProps {
    data: SimulationResult | null;
    batchLabels: string[];
    simStart: string;
}

export const CapitalInventoryChart: React.FC<CapitalInventoryChartProps> = ({ data, batchLabels, simStart }) => {
    const ganttRef = useRef<HTMLCanvasElement>(null);
    const cashRef = useRef<HTMLCanvasElement>(null);
    const ganttChart = useRef<ChartJS | null>(null);
    const cashChart = useRef<ChartJS | null>(null);

    // Helpers
    const fmtDateAxis = (val: number) => {
        const d = new Date(simStart);
        d.setDate(d.getDate() + val);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    // --- EFFECT: RENDER CHARTS ---
    useEffect(() => {
        if (!data || !ganttRef.current || !cashRef.current) return;

        // Common Config
        const commonX = {
            type: 'linear' as const,
            min: data.xMin,
            max: data.xMax,
            grid: { color: '#3f3f46', lineWidth: 1 },
            ticks: {
                color: '#71717a',
                font: { size: 10, weight: 'bold' as const },
                stepSize: 14,
                callback: (v: any) => fmtDateAxis(v as number)
            }
        };

        const yAxisWidth = 60;

        // 1. GANTT CHART
        if (ganttChart.current) ganttChart.current.destroy();

        ganttChart.current = new ChartJS(ganttRef.current, {
            type: 'bar',
            data: {
                labels: batchLabels,
                datasets: [
                    { label: '产', data: data.ganttProd, backgroundColor: '#ef4444', borderRadius: 4, barThickness: 25 },
                    { label: '运', data: data.ganttShip, backgroundColor: '#f59e0b', borderRadius: 4, barThickness: 25 },
                    { label: '待', data: data.ganttHold, backgroundColor: '#52525b', borderRadius: 0, barThickness: 25 },
                    { label: '销', data: data.ganttSell, backgroundColor: '#10b981', borderRadius: 4, barThickness: 25 },
                    {
                        label: '断货',
                        data: data.ganttStockout,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderColor: '#ef4444',
                        borderWidth: 1,
                        borderDash: [4, 4],
                        borderRadius: 4,
                        barThickness: 15
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                layout: { padding: { left: 0, right: 20, top: 20, bottom: 0 } },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        color: (ctx) => ctx.dataset.label === '断货' ? '#ef4444' : '#fff',
                        font: { size: 10, weight: 'bold' },
                        formatter: (val, ctx) => {
                            if (ctx.dataset.label === '断货') return `缺${val.gapDays}天`;
                            if (ctx.dataset.label === '待') return `待${val.duration}天`;
                            return ctx.dataset.label;
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx: any) => {
                                const start = fmtDateAxis(ctx.raw.x[0]);
                                const end = fmtDateAxis(ctx.raw.x[1]);
                                const v = ctx.raw;
                                if (ctx.dataset.label === '产') return `📅 ${start}-${end} | 💰 生产: ¥${Math.round(v.cost).toLocaleString()}`;
                                if (ctx.dataset.label === '运') return `📅 ${start}-${end} | 🚚 运费: ¥${Math.round(v.freight).toLocaleString()}`;
                                if (ctx.dataset.label === '销') return `📅 ${start}-${end} | 💵 营收: ¥${Math.round(v.revenue).toLocaleString()}`;
                                return `${ctx.dataset.label}: ${start} - ${end}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { ...commonX, position: 'top', grid: { color: '#27272a' } },
                    y: {
                        stacked: true,
                        grid: { display: false },
                        afterFit: (axis) => { axis.width = yAxisWidth; },
                        ticks: { color: '#a1a1aa', font: { size: 10, weight: 'bold' }, autoSkip: false }
                    }
                }
            }
        });

        // 2. CASH FLOW CHART
        if (cashChart.current) cashChart.current.destroy();

        const ctx = cashRef.current.getContext('2d');
        const gradient = ctx?.createLinearGradient(0, 0, 0, 300);
        gradient?.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradient?.addColorStop(1, 'rgba(59, 130, 246, 0)');

        cashChart.current = new ChartJS(cashRef.current, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: '资金',
                        data: data.cashPoints,
                        borderColor: '#ef4444',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 0,
                        order: 1
                    },
                    {
                        label: '累计利润',
                        data: data.profitPoints,
                        borderColor: '#10b981',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        hidden: true
                    },
                    {
                        label: '库存',
                        data: data.invPoints,
                        borderColor: '#3b82f6',
                        backgroundColor: gradient,
                        borderWidth: 1,
                        fill: true,
                        pointRadius: 0,
                        yAxisID: 'y1',
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                layout: { padding: { left: 0, right: 20, top: 10, bottom: 0 } },
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false },
                    annotation: {
                        annotations: data.annotations
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (c: any) => {
                                if (c.dataset.label === '库存') return `📦 库存: ${c.raw.y}`;
                                if (c.dataset.label === '资金') return `💸 资金: ¥${Math.round(c.raw.y).toLocaleString()}`;
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: { ...commonX, display: false }, // Use Gantt's X axis
                    y: {
                        position: 'left',
                        grid: { color: '#27272a' },
                        afterFit: (axis) => { axis.width = yAxisWidth; },
                        ticks: {
                            color: '#a1a1aa',
                            callback: (v) => '¥' + (v as number) / 1000 + 'k'
                        }
                    },
                    y1: {
                        position: 'right',
                        grid: { display: false },
                        min: 0,
                        title: { display: true, text: '库存 (件)', color: '#3b82f6' }
                    }
                }
            }
        });

        return () => {
            ganttChart.current?.destroy();
            cashChart.current?.destroy();
        };
    }, [data, batchLabels, simStart]);

    return (
        <div className="flex flex-col w-full h-full bg-[#09090b]">
            <div className="h-1/2 min-h-[300px] w-full border-b border-[#27272a]">
                <canvas ref={ganttRef} />
            </div>
            <div className="h-1/2 min-h-[300px] w-full relative">
                <div className="absolute top-2 left-16 flex gap-4 z-10">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-xs text-zinc-400">资金余额</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500/50 border border-blue-500 rounded"></div>
                        <span className="text-xs text-zinc-400">库存水位</span>
                    </div>
                </div>
                <canvas ref={cashRef} />
            </div>
        </div>
    );
};
