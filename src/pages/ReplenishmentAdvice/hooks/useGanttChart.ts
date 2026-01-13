import { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    BarController,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ReplenishmentBatch } from '../../../types';
import { SimulationResult } from '../../ReplenishmentTypes';
import { fmtDate } from '../../ReplenishmentEngine';

// 注册一次
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    BarController,
    ChartDataLabels
);

interface UseGanttChartParams {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    simResult: SimulationResult | null;
    batches: ReplenishmentBatch[];
    simStart: string;
}

/**
 * Gantt 图表 Hook
 * 纯提取自 ReplenishmentAdvice，保持原有逻辑
 */
export const useGanttChart = ({
    canvasRef,
    simResult,
    batches,
    simStart,
}: UseGanttChartParams) => {
    const chartRef = useRef<ChartJS | null>(null);

    // 格式化日期轴
    const fmtDateAxis = (val: number) => {
        const d = new Date(simStart);
        d.setDate(d.getDate() + val);
        return fmtDate(d);
    };

    // Cleanup
    useEffect(() => {
        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, []);

    // Render/Update
    useEffect(() => {
        if (!simResult || !canvasRef.current) return;

        const yAxisWidth = 60;
        const ganttPadding = { left: 0, right: 20, top: 10, bottom: 0 };

        const commonXScale = {
            type: 'linear' as const,
            min: simResult.xMin,
            max: simResult.xMax,
            grid: { color: '#3f3f46', lineWidth: 1 },
            ticks: {
                color: '#fff',
                font: { weight: 'bold' as const, size: 11 },
                stepSize: 14,
                callback: (v: any) => fmtDateAxis(v as number)
            },
        };

        if (chartRef.current) {
            // Update existing
            const chart = chartRef.current;
            chart.data.labels = batches.map((_, i) => i.toString());

            if (chart.options.scales?.y?.ticks) {
                chart.options.scales.y.ticks.callback = function (val: any) {
                    const idx = typeof val === 'string' ? parseInt(val) : val;
                    const b = batches[idx];
                    if (!b) return '';
                    const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
                    return `批次${idx + 1}\n${finalQty}件`.split('\n');
                };
            }

            chart.data.datasets[0].data = simResult.ganttProd as any;
            chart.data.datasets[1].data = simResult.ganttShip as any;
            chart.data.datasets[2].data = simResult.ganttHold as any;
            chart.data.datasets[3].data = simResult.ganttSell as any;
            chart.data.datasets[4].data = simResult.ganttStockout as any;

            if (chart.options.scales?.x) {
                chart.options.scales.x = { ...commonXScale, position: 'bottom', grid: { color: '#3f3f46', lineWidth: 1 } };
            }
            chart.update('none');
        } else {
            // Create new
            chartRef.current = new ChartJS(canvasRef.current, {
                type: 'bar',
                data: {
                    labels: batches.map((_, i) => i.toString()),
                    datasets: [
                        { label: '生产', data: simResult.ganttProd as any, backgroundColor: '#d94841', borderRadius: 4, barThickness: 35 },
                        { label: '运输', data: simResult.ganttShip as any, backgroundColor: '#e6a23c', borderRadius: 4, barThickness: 35 },
                        { label: '待售', data: simResult.ganttHold as any, backgroundColor: '#909399', borderRadius: 0, barThickness: 35 },
                        { label: '销售', data: simResult.ganttSell as any, backgroundColor: '#2e9f6e', borderRadius: 4, barThickness: 35 },
                        { label: '断货', data: simResult.ganttStockout as any, backgroundColor: 'rgba(217, 72, 65, 0.3)', borderColor: '#d94841', borderWidth: 1, borderRadius: 4, barThickness: 20 },
                    ],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    layout: { padding: ganttPadding },
                    plugins: {
                        legend: { display: false },
                        datalabels: {
                            color: (ctx: any) => (ctx.dataset.label === '断货' ? '#ef4444' : 'white'),
                            font: { weight: 'bold', size: 9 },
                            formatter: (val: any, ctx: any) => {
                                if (ctx.dataset.label === '断货') return `缺${val.gapDays}天`;
                                if (ctx.dataset.label === '待售') return `待${val.duration}天`;
                                return ctx.dataset.label;
                            },
                        },
                        tooltip: {
                            callbacks: {
                                title: (items: any) => {
                                    if (items.length > 0) {
                                        const batchIdx = items[0].raw?.batchIdx;
                                        if (batchIdx !== undefined) {
                                            const b = batches[batchIdx];
                                            if (b) {
                                                const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
                                                return `批次${batchIdx + 1} (${finalQty}件)`;
                                            }
                                        }
                                    }
                                    return '';
                                },
                                label: (ctx: any) => {
                                    const start = fmtDateAxis(ctx.raw.x[0]);
                                    const end = fmtDateAxis(ctx.raw.x[1]);
                                    const d = ctx.raw;
                                    if (ctx.dataset.label === '生产') return [`🗓️ ${start} - ${end}`, `💰 成本: $${Math.round(d.cost).toLocaleString()}`];
                                    if (ctx.dataset.label === '运输') return [`🗓️ ${start} - ${end}`, `🚚 运费: $${Math.round(d.freight).toLocaleString()}`];
                                    if (ctx.dataset.label === '销售') return [`🗓️ ${start} - ${end}`, `💵 回款: $${Math.round(d.revenue).toLocaleString()}`];
                                    return `${ctx.dataset.label}: ${start} - ${end}`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: { ...commonXScale, position: 'bottom', grid: { color: '#3f3f46', lineWidth: 1 } },
                        y: {
                            stacked: true,
                            grid: { display: false },
                            afterFit: (axis: any) => { axis.width = yAxisWidth; },
                            ticks: {
                                color: '#a1a1aa',
                                font: { size: 10 },
                                callback: function (val: any) {
                                    const idx = typeof val === 'string' ? parseInt(val) : val;
                                    const b = batches[idx];
                                    if (!b) return '';
                                    const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
                                    return `批次${idx + 1}\n${finalQty}件`.split('\n');
                                }
                            }
                        },
                        y1: { position: 'right', display: false, afterFit: (axis: any) => { axis.width = 65; } },
                    },
                },
            });
        }
    }, [simResult, batches, simStart, canvasRef]);

    return chartRef;
};
