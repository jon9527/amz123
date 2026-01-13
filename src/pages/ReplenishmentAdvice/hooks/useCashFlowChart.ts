import { useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    LineController,
    ScatterController,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { SimulationResult, FinancialEvent } from '../../ReplenishmentTypes';
import { fmtDate } from '../../ReplenishmentEngine';

// 注册一次
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    LineController,
    ScatterController,
    annotationPlugin,
    ChartDataLabels
);

interface UseCashFlowChartParams {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    simResult: SimulationResult | null;
    simStart: string;
    safetyDays: number;
    monthlyDailySales: number[];
    hiddenChartLines: Set<string>;
    hiddenEventTypes: Set<string>;
    setSelectedEvent: (val: { event: FinancialEvent; x: number; y: number } | null) => void;
}

/**
 * CashFlow 图表 Hook
 * 纯提取自 ReplenishmentAdvice，保持原有逻辑
 */
export const useCashFlowChart = ({
    canvasRef,
    simResult,
    simStart,
    safetyDays,
    monthlyDailySales,
    hiddenChartLines,
    hiddenEventTypes,
    setSelectedEvent,
}: UseCashFlowChartParams) => {
    const chartRef = useRef<ChartJS | null>(null);

    // 格式化日期轴
    const fmtDateAxis = (val: number) => {
        const d = new Date(simStart);
        d.setDate(d.getDate() + val);
        return fmtDate(d);
    };

    // Y轴0点对齐 helper
    const alignZeroHelper = (scale: any) => {
        if (scale.id === 'y1') {
            scale.min = 0;
            scale.max = Math.max(10, scale.max);
            return;
        }
        const chart = scale.chart;
        let hasNegative = false;
        if (chart.data && chart.data.datasets) {
            chart.data.datasets.forEach((d: any, i: number) => {
                const meta = chart.getDatasetMeta(i);
                if (meta.yAxisID === scale.id && !meta.hidden && d.data && d.data.length > 0) {
                    if (!hasNegative) {
                        if (d.data.some((p: any) => (typeof p === 'object' ? p.y : p) < -0.01)) hasNegative = true;
                    }
                }
            });
        }
        const RATIO = hasNegative ? 0.15 : 0;
        const dMin = scale.min;
        const minRange = 1000;
        const dMax = Math.max(minRange, scale.max);

        if (RATIO === 0) {
            scale.min = Math.min(dMin, 0);
            scale.max = dMax * 1.05;
        } else {
            const k = (1 - RATIO) / RATIO;
            const minNeeded = -dMax / k;
            const finalMin = Math.min(dMin, minNeeded);
            const finalMax = Math.max(dMax, -finalMin * k);
            scale.min = finalMin;
            scale.max = finalMax;
        }
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
        const cashPadding = { left: 0, right: 20, top: 15, bottom: 0 };

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

        // 计算安全库存点
        const getDailyDemand = (dayOffset: number): number => {
            const date = new Date(simStart);
            date.setDate(date.getDate() + dayOffset);
            return monthlyDailySales[date.getMonth()] || 50;
        };
        const safetyPoints = simResult.invPoints.map(p => {
            let safetyStock = 0;
            for (let i = 0; i < safetyDays; i++) {
                safetyStock += getDailyDemand(p.x + 1 + i);
            }
            return { x: p.x, y: safetyStock };
        });

        // Hot-fix: 如果现有实例没有 eventIcons 插件，则销毁重建
        if (chartRef.current) {
            const plugins = chartRef.current.config.plugins as any[];
            const hasPlugin = plugins?.find((p: any) => p.id === 'eventIcons');
            if (!hasPlugin) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        }

        if (chartRef.current) {
            // Update existing
            const chart = chartRef.current;
            (chart.config as any)._customData = { simResult, hiddenEventTypes, setSelectedEvent };
            chart.data.datasets[0].data = simResult.cashPoints;
            chart.data.datasets[0].hidden = hiddenChartLines.has('cash');
            chart.data.datasets[1].data = simResult.profitPoints;
            chart.data.datasets[1].hidden = hiddenChartLines.has('profit');
            chart.data.datasets[2].data = simResult.invPoints;
            chart.data.datasets[2].hidden = hiddenChartLines.has('inventory');

            if (chart.data.datasets[5]) {
                chart.data.datasets[5].data = safetyPoints;
                chart.data.datasets[5].hidden = hiddenChartLines.has('inventory');
            }

            chart.data.datasets[3].data = simResult.bePoint && !hiddenChartLines.has('cash') ? [simResult.bePoint] : [];
            chart.data.datasets[4].data = simResult.profBePoint && !hiddenChartLines.has('profit') ? [simResult.profBePoint] : [];

            // Annotations
            const annotations: any = {};
            if (!hiddenChartLines.has('cash') || !hiddenChartLines.has('profit')) {
                annotations.zeroLine = { type: 'line', yMin: 0, yMax: 0, borderColor: '#52525b', borderWidth: 1.5, borderDash: [6, 4] };
            }
            if (simResult.beIdx !== null && !hiddenChartLines.has('cash')) {
                annotations.breakEvenLine = {
                    type: 'line', xMin: simResult.beIdx, xMax: simResult.beIdx,
                    borderColor: '#6366f1', borderWidth: 2, borderDash: [6, 4],
                    label: { display: true, content: `回本 ${simResult.breakevenDate}`, position: 'start', backgroundColor: '#6366f1', color: '#fff', font: { size: 10, weight: 'bold' } }
                };
            }
            if (simResult.profBeIdx !== null && !hiddenChartLines.has('profit')) {
                annotations.profitLine = {
                    type: 'line', xMin: simResult.profBeIdx, xMax: simResult.profBeIdx,
                    borderColor: '#22c55e', borderWidth: 2, borderDash: [6, 4],
                    label: { display: true, content: `盈利 ${simResult.profBeDateStr}`, position: 'center', backgroundColor: '#22c55e', color: '#fff', font: { size: 10, weight: 'bold' } }
                };
            }
            if (chart.options.plugins?.annotation) {
                (chart.options.plugins.annotation as any).annotations = annotations;
            }

            if (chart.options.scales?.x) {
                chart.options.scales.x = { ...commonXScale, ticks: { ...commonXScale.ticks, display: false }, grid: { color: '#3f3f46', lineWidth: 1 } };
            }
            if (chart.options.scales?.y1) {
                (chart.options.scales.y1 as any).display = true;
                (chart.options.scales.y1 as any).afterDataLimits = alignZeroHelper;
                (chart.options.scales.y1 as any).ticks = { color: '#60a5fa', precision: 0, callback: (v: any) => v < 0 ? '' : v.toLocaleString() + '件' };
            }
            if (chart.options.scales?.y) {
                (chart.options.scales.y as any).display = true;
                (chart.options.scales.y as any).afterDataLimits = alignZeroHelper;
                (chart.options.scales.y as any).ticks = {
                    color: '#a1a1aa', precision: 0,
                    callback: (v: number) => Math.abs(v) >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v
                };
            }
            chart.update('none');
        } else {
            // Create new
            const ctx = canvasRef.current.getContext('2d');
            const gradient = ctx?.createLinearGradient(0, 0, 0, 250);
            gradient?.addColorStop(0, 'rgba(64, 158, 255, 0.4)');
            gradient?.addColorStop(1, 'rgba(64, 158, 255, 0)');

            const buildAnnotations = () => {
                const annotations: any = {
                    zeroLine: { type: 'line', yMin: 0, yMax: 0, borderColor: '#52525b', borderWidth: 1.5, borderDash: [6, 4] },
                };
                if (simResult.beIdx !== null) {
                    annotations.breakEvenLine = {
                        type: 'line', xMin: simResult.beIdx, xMax: simResult.beIdx,
                        borderColor: '#6366f1', borderWidth: 2, borderDash: [6, 4],
                        label: { display: true, content: `回本 ${simResult.breakevenDate}`, position: 'start', backgroundColor: '#6366f1', color: '#fff', font: { size: 10, weight: 'bold' } }
                    };
                }
                if (simResult.profBeIdx !== null) {
                    annotations.profitLine = {
                        type: 'line', xMin: simResult.profBeIdx, xMax: simResult.profBeIdx,
                        borderColor: '#22c55e', borderWidth: 2, borderDash: [6, 4],
                        label: { display: true, content: `盈利 ${simResult.profBeDateStr}`, position: 'center', backgroundColor: '#22c55e', color: '#fff', font: { size: 10, weight: 'bold' } }
                    };
                }
                return annotations;
            };

            // eventIcons 插件
            const eventIconsPlugin = {
                id: 'eventIcons',
                afterDatasetsDraw(chart: any) {
                    const { ctx, scales: { x } } = chart;
                    const { simResult: dSim, hiddenEventTypes: dHidden } = (chart.config as any)._customData || {};
                    if (!dSim) return;

                    const topY = chart.chartArea.top;
                    dSim.financialEvents.forEach((e: any) => {
                        if (dHidden && dHidden.has(e.type)) return;
                        const xPos = x.getPixelForValue(e.day);
                        if (xPos < chart.chartArea.left || xPos > chart.chartArea.right) return;

                        let yOffset = 10;
                        if (e.type === 'balance') yOffset = 22;
                        else if (e.type === 'freight') yOffset = 34;
                        else if (e.type === 'recall') yOffset = 46;
                        const yPos = topY + yOffset;

                        ctx.save();
                        if (e.type === 'deposit') {
                            ctx.fillStyle = '#22d3ee';
                            ctx.beginPath(); ctx.arc(xPos, yPos, 4, 0, Math.PI * 2); ctx.fill();
                        } else if (e.type === 'balance') {
                            ctx.fillStyle = '#ec4899';
                            ctx.beginPath(); ctx.arc(xPos, yPos, 4, 0, Math.PI * 2); ctx.fill();
                        } else if (e.type === 'freight') {
                            ctx.fillStyle = '#fbbf24';
                            ctx.beginPath(); ctx.moveTo(xPos, yPos - 4); ctx.lineTo(xPos - 4, yPos + 4); ctx.lineTo(xPos + 4, yPos + 4); ctx.fill();
                        } else if (e.type === 'recall') {
                            ctx.fillStyle = '#4ade80';
                            ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                            ctx.fillText('★', xPos, yPos);
                        }
                        ctx.restore();
                    });
                },
                afterEvent(chart: any, args: any) {
                    const { event } = args;
                    if (event.type !== 'click') return;
                    const { simResult: dSim, hiddenEventTypes: dHidden, setSelectedEvent: dSetSelected } = (chart.config as any)._customData || {};
                    if (!dSim || !dSetSelected) return;

                    const mouseX = event.x;
                    const mouseY = event.y;
                    const topY = chart.chartArea.top;

                    const clickedEvent = dSim.financialEvents.slice().reverse().find((e: any) => {
                        if (dHidden && dHidden.has(e.type)) return false;
                        const xPos = chart.scales.x.getPixelForValue(e.day);
                        if (xPos < chart.chartArea.left || xPos > chart.chartArea.right) return false;

                        let yOffset = 10;
                        if (e.type === 'balance') yOffset = 22;
                        else if (e.type === 'freight') yOffset = 34;
                        else if (e.type === 'recall') yOffset = 46;
                        const yPos = topY + yOffset;
                        return Math.pow(mouseX - xPos, 2) + Math.pow(mouseY - yPos, 2) <= 100;
                    });

                    if (clickedEvent) {
                        const nativeEvent = event.native;
                        dSetSelected({ event: clickedEvent, x: nativeEvent.clientX, y: nativeEvent.clientY });
                        args.changed = true;
                    }
                }
            };

            chartRef.current = new ChartJS(canvasRef.current, {
                type: 'line',
                plugins: [eventIconsPlugin],
                data: {
                    datasets: [
                        { label: '资金', data: simResult.cashPoints, borderColor: '#f56c6c', backgroundColor: 'transparent', borderWidth: 2, fill: true, pointRadius: 0, yAxisID: 'y', hidden: hiddenChartLines.has('cash') },
                        { label: '累计利润', data: simResult.profitPoints, borderColor: '#67c23a', borderWidth: 2, borderDash: [5, 5], fill: false, pointRadius: 0, yAxisID: 'y', hidden: hiddenChartLines.has('profit') },
                        { label: '库存', data: simResult.invPoints, borderColor: '#409eff', backgroundColor: gradient, borderWidth: 1, fill: true, pointRadius: 0, yAxisID: 'y1', hidden: hiddenChartLines.has('inventory') },
                        { label: '回本点', type: 'scatter' as const, data: simResult.bePoint ? [simResult.bePoint] : [], backgroundColor: '#6366f1', borderColor: '#fff', borderWidth: 2, pointRadius: 8, pointHoverRadius: 10, yAxisID: 'y' },
                        { label: '盈利点', type: 'scatter' as const, data: simResult.profBePoint ? [simResult.profBePoint] : [], backgroundColor: '#22c55e', borderColor: '#fff', borderWidth: 2, pointRadius: 8, pointHoverRadius: 10, yAxisID: 'y' },
                        { label: '安全库存', data: safetyPoints, borderColor: '#94a3b8', borderWidth: 1.5, borderDash: [4, 4], fill: false, pointRadius: 0, yAxisID: 'y1', hidden: hiddenChartLines.has('inventory') },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    layout: { padding: cashPadding },
                    plugins: {
                        legend: { display: false },
                        datalabels: { display: false },
                        annotation: { annotations: buildAnnotations() },
                        tooltip: {
                            mode: 'index', intersect: false,
                            callbacks: {
                                title: (items: any) => items.length > 0 ? `📅 第${items[0].raw.x}天 (${fmtDateAxis(items[0].raw.x)})` : '',
                                label: (c: any) => {
                                    if (c.dataset.label === '库存') return `📦 库存: ${Math.round(c.raw.y).toLocaleString()} 件`;
                                    if (c.dataset.label === '安全库存') return `⚠️ 安全: ${Math.round(c.raw.y).toLocaleString()} 件`;
                                    if (c.dataset.label === '资金') return `💸 资金: $${Math.round(c.raw.y).toLocaleString()}`;
                                    if (c.dataset.label === '累计利润') return `💰 利润: $${Math.round(c.raw.y).toLocaleString()}`;
                                    if (c.dataset.label === '回本点') return `🎯 回本点: ${simResult.breakevenDate}`;
                                    if (c.dataset.label === '盈利点') return `🎉 盈利点: ${simResult.profBeDateStr}`;
                                    return '';
                                },
                            },
                        },
                    },
                    scales: {
                        x: { ...commonXScale, ticks: { ...commonXScale.ticks, display: false }, grid: { color: '#3f3f46', lineWidth: 1 } },
                        y: { position: 'left', grid: { color: '#3f3f46', lineWidth: 0.5 }, afterFit: (axis: any) => { axis.width = yAxisWidth; }, ticks: { color: '#fff', font: { weight: 'bold' as const, size: 11 }, stepSize: 14, callback: (v: any) => Math.abs(Number(v)) >= 1000 ? '$' + (Number(v) / 1000).toFixed(0) + 'k' : '$' + v }, afterDataLimits: alignZeroHelper },
                        y1: { position: 'right', grid: { display: false }, display: true, afterFit: (axis: any) => { axis.width = 65; }, ticks: { color: '#60a5fa', precision: 0, callback: (v: any) => v < 0 ? '' : v.toLocaleString() + '件' }, afterDataLimits: alignZeroHelper },
                    },
                },
            });
            (chartRef.current.config as any)._customData = { simResult, hiddenEventTypes, setSelectedEvent };
        }
    }, [simResult, simStart, safetyDays, monthlyDailySales, hiddenChartLines, hiddenEventTypes, setSelectedEvent, canvasRef]);

    return chartRef;
};
