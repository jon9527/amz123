import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReplenishmentBatch, ProductSpec, SavedProfitModel } from '../types';
import { useProducts } from '../ProductContext';
import { ProfitModelService } from '../services/profitModelService';
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
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import ChartDataLabels from 'chartjs-plugin-datalabels';

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
    annotationPlugin,
    ChartDataLabels
);

// ============ TYPES ============
interface LogisticsCosts {
    sea: number;
    air: number;
    exp: number;
}

interface ModuleState {
    boxL: number; boxW: number; boxH: number; boxWgt: number;
    pcsPerBox: number;
    seaPriceCbm: number; seaDays: number;
    airPriceKg: number; airDays: number;
    expPriceKg: number; expDays: number;
    simStart: string;
    seasonality: number[];
    baseSales: number[];
    prices: number[];
    margins: number[];
    unitCost: number;
    exchRate: number;
    ratioDeposit: number;
    ratioBalance: number;
    prodDays: number;
    batches: ReplenishmentBatch[];
    isFreeMode: boolean;
}

interface SimulationResult {
    xMin: number;
    xMax: number;
    cashPoints: { x: number; y: number }[];
    invPoints: { x: number; y: number }[];
    profitPoints: { x: number; y: number }[];
    ganttProd: any[];
    ganttShip: any[];
    ganttHold: any[];
    ganttSell: any[];
    ganttStockout: any[];
    minCash: number;
    finalCash: number;
    totalNetProfit: number;
    totalRevenue: number;
    breakevenDate: string;
    profBeDateStr: string;
    bePoint: { x: number; y: number } | null;
    profBePoint: { x: number; y: number } | null;
}

// ============ HELPERS ============
const fmtDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
const fmtMoney = (v: number) => `¥${Math.round(v).toLocaleString()}`;

const getDefaultState = (): ModuleState => ({
    boxL: 60, boxW: 40, boxH: 40, boxWgt: 15,
    pcsPerBox: 20,
    seaPriceCbm: 800, seaDays: 35,
    airPriceKg: 35, airDays: 15,
    expPriceKg: 45, expDays: 7,
    simStart: new Date().toISOString().split('T')[0],
    seasonality: Array(12).fill(1.0),
    baseSales: [15, 30, 50, 80, 100, 120],
    prices: [19.99, 24.99, 29.99, 29.99, 29.99, 29.99],
    margins: [-10, 10, 20, 20, 25, 25],
    unitCost: 20,
    exchRate: 7.2,
    ratioDeposit: 30,
    ratioBalance: 70,
    prodDays: 15,
    batches: [],
    isFreeMode: false,
});

// ============ COMPONENT ============
const ReplenishmentAdvice: React.FC = () => {
    // ============ STATE ============
    // 当前选中的产品ID
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [strategies, setStrategies] = useState<SavedProfitModel[]>([]);
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
    const { products } = useProducts();

    const [state, setState] = useState<ModuleState>({
        // 规格与物流
        boxL: 60, boxW: 40, boxH: 40, boxWgt: 15,
        pcsPerBox: 30,
        seaPriceCbm: 1000, seaDays: 35,
        airPriceKg: 35, airDays: 10,
        expPriceKg: 45, expDays: 5,

        // 模拟参数
        simStart: new Date().toISOString().split('T')[0],
        seasonality: Array(12).fill(1).map((_, i) => i === 11 ? 2.0 : 1.0), // 12月各有不同
        baseSales: Array(12).fill(50),
        prices: Array(12).fill(29.99),
        margins: Array(12).fill(0.15), // 净利率预估

        // 资金
        unitCost: 10.0,
        exchRate: 7.2,
        ratioDeposit: 0.3,
        ratioBalance: 0.7,
        prodDays: 15,

        isFreeMode: false, // 自由模式开关（不锁定箱规等）

        // 批次数据
        batches: [
            { id: 1, type: 'sea', orderDate: '2025-01-01', boxCount: 20, arriveDate: '', payDeposit: '', payBalance: '', status: 'planning', manualArrive: false, fees: 0 }
        ]
    });

    // 监听产品选择，自动填充数据
    const handleProductSelect = (pid: string) => {
        setSelectedProductId(pid);

        // 重置策略
        setStrategies([]);
        setSelectedStrategyId('');

        if (!pid) return;

        // 加载该产品的利润策略
        const allModels = ProfitModelService.getAll();
        const relevant = allModels.filter(m => m.productId === pid);
        setStrategies(relevant);

        const product = products.find(p => p.id === pid);
        if (product) {
            setState(prev => ({
                ...prev,
                // 填充规格
                boxL: product.length || prev.boxL,
                boxW: product.width || prev.boxW,
                boxH: product.height || prev.boxH,
                boxWgt: product.weight || prev.boxWgt,
                pcsPerBox: product.pcsPerBox || prev.pcsPerBox,
                // 填充成本
                unitCost: product.unitCost || prev.unitCost,
                // 填充售价（初始化所有月份）
                prices: Array(12).fill(product.defaultPrice || prev.prices[0]),
            }));
        }
    };

    // 监听策略选择
    const handleStrategySelect = (sid: string) => {
        setSelectedStrategyId(sid);
        if (!sid) return;

        const strategy = strategies.find(s => s.id === sid);
        if (strategy) {
            // 使用 Plan B (实际定价) 或 Plan A (目标定价)
            // 优先 Plan B 因为那是用户"调整后"的结果
            const targetData = strategy.results.planB.price > 0 ? strategy.results.planB : strategy.results.planA;

            setState(prev => ({
                ...prev,
                // 应用策略中的售价
                prices: Array(12).fill(targetData.price),
                // 应用策略中的利润率预测
                margins: Array(12).fill(targetData.margin),
                // 应用策略中的成本估算 (覆盖产品库成本，因为策略可能包含汇率变动等)
                unitCost: strategy.results.costProdUSD > 0 ? strategy.results.costProdUSD : prev.unitCost,
            }));
        }
    };

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const [activeTab, setActiveTab] = useState<'spec' | 'pricing' | 'batch' | 'boss'>('spec');
    const [logCosts, setLogCosts] = useState<LogisticsCosts>({ sea: 0, air: 0, exp: 0 });
    const [actualSales, setActualSales] = useState<number[]>([15, 30, 50, 80, 100, 120]);
    const [simResult, setSimResult] = useState<SimulationResult | null>(null);



    const ganttCanvasRef = useRef<HTMLCanvasElement>(null);
    const cashCanvasRef = useRef<HTMLCanvasElement>(null);
    const ganttChartRef = useRef<ChartJS | null>(null);
    const cashChartRef = useRef<ChartJS | null>(null);

    // ============ STORAGE ============
    useEffect(() => {
        const saved = localStorage.getItem('amazon_replenishment_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setState({ ...getDefaultState(), ...parsed });
            } catch { }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('amazon_replenishment_state', JSON.stringify(state));
    }, [state]);

    // ============ LOGISTICS CALC ============
    useEffect(() => {
        const { boxL, boxW, boxH, boxWgt, pcsPerBox, seaPriceCbm, airPriceKg, expPriceKg } = state;
        if (pcsPerBox === 0) return;
        const cbm = (boxL * boxW * boxH) / 1000000;
        const volWgtAir = (boxL * boxW * boxH) / 6000;
        const volWgtExp = (boxL * boxW * boxH) / 8000;
        const chgWgtAir = Math.max(boxWgt, volWgtAir);
        const chgWgtExp = Math.max(boxWgt, volWgtExp);
        setLogCosts({
            sea: (cbm * seaPriceCbm) / pcsPerBox,
            air: (chgWgtAir * airPriceKg) / pcsPerBox,
            exp: (chgWgtExp * expPriceKg) / pcsPerBox,
        });
    }, [state.boxL, state.boxW, state.boxH, state.boxWgt, state.pcsPerBox, state.seaPriceCbm, state.airPriceKg, state.expPriceKg]);

    // ============ SEASONALITY & ACTUAL SALES ============
    useEffect(() => {
        const startDate = new Date(state.simStart);
        const newActual: number[] = [];
        for (let m = 0; m < 6; m++) {
            let sumCoeff = 0;
            for (let d = 0; d < 30; d++) {
                const curDate = new Date(startDate);
                curDate.setDate(startDate.getDate() + m * 30 + d);
                sumCoeff += state.seasonality[curDate.getMonth()];
            }
            const avgCoeff = sumCoeff / 30;
            newActual.push(Math.round(state.baseSales[m] * avgCoeff));
        }
        setActualSales(newActual);
    }, [state.simStart, state.seasonality, state.baseSales]);

    // ============ SIMULATION ENGINE ============
    const calcSimulation = useCallback((): SimulationResult => {
        const { batches, prodDays, unitCost, exchRate, ratioDeposit, ratioBalance, seaDays, airDays, expDays, margins, prices } = state;
        const logDays = { sea: seaDays, air: airDays, exp: expDays };
        const logPrices = { sea: logCosts.sea, air: logCosts.air, exp: logCosts.exp };
        const maxSimDays = 500;

        const dailyChange = new Array(maxSimDays).fill(0);
        const dailyProfitChange = new Array(maxSimDays).fill(0);
        const dailyInv = new Array(maxSimDays).fill(0);
        const dailyMissed = new Array(maxSimDays).fill(false);

        const ganttProd: any[] = [], ganttShip: any[] = [], ganttHold: any[] = [], ganttSell: any[] = [], ganttStockout: any[] = [];
        let totalRevenue = 0, totalNetProfit = 0;
        const batchRevenueMap = new Array(batches.length).fill(0);
        const arrivalEvents: Record<number, any[]> = {};
        const salesPeriods = batches.map(() => ({ start: null as number | null, end: null as number | null, arrival: null as number | null }));

        const getBatchLabel = (i: number, b: ReplenishmentBatch) => `#${i + 1} ${b.name} (${b.qty})`;
        const getDateStr = (offset: number) => {
            const d = new Date(state.simStart);
            d.setDate(d.getDate() + offset);
            return fmtDate(d);
        };

        batches.forEach((b, i) => {
            const lDays = logDays[b.type];
            const lPrice = logPrices[b.type];
            const t0 = b.offset;
            const t1 = t0 + prodDays;
            const t2 = t1 + lDays;
            const batchCost = b.qty * unitCost;
            const batchFreight = b.qty * lPrice;
            const label = getBatchLabel(i, b);

            ganttProd.push({ x: [t0, t1], y: label, batchIdx: i, cost: batchCost });
            ganttShip.push({ x: [t1, t2], y: label, batchIdx: i, freight: batchFreight });

            if (t0 < maxSimDays) dailyChange[t0] -= batchCost * (ratioDeposit / 100);
            if (t1 < maxSimDays) dailyChange[t1] -= batchCost * (ratioBalance / 100);
            const freightDay = Math.floor(t2);
            if (freightDay < maxSimDays) dailyChange[freightDay] -= batchFreight;

            if (!arrivalEvents[freightDay]) arrivalEvents[freightDay] = [];
            arrivalEvents[freightDay].push({ qty: b.qty, unitCost, unitFreight: lPrice, batchIdx: i, yLabel: label, arrivalTime: freightDay });
        });

        const inventoryQueue: any[] = [];
        let currentInv = 0;
        let firstSaleDay: number | null = null;

        for (let d = 0; d < maxSimDays; d++) {
            if (arrivalEvents[d]) {
                arrivalEvents[d].forEach((batch) => {
                    inventoryQueue.push(batch);
                    currentInv += batch.qty;
                    salesPeriods[batch.batchIdx].arrival = d;
                });
                inventoryQueue.sort((a, b) => a.arrivalTime - b.arrivalTime || a.batchIdx - b.batchIdx);
            }

            let mIdx = 0;
            if (firstSaleDay !== null) {
                mIdx = Math.floor((d - firstSaleDay) / 30);
                if (mIdx > 5) mIdx = 5;
            }
            let demand = actualSales[mIdx];
            let remainingDemand = demand;

            if (currentInv > 0 && demand > 0) {
                if (firstSaleDay === null) firstSaleDay = d;

                while (demand > 0 && inventoryQueue.length > 0) {
                    const batchObj = inventoryQueue[0];
                    if (salesPeriods[batchObj.batchIdx].start === null) salesPeriods[batchObj.batchIdx].start = d;
                    salesPeriods[batchObj.batchIdx].end = d + 1;

                    const take = Math.min(demand, batchObj.qty);
                    remainingDemand -= take;

                    const marginPercent = margins[mIdx];
                    const price = prices[mIdx];
                    const unitProfitUSD = price * (marginPercent / 100);
                    const unitProfitRMB = unitProfitUSD * exchRate;
                    const unitRecallRMB = batchObj.unitCost + batchObj.unitFreight + unitProfitRMB;
                    const revenue = take * unitRecallRMB;
                    const profit = take * unitProfitRMB;

                    batchRevenueMap[batchObj.batchIdx] += revenue;
                    const payDay = d + 14;
                    if (payDay < maxSimDays) dailyChange[payDay] += revenue;

                    totalRevenue += revenue;
                    totalNetProfit += profit;
                    dailyProfitChange[d] += profit;

                    batchObj.qty -= take;
                    currentInv -= take;
                    demand -= take;

                    if (batchObj.qty <= 0) inventoryQueue.shift();
                }
            }
            if (firstSaleDay !== null && d >= firstSaleDay && remainingDemand > 0.01) dailyMissed[d] = true;
            dailyInv[d] = currentInv;
        }

        salesPeriods.forEach((period, i) => {
            const b = batches[i];
            const label = getBatchLabel(i, b);
            if (period.start !== null && period.end !== null) {
                ganttSell.push({ x: [period.start, period.end], y: label, batchIdx: i, revenue: batchRevenueMap[i] });
                if (period.arrival !== null && period.start > period.arrival) {
                    ganttHold.push({ x: [period.arrival, period.start], y: label, batchIdx: i, duration: period.start - period.arrival });
                }
            }
        });

        // Stockout detection
        let stockoutStart = -1;
        if (firstSaleDay !== null) {
            for (let d = firstSaleDay; d < 360; d++) {
                if (dailyMissed[d]) {
                    if (stockoutStart === -1) stockoutStart = d;
                } else {
                    if (stockoutStart !== -1) {
                        if (d - stockoutStart > 0.5) {
                            let prevBatchIdx = 0;
                            for (let k = 0; k < salesPeriods.length; k++) if (salesPeriods[k].end === stockoutStart) prevBatchIdx = k;
                            ganttStockout.push({ x: [stockoutStart, d], y: getBatchLabel(prevBatchIdx, batches[prevBatchIdx]), gapDays: d - stockoutStart });
                        }
                        stockoutStart = -1;
                    }
                }
            }
        }

        const cashPoints: { x: number; y: number }[] = [], profitPoints: { x: number; y: number }[] = [], invPoints: { x: number; y: number }[] = [];
        let runningCash = 0, runningProfit = 0, minCash = 0;
        let beIdx: number | null = null, bePoint: { x: number; y: number } | null = null;
        let profBeIdx: number | null = null, profBePoint: { x: number; y: number } | null = null;

        for (let d = 0; d < dailyChange.length; d++) {
            const prevCash = runningCash, prevProf = runningProfit;
            runningCash += dailyChange[d];
            runningProfit += dailyProfitChange[d];
            if (runningCash < minCash) minCash = runningCash;
            if (beIdx === null && prevCash < 0 && runningCash >= 0 && d > 10) { beIdx = d; bePoint = { x: d, y: runningCash }; }
            if (profBeIdx === null && prevProf < 0 && runningProfit >= 0 && d > 10) { profBeIdx = d; profBePoint = { x: d, y: runningProfit }; }
            if (d <= 360) {
                cashPoints.push({ x: d, y: runningCash });
                profitPoints.push({ x: d, y: runningProfit });
                invPoints.push({ x: d, y: dailyInv[d] || 0 });
            }
        }

        return {
            xMin: 0, xMax: 360,
            cashPoints, invPoints, profitPoints,
            ganttProd, ganttShip, ganttHold, ganttSell, ganttStockout,
            minCash, finalCash: runningCash, totalNetProfit, totalRevenue,
            breakevenDate: beIdx !== null ? getDateStr(beIdx) : '未回本',
            profBeDateStr: profBeIdx !== null ? getDateStr(profBeIdx) : '未盈利',
            bePoint, profBePoint,
        };
    }, [state, logCosts, actualSales]);

    // ============ RUN SIMULATION ============
    useEffect(() => {
        if (state.batches.length > 0) {
            const result = calcSimulation();
            setSimResult(result);
        }
    }, [state, logCosts, actualSales, calcSimulation]);

    // ============ AUTO GENERATE BATCHES ============
    const autoGenerate = () => {
        const newBatches: ReplenishmentBatch[] = [];
        for (let i = 0; i < 6; i++) {
            newBatches.push({
                id: i,
                name: `M${i + 1}补货`,
                type: 'sea',
                qty: actualSales[i] * 30,
                offset: i * 30,
            });
        }
        setState((s) => ({ ...s, batches: newBatches }));
    };

    // ============ CHARTS ============
    useEffect(() => {
        if (!simResult || !ganttCanvasRef.current || !cashCanvasRef.current) return;
        const fmtDateAxis = (val: number) => {
            const d = new Date(state.simStart);
            d.setDate(d.getDate() + val);
            return fmtDate(d);
        };
        const yLabels = state.batches.map((b, i) => `#${i + 1} ${b.name} (${b.qty})`);

        // Gantt Chart
        if (ganttChartRef.current) ganttChartRef.current.destroy();
        ganttChartRef.current = new ChartJS(ganttCanvasRef.current, {
            type: 'bar',
            data: {
                labels: yLabels,
                datasets: [
                    { label: '产', data: simResult.ganttProd, backgroundColor: '#ef4444', borderRadius: 4, barThickness: 22 },
                    { label: '运', data: simResult.ganttShip, backgroundColor: '#eab308', borderRadius: 4, barThickness: 22 },
                    { label: '待', data: simResult.ganttHold, backgroundColor: '#94a3b8', borderRadius: 0, barThickness: 22 },
                    { label: '销', data: simResult.ganttSell, backgroundColor: '#22c55e', borderRadius: 4, barThickness: 22 },
                    { label: '断货', data: simResult.ganttStockout, backgroundColor: 'rgba(239,68,68,0.3)', borderColor: '#ef4444', borderWidth: 1, borderRadius: 4, barThickness: 14 },
                ],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        color: (ctx: any) => (ctx.dataset.label === '断货' ? '#ef4444' : 'white'),
                        font: { weight: 'bold', size: 9 },
                        formatter: (val: any, ctx: any) => {
                            if (ctx.dataset.label === '断货') return `缺${val.gapDays}天`;
                            if (ctx.dataset.label === '待') return `待${val.duration}天`;
                            return ctx.dataset.label;
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx: any) => {
                                const start = fmtDateAxis(ctx.raw.x[0]);
                                const end = fmtDateAxis(ctx.raw.x[1]);
                                const d = ctx.raw;
                                if (ctx.dataset.label === '产') return [`🗓️ ${start} - ${end}`, `💰 成本: ¥${Math.round(d.cost).toLocaleString()}`];
                                if (ctx.dataset.label === '运') return [`🗓️ ${start} - ${end}`, `🚚 运费: ¥${Math.round(d.freight).toLocaleString()}`];
                                if (ctx.dataset.label === '销') return [`🗓️ ${start} - ${end}`, `💵 回款: ¥${Math.round(d.revenue).toLocaleString()}`];
                                return `${ctx.dataset.label}: ${start} - ${end}`;
                            },
                        },
                    },
                },
                scales: {
                    x: { type: 'linear', min: simResult.xMin, max: simResult.xMax, grid: { color: '#27272a' }, ticks: { color: '#fff', font: { weight: 'bold' }, stepSize: 14, callback: (v) => fmtDateAxis(v as number) } },
                    y: { stacked: true, grid: { display: false }, ticks: { color: '#a1a1aa', font: { size: 11 } } },
                },
            },
        });

        // Cash Chart
        if (cashChartRef.current) cashChartRef.current.destroy();
        const ctx = cashCanvasRef.current.getContext('2d');
        const gradient = ctx?.createLinearGradient(0, 0, 0, 250);
        gradient?.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        gradient?.addColorStop(1, 'rgba(59, 130, 246, 0)');

        cashChartRef.current = new ChartJS(cashCanvasRef.current, {
            type: 'line',
            data: {
                datasets: [
                    { label: '资金', data: simResult.cashPoints, borderColor: '#ef4444', backgroundColor: gradient, borderWidth: 2, fill: true, pointRadius: 0 },
                    { label: '累计利润', data: simResult.profitPoints, borderColor: '#22c55e', borderWidth: 2, borderDash: [5, 5], fill: false, pointRadius: 0 },
                    { label: '库存', data: simResult.invPoints, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 1, fill: true, pointRadius: 0, yAxisID: 'y1' },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: true, position: 'top', labels: { color: '#a1a1aa', usePointStyle: true, pointStyle: 'line' } },
                    datalabels: { display: false },
                    annotation: {
                        annotations: {
                            zeroLine: { type: 'line', yMin: 0, yMax: 0, borderColor: '#52525b', borderWidth: 1.5, borderDash: [6, 4] },
                        },
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (c: any) => {
                                if (c.dataset.label === '库存') return `📦 库存: ${c.raw.y} 件`;
                                if (c.dataset.label === '资金') return `💸 资金: ¥${Math.round(c.raw.y).toLocaleString()}`;
                                if (c.dataset.label === '累计利润') return `💰 利润: ¥${Math.round(c.raw.y).toLocaleString()}`;
                                return '';
                            },
                        },
                    },
                },
                scales: {
                    x: { type: 'linear', min: simResult.xMin, max: simResult.xMax, position: 'top', grid: { color: '#27272a' }, ticks: { color: '#fff', font: { weight: 'bold' }, stepSize: 14, callback: (v) => fmtDateAxis(v as number) } },
                    y: { grid: { color: '#27272a' }, ticks: { color: '#a1a1aa', callback: (v) => '¥' + (v as number) / 1000 + 'k' } },
                    y1: { position: 'right', grid: { display: false }, display: false, min: 0 },
                },
            },
        });

        return () => {
            ganttChartRef.current?.destroy();
            cashChartRef.current?.destroy();
        };
    }, [simResult, state.batches, state.simStart]);

    // ============ BATCH HANDLERS ============
    const addBatch = () => {
        const last = state.batches[state.batches.length - 1];
        const newId = state.batches.length;
        const newOffset = last ? last.offset + 30 : 0;
        setState((s) => ({
            ...s,
            batches: [...s.batches, { id: newId, name: '手工补', type: 'sea', qty: 1000, offset: newOffset }],
        }));
    };

    const deleteBatch = (id: number) => {
        setState((s) => ({
            ...s,
            batches: s.batches.filter((b) => b.id !== id).map((b, i) => ({ ...b, id: i })),
        }));
    };

    const updateBatch = (id: number, key: keyof ReplenishmentBatch, value: any) => {
        setState((s) => ({
            ...s,
            batches: s.batches.map((b) => (b.id === id ? { ...b, [key]: value } : b)),
        }));
    };

    // ============ UI COMPONENTS ============
    const tabs = [
        { key: 'spec', label: '📦 规格/物流', icon: 'package_2' },
        { key: 'pricing', label: '💰 变价/回款', icon: 'attach_money' },
        { key: 'batch', label: '📝 补货推演', icon: 'local_shipping' },
        { key: 'boss', label: '📊 财务驾驶舱', icon: 'dashboard' },
    ] as const;

    const inputClass = 'w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white text-center font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
    const labelClass = 'text-xs text-zinc-500 font-bold uppercase mb-1';
    const cardClass = 'bg-[#18181b] border border-[#27272a] rounded-xl p-4';

    // ============ RENDER ============
    return (
        <div className="flex h-full bg-[#09090b] text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[420px] flex-shrink-0 border-r border-[#27272a] flex flex-col overflow-hidden">
                {/* Tabs - 直接贴顶 */}
                <div className="flex border-b border-[#27272a] bg-[#0a0a0a]">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === t.key ? 'border-blue-500 text-blue-400 bg-[#111111]' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeTab === 'spec' && (
                        <>
                            {/* 产品选择器 */}
                            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-3 border border-blue-500/30 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📦</span>
                                        <span className="text-sm font-bold text-zinc-300">选择产品</span>
                                        <span className="text-xs text-zinc-500">(自动填充规格)</span>
                                    </div>
                                    {strategies.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-amber-500">⚡️ 加载策略:</span>
                                            <select
                                                value={selectedStrategyId}
                                                onChange={(e) => handleStrategySelect(e.target.value)}
                                                className="bg-[#18181b] border border-amber-500/30 rounded px-2 py-1 text-xs text-amber-100 focus:outline-none focus:border-amber-500"
                                            >
                                                <option value="">-- 默认 --</option>
                                                {strategies.map(s => (
                                                    <option key={s.id} value={s.id}>{s.label || s.productName} (${s.results.planB.price})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <select
                                    value={selectedProductId || ''}
                                    onChange={(e) => handleProductSelect(e.target.value)}
                                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="">-- 手动输入 --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.sku || 'No SKU'})
                                        </option>
                                    ))}
                                </select>
                                {selectedProduct && (
                                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                                        <div>
                                            已选: <span className="text-blue-400">{selectedProduct.name}</span>
                                            {selectedProduct.asin && <span className="ml-2">ASIN: {selectedProduct.asin}</span>}
                                        </div>
                                        {selectedStrategyId && (
                                            <div className="text-amber-500">
                                                已应用策略: <span className="font-bold">{strategies.find(s => s.id === selectedStrategyId)?.label || '未命名策略'}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {products.length === 0 && (
                                    <div className="mt-2 text-xs text-zinc-500">
                                        暂无产品，请先在 <span className="text-blue-400">产品库</span> 中添加
                                    </div>
                                )}
                            </div>

                            <h3 className="text-sm font-bold text-zinc-300 border-b border-[#27272a] pb-2">单品包装规格 (cm/kg)</h3>
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { label: '长 (L)', key: 'boxL' },
                                    { label: '宽 (W)', key: 'boxW' },
                                    { label: '高 (H)', key: 'boxH' },
                                    { label: '重量 kg', key: 'boxWgt' },
                                ].map(({ label, key }) => (
                                    <div key={key} className={cardClass}>
                                        <div className={labelClass}>{label}</div>
                                        <input
                                            type="number"
                                            value={(state as any)[key]}
                                            onChange={(e) => setState((s) => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))}
                                            className={inputClass}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className={cardClass}>
                                <div className={labelClass}>装箱数 (Pcs/箱)</div>
                                <input
                                    type="number"
                                    value={state.pcsPerBox}
                                    onChange={(e) => setState((s) => ({ ...s, pcsPerBox: parseInt(e.target.value) || 1 }))}
                                    className={inputClass}
                                />
                            </div>

                            <h3 className="text-sm font-bold text-zinc-300 border-b border-[#27272a] pb-2 mt-6">头程运费报价</h3>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: '🚢 海运', priceKey: 'seaPriceCbm', daysKey: 'seaDays', unit: '/方', type: 'sea' as const },
                                    { label: '✈️ 空派', priceKey: 'airPriceKg', daysKey: 'airDays', unit: '/kg', type: 'air' as const },
                                    { label: '🚀 快递', priceKey: 'expPriceKg', daysKey: 'expDays', unit: '/kg', type: 'exp' as const },
                                ].map(({ label, priceKey, daysKey, unit, type }) => (
                                    <div key={type} className={cardClass + ' text-center'}>
                                        <div className="font-bold mb-2">{label}</div>
                                        <div className="flex items-center justify-center gap-1 mb-2">
                                            <input
                                                type="number"
                                                value={(state as any)[priceKey]}
                                                onChange={(e) => setState((s) => ({ ...s, [priceKey]: parseFloat(e.target.value) || 0 }))}
                                                className="w-16 bg-[#09090b] border border-[#27272a] rounded px-2 py-1 text-center font-mono text-sm"
                                            />
                                            <span className="text-xs text-zinc-500">{unit}</span>
                                        </div>
                                        <div className="flex items-center justify-center gap-1 mb-2">
                                            <input
                                                type="number"
                                                value={(state as any)[daysKey]}
                                                onChange={(e) => setState((s) => ({ ...s, [daysKey]: parseInt(e.target.value) || 0 }))}
                                                className="w-12 bg-[#09090b] border border-[#27272a] rounded px-2 py-1 text-center font-mono text-sm"
                                            />
                                            <span className="text-xs text-zinc-500">天</span>
                                        </div>
                                        <div className="text-orange-400 font-bold text-lg">${(logCosts[type] / state.exchRate).toFixed(2)}<span className="text-xs text-zinc-500">/个</span></div>
                                        <div className="text-zinc-500 text-xs">¥{logCosts[type].toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'pricing' && (
                        <>
                            {/* 推演起始日期 */}
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-lg">🗓️</span>
                                <span className="text-sm font-bold text-zinc-300">推演起始日期</span>
                                <input
                                    type="date"
                                    value={state.simStart}
                                    onChange={(e) => setState((s) => ({ ...s, simStart: e.target.value }))}
                                    className="flex-1 bg-white text-zinc-800 border border-zinc-300 rounded-lg px-3 py-2 text-center font-mono text-sm"
                                />
                            </div>

                            {/* 季节性销量均衡器 */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">📊</span>
                                    <span className="text-sm font-bold text-zinc-300">季节性销量均衡器</span>
                                    <span className="text-xs text-zinc-500">(自动高亮)</span>
                                </div>
                                <div className="bg-gradient-to-r from-[#1e3a5f] to-[#0d1b2a] rounded-xl p-4 border border-[#2d4a6f]">
                                    <div className="flex justify-between items-end gap-1">
                                        {['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map((month, i) => {
                                            const startMonth = new Date(state.simStart).getMonth();
                                            const isActive = i >= startMonth && i < startMonth + 6;
                                            return (
                                                <div key={i} className="flex flex-col items-center flex-1">
                                                    <div className={`text-xs font-bold mb-1 ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                                                        {state.seasonality[i].toFixed(1)}
                                                    </div>
                                                    <div className={`relative h-24 w-full flex justify-center ${isActive ? '' : 'opacity-40'}`}>
                                                        <input
                                                            type="range"
                                                            min={0.5}
                                                            max={1.5}
                                                            step={0.05}
                                                            value={state.seasonality[i]}
                                                            onChange={(e) => {
                                                                const newSeasonality = [...state.seasonality];
                                                                newSeasonality[i] = parseFloat(e.target.value);
                                                                setState((s) => ({ ...s, seasonality: newSeasonality }));
                                                            }}
                                                            className="vertical-slider accent-blue-400"
                                                            style={{
                                                                writingMode: 'vertical-lr',
                                                                direction: 'rtl',
                                                                width: '24px',
                                                                height: '96px',
                                                                WebkitAppearance: 'slider-vertical',
                                                            }}
                                                        />
                                                    </div>
                                                    <div className={`text-xs mt-1 ${isActive ? 'text-white font-bold' : 'text-zinc-500'}`}>
                                                        {month.replace('月', '')}月
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* 月度变价运营表 */}
                            <h3 className="text-sm font-bold text-zinc-300 border-b border-[#27272a] pb-2 mb-3">月度变价运营表 (6个月)</h3>
                            <div className="overflow-x-auto bg-[#18181b] rounded-xl border border-[#27272a]">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-[#1f2937] text-zinc-400">
                                            <th className="py-3 px-2 text-left font-bold">月份</th>
                                            {[1, 2, 3, 4, 5, 6].map((m) => (
                                                <th key={m} className="py-3 px-2 text-center font-bold">M{m}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* 基础日销 */}
                                        <tr className="border-t border-[#27272a]">
                                            <td className="py-2 px-2">
                                                <div className="font-bold text-zinc-400">基础日销</div>
                                                <div className="text-xs text-zinc-600">(基准值)</div>
                                            </td>
                                            {state.baseSales.map((v, i) => (
                                                <td key={i} className="py-2 px-1 text-center">
                                                    <input
                                                        type="number"
                                                        value={v}
                                                        onChange={(e) => {
                                                            const newSales = [...state.baseSales];
                                                            newSales[i] = parseInt(e.target.value) || 0;
                                                            setState((s) => ({ ...s, baseSales: newSales }));
                                                        }}
                                                        className="w-12 bg-white text-zinc-800 border border-zinc-300 rounded px-1 py-1.5 text-center font-mono"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        {/* 加权系数 */}
                                        <tr className="border-t border-[#27272a]">
                                            <td className="py-2 px-2">
                                                <div className="font-bold text-blue-400">加权系数</div>
                                                <div className="text-xs text-zinc-600">(自动计算)</div>
                                            </td>
                                            {(() => {
                                                const startDate = new Date(state.simStart);
                                                return [0, 1, 2, 3, 4, 5].map((m) => {
                                                    let sumCoeff = 0;
                                                    for (let d = 0; d < 30; d++) {
                                                        const curDate = new Date(startDate);
                                                        curDate.setDate(startDate.getDate() + m * 30 + d);
                                                        sumCoeff += state.seasonality[curDate.getMonth()];
                                                    }
                                                    const avgCoeff = sumCoeff / 30;
                                                    return (
                                                        <td key={m} className="py-2 px-1 text-center">
                                                            <span className="text-blue-400 font-mono font-bold">{avgCoeff.toFixed(2)}</span>
                                                        </td>
                                                    );
                                                });
                                            })()}
                                        </tr>
                                        {/* 预估实销 */}
                                        <tr className="border-t border-[#27272a] bg-[#1a1a1d]">
                                            <td className="py-2 px-2">
                                                <div className="font-bold text-orange-400">预估实销</div>
                                                <div className="text-xs text-zinc-600">(基础×系数)</div>
                                            </td>
                                            {actualSales.map((v, i) => (
                                                <td key={i} className="py-2 px-1 text-center font-bold text-white text-sm">{v}</td>
                                            ))}
                                        </tr>
                                        {/* 售价 */}
                                        <tr className="border-t border-[#27272a]">
                                            <td className="py-2 px-2 font-bold text-green-400">售价($)</td>
                                            {state.prices.map((v, i) => (
                                                <td key={i} className="py-2 px-1 text-center">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={v}
                                                        onChange={(e) => {
                                                            const newPrices = [...state.prices];
                                                            newPrices[i] = parseFloat(e.target.value) || 0;
                                                            setState((s) => ({ ...s, prices: newPrices }));
                                                        }}
                                                        className="w-12 bg-white text-zinc-800 border border-zinc-300 rounded px-1 py-1.5 text-center font-mono"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        {/* 毛利% */}
                                        <tr className="border-t border-[#27272a]">
                                            <td className="py-2 px-2 font-bold text-zinc-400">毛利%</td>
                                            {state.margins.map((v, i) => (
                                                <td key={i} className="py-2 px-1 text-center">
                                                    <input
                                                        type="number"
                                                        value={v}
                                                        onChange={(e) => {
                                                            const newMargins = [...state.margins];
                                                            newMargins[i] = parseFloat(e.target.value) || 0;
                                                            setState((s) => ({ ...s, margins: newMargins }));
                                                        }}
                                                        className={`w-12 bg-white border border-zinc-300 rounded px-1 py-1.5 text-center font-mono ${v < 0 ? 'text-red-500' : 'text-zinc-800'}`}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        {/* 预估回款 */}
                                        <tr className="border-t border-[#27272a] bg-[#1a1a1d]">
                                            <td className="py-2 px-2">
                                                <div className="font-bold text-emerald-400">预估回款</div>
                                            </td>
                                            {state.prices.map((price, i) => {
                                                const margin = state.margins[i];
                                                const sales = actualSales[i];
                                                const dailyRevenueUSD = sales * price * (1 + margin / 100) * 0.5; // 简化估算
                                                const dailyRevenueRMB = dailyRevenueUSD * state.exchRate;
                                                return (
                                                    <td key={i} className="py-2 px-1 text-center">
                                                        <div className="text-emerald-400 font-bold">${dailyRevenueUSD.toFixed(2)}</div>
                                                        <div className="text-zinc-500 text-xs">¥{dailyRevenueRMB.toFixed(1)}</div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 固定成本 */}
                            <h3 className="text-sm font-bold text-zinc-300 border-b border-[#27272a] pb-2 mt-6 mb-3">固定成本</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-400">采购单价 (¥)</span>
                                    <input
                                        type="number"
                                        value={state.unitCost}
                                        onChange={(e) => setState((s) => ({ ...s, unitCost: parseFloat(e.target.value) || 0 }))}
                                        className="w-24 bg-white text-zinc-800 border border-zinc-300 rounded-lg px-3 py-2 text-center font-mono"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-400">美元汇率</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={state.exchRate}
                                        onChange={(e) => setState((s) => ({ ...s, exchRate: parseFloat(e.target.value) || 7.2 }))}
                                        className="w-24 bg-white text-zinc-800 border border-zinc-300 rounded-lg px-3 py-2 text-center font-mono"
                                    />
                                </div>
                            </div>

                            {/* 采购账期 */}
                            <h3 className="text-sm font-bold text-zinc-300 border-b border-[#27272a] pb-2 mt-6 mb-3">采购账期</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-400">定金比例 (%)</span>
                                    <input
                                        type="number"
                                        value={state.ratioDeposit}
                                        onChange={(e) => setState((s) => ({ ...s, ratioDeposit: parseFloat(e.target.value) || 0 }))}
                                        className="w-24 bg-white text-zinc-800 border border-zinc-300 rounded-lg px-3 py-2 text-center font-mono"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-400">尾款比例 (%)</span>
                                    <input
                                        type="number"
                                        value={state.ratioBalance}
                                        onChange={(e) => setState((s) => ({ ...s, ratioBalance: parseFloat(e.target.value) || 0 }))}
                                        className="w-24 bg-white text-zinc-800 border border-zinc-300 rounded-lg px-3 py-2 text-center font-mono"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'batch' && (
                        <>
                            <div className={cardClass + ' flex items-center justify-between'}>
                                <span className="font-bold text-blue-400">🏭 生产周期 (天)</span>
                                <input
                                    type="number"
                                    value={state.prodDays}
                                    onChange={(e) => setState((s) => ({ ...s, prodDays: parseInt(e.target.value) || 0 }))}
                                    className="w-16 bg-[#09090b] border border-[#27272a] rounded px-2 py-1 text-center font-mono"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-zinc-300">补货批次列表</h3>
                                <button onClick={addBatch} className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg">+</button>
                            </div>

                            <div className="space-y-3">
                                {state.batches.map((b, idx) => (
                                    <div key={b.id} className={`${cardClass} border-l-4 ${b.type === 'sea' ? 'border-l-yellow-500' : b.type === 'air' ? 'border-l-blue-500' : 'border-l-red-500'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-bold">#{idx + 1} {b.name}</span>
                                            <button onClick={() => deleteBatch(b.id)} className="text-red-400 hover:text-red-300 text-xl">×</button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <select
                                                value={b.type}
                                                onChange={(e) => updateBatch(b.id, 'type', e.target.value)}
                                                className="bg-[#09090b] border border-[#27272a] rounded px-2 py-1.5 text-sm"
                                            >
                                                <option value="sea">🚢 海</option>
                                                <option value="air">✈️ 空</option>
                                                <option value="exp">🚀 快</option>
                                            </select>
                                            <input
                                                type="number"
                                                value={b.qty}
                                                onChange={(e) => updateBatch(b.id, 'qty', parseInt(e.target.value) || 0)}
                                                placeholder="数量"
                                                className="bg-[#09090b] border border-[#27272a] rounded px-2 py-1.5 text-center font-mono text-sm"
                                            />
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-zinc-500">T+</span>
                                                <input
                                                    type="number"
                                                    value={b.offset}
                                                    onChange={(e) => updateBatch(b.id, 'offset', parseInt(e.target.value) || 0)}
                                                    className="w-full bg-[#09090b] border border-[#27272a] rounded px-2 py-1.5 text-center font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={400}
                                            value={b.offset}
                                            onChange={(e) => updateBatch(b.id, 'offset', parseInt(e.target.value))}
                                            className="w-full mt-3 accent-blue-500"
                                        />
                                        <div className="flex justify-between text-xs text-zinc-500 mt-1">
                                            <span>下单: {fmtDate(new Date(new Date(state.simStart).getTime() + b.offset * 86400000))}</span>
                                            <span className="text-orange-400">发货: {fmtDate(new Date(new Date(state.simStart).getTime() + (b.offset + state.prodDays) * 86400000))}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {state.batches.length === 0 && (
                                <button onClick={autoGenerate} className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-sm">
                                    ⚡️ 根据销量自动生成计划
                                </button>
                            )}
                        </>
                    )}

                    {activeTab === 'boss' && simResult && (
                        <>
                            <h3 className="text-sm font-bold text-zinc-300 border-b border-[#27272a] pb-2">📊 财务核心指标</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className={cardClass + ' text-center border-yellow-500/30'}>
                                    <div className="text-2xl mb-1">💰</div>
                                    <div className={labelClass}>资金最大占用</div>
                                    <div className="text-2xl font-black text-red-400">{fmtMoney(Math.abs(simResult.minCash))}</div>
                                    <div className="text-xs text-green-400">需准备本金</div>
                                </div>
                                <div className={cardClass + ' text-center'}>
                                    <div className="text-2xl mb-1">🚀</div>
                                    <div className={labelClass}>资金利润率 (ROI)</div>
                                    <div className="text-2xl font-black text-green-400">
                                        {simResult.minCash !== 0 ? (Math.abs(simResult.totalNetProfit / simResult.minCash) * 100).toFixed(1) : 0}%
                                    </div>
                                    <div className="text-xs text-zinc-500">总利润 / 占用</div>
                                </div>
                                <div className={cardClass + ' text-center'}>
                                    <div className="text-2xl mb-1">🔄</div>
                                    <div className={labelClass}>资金周转率</div>
                                    <div className="text-2xl font-black text-blue-400">
                                        {simResult.minCash !== 0 ? Math.abs(simResult.totalRevenue / simResult.minCash).toFixed(2) : 0}
                                    </div>
                                    <div className="text-xs text-zinc-500">销售额 / 占用</div>
                                </div>
                                <div className={cardClass + ' text-center'}>
                                    <div className="text-2xl mb-1">📈</div>
                                    <div className={labelClass}>综合净利率</div>
                                    <div className="text-2xl font-black text-white">
                                        {simResult.totalRevenue !== 0 ? ((simResult.totalNetProfit / simResult.totalRevenue) * 100).toFixed(1) : 0}%
                                    </div>
                                    <div className="text-xs text-zinc-500">总利润 / 销售额</div>
                                </div>
                            </div>

                            <h3 className="text-sm font-bold text-zinc-300 border-b border-[#27272a] pb-2 mt-6">⏳ 关键时间点</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className={cardClass + ' text-center'}>
                                    <div className="text-2xl mb-1">🪙</div>
                                    <div className={labelClass}>回本日期</div>
                                    <div className="text-xl font-black text-blue-400">{simResult.breakevenDate}</div>
                                </div>
                                <div className={cardClass + ' text-center'}>
                                    <div className="text-2xl mb-1">🎉</div>
                                    <div className={labelClass}>盈利起始日</div>
                                    <div className="text-xl font-black text-green-400">{simResult.profBeDateStr}</div>
                                </div>
                            </div>

                            <div className={cardClass + ' mt-4'}>
                                <div className="font-bold text-zinc-300 mb-2">💵 累计净利润</div>
                                <div className="text-3xl font-black text-green-400">{fmtMoney(simResult.totalNetProfit)}</div>
                            </div>
                        </>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* KPI Bar */}
                <div className="h-14 px-6 flex items-center gap-8 border-b border-[#27272a] bg-[#0a0a0a] flex-shrink-0">
                    <div>
                        <div className="text-xs text-zinc-500 uppercase font-bold">资金最大占用</div>
                        <div className="text-lg font-black text-red-400">{simResult ? fmtMoney(Math.abs(simResult.minCash)) : '¥0'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 uppercase font-bold">累计净利润</div>
                        <div className="text-lg font-black text-green-400">{simResult ? fmtMoney(simResult.totalNetProfit) : '¥0'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-zinc-500 uppercase font-bold">回本日期</div>
                        <div className="text-lg font-black text-blue-400">{simResult?.breakevenDate || '--'}</div>
                    </div>
                </div>

                {/* Charts */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="h-1/2 border-b border-[#27272a] p-4 overflow-hidden">
                        <canvas ref={ganttCanvasRef} />
                    </div>
                    <div className="h-1/2 p-4 overflow-hidden">
                        <canvas ref={cashCanvasRef} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReplenishmentAdvice;
