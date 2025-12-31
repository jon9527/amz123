import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReplenishmentBatch, SavedProfitModel } from '../types';
import { runSimulation, fmtDate } from './ReplenishmentEngine';
import { ModuleState, SimulationResult, FinancialEvent, LogisticsCosts } from './ReplenishmentTypes';
import { useProducts } from '../ProductContext';
import { useLogistics } from '../LogisticsContext';
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
    ScatterController,
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
    ScatterController,
    annotationPlugin,
    ChartDataLabels
);

// ============ HELPERS ============
// fmtDate is imported from ReplenishmentEngine

const fmtMoney = (v: number) => `$${Math.round(v).toLocaleString()}`;


const getDefaultState = (): ModuleState => ({
    boxL: 60, boxW: 40, boxH: 40, boxWgt: 15,
    pcsPerBox: 20,
    seaPriceCbm: 450, seaPriceKg: 10, seaDays: 35, seaUnit: 'cbm',
    airPriceKg: 42, airDays: 10,
    expPriceKg: 38, expDays: 5,
    // 默认选择的物流渠道
    seaChannelId: '3',  // 普船海卡
    airChannelId: '4',  // 空派专线
    expChannelId: '5',  // 红单快递
    simStart: new Date().toISOString().split('T')[0],
    monthlyDailySales: [50, 55, 60, 55, 50, 45, 40, 40, 50, 60, 80, 100], // 1-12月日销量
    seasonality: Array(12).fill(1.0), // 保留向后兼容
    baseSales: Array(6).fill(50), // 保留向后兼容
    prices: [19.99, 24.99, 29.99, 29.99, 29.99, 29.99],
    margins: [-10, 10, 20, 20, 25, 25],
    unitCost: 20,
    sellCost: 0,
    shippingUSD: 0,
    profitUSD: 0,
    exchRate: 7.2,
    ratioDeposit: 0.3,
    ratioBalance: 0.7,
    prodDays: 15,
    batches: [],
    isFreeMode: false,
});

// ============ NumberStepper 输入组件 ============
interface NumberStepperProps {
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    decimals?: number;
    readOnly?: boolean;
    negative?: boolean; // 显示为红色（负数）
    className?: string;
}

const NumberStepper: React.FC<NumberStepperProps> = ({
    value, onChange, step = 1, min = -Infinity, max = Infinity, decimals = 0, readOnly = false, negative = false, className = ''
}) => {
    const [displayValue, setDisplayValue] = useState(value.toFixed(decimals));

    useEffect(() => {
        setDisplayValue(value.toFixed(decimals));
    }, [value, decimals]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDisplayValue(val);
    };

    const commitChange = () => {
        const num = parseFloat(displayValue);
        if (isNaN(num)) {
            setDisplayValue(value.toFixed(decimals));
        } else {
            const clamped = Math.max(min, Math.min(max, num));
            setDisplayValue(clamped.toFixed(decimals));
            if (clamped !== value) onChange(clamped);
        }
    };

    const handleBlur = () => {
        commitChange();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    const inc = () => onChange(Math.min(max, parseFloat((value + step).toFixed(decimals || 2))));
    const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(decimals || 2))));

    return (
        <div className={`relative group ${className}`}>
            <input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleInput}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                readOnly={readOnly}
                className={`w-full bg-zinc-800/50 border border-zinc-700 rounded-lg text-center font-mono font-bold py-0.5 text-xs focus:border-blue-500 outline-none transition-colors ${negative ? 'text-red-400' : 'text-white'} ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            />
            {!readOnly && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-zinc-900 rounded-r-lg border-l border-zinc-700 h-full justify-center">
                    <button
                        onClick={inc}
                        className="text-zinc-500 hover:text-white leading-none material-symbols-outlined text-[10px] h-1/2 flex items-center justify-center px-0.5 hover:bg-zinc-700/50 rounded-tr-lg"
                    >
                        expand_less
                    </button>
                    <button
                        onClick={dec}
                        className="text-zinc-500 hover:text-white leading-none material-symbols-outlined text-[10px] h-1/2 flex items-center justify-center px-0.5 hover:bg-zinc-700/50 rounded-br-lg"
                    >
                        expand_more
                    </button>
                </div>
            )}
        </div>
    );
};

// ============ COMPONENT ============
const STORAGE_KEY = 'replenishment_advice_state';

const ReplenishmentAdvice: React.FC = () => {
    // ============ STATE ============
    // 当前选中的产品ID
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [strategies, setStrategies] = useState<SavedProfitModel[]>([]);
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
    const { products } = useProducts();
    const { channels } = useLogistics();

    // 从localStorage加载初始状态
    const getInitialState = (): ModuleState => {
        const defaultState = getDefaultState();
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const savedState = parsed.moduleState;
                if (savedState) {
                    // 合并默认值和保存的值，确保所有字段都存在
                    return { ...defaultState, ...savedState };
                }
            }
        } catch (e) {
            console.warn('Failed to load replenishment state:', e);
        }
        return {
            // 规格与物流
            boxL: 60, boxW: 40, boxH: 40, boxWgt: 15,
            pcsPerBox: 30,
            seaPriceCbm: 1000, seaPriceKg: 10, seaDays: 35, seaUnit: 'cbm',
            airPriceKg: 35, airDays: 10,
            expPriceKg: 45, expDays: 5,

            // 默认物流
            seaChannelId: '3',
            airChannelId: '4',
            expChannelId: '5',

            // 模拟参数
            simStart: new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0],
            monthlyDailySales: [50, 55, 60, 55, 50, 45, 40, 40, 50, 60, 80, 100], // 1-12月日销量
            seasonality: Array(12).fill(1.0), // 保留向后兼容
            baseSales: Array(6).fill(50), // 保留向后兼容
            prices: Array(12).fill(0),
            margins: Array(12).fill(0),

            // 资金
            unitCost: 10.0,
            sellCost: 0,
            shippingUSD: 0,
            profitUSD: 0,
            exchRate: 7.2,
            ratioDeposit: 0.3,
            ratioBalance: 0.7,
            prodDays: 15,

            // 批次数据
            batches: [
                { id: 0, name: '批次1', type: 'sea', qty: 1000, offset: 0, prodDays: 15 },
                { id: 1, name: '批次2', type: 'sea', qty: 1000, offset: 30, prodDays: 15 },
            ],
            isFreeMode: false,
        };
    };

    const [state, setState] = useState<ModuleState>(getInitialState);

    // 从localStorage恢复选择状态
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.selectedProductId) {
                    setSelectedProductId(parsed.selectedProductId);
                    // 加载该产品的利润策略
                    const allModels = ProfitModelService.getAll();
                    const productModels = allModels.filter((m: SavedProfitModel) => m.productId === parsed.selectedProductId);
                    setStrategies(productModels);
                    if (parsed.selectedStrategyId) {
                        setSelectedStrategyId(parsed.selectedStrategyId);
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to restore selection state:', e);
        }
    }, []);

    // 保存状态到localStorage
    useEffect(() => {
        try {
            const dataToSave = {
                moduleState: state,
                selectedProductId,
                selectedStrategyId
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.warn('Failed to save replenishment state:', e);
        }
    }, [state, selectedProductId, selectedStrategyId]);

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

    // 监听策略选择 - 所有月份填充相同的售价和净利润
    const handleStrategySelect = (sid: string) => {
        setSelectedStrategyId(sid);
        if (!sid) return;

        const strategy = strategies.find(s => s.id === sid);
        if (strategy) {
            // 使用 Plan B (实际定价) 或 Plan A (目标定价)
            const targetData = strategy.results.planB.price > 0 ? strategy.results.planB : strategy.results.planA;

            // 所有月份填充相同的售价和净利润%
            const marginPct = targetData.margin * 100; // 转换为百分比

            setState(prev => ({
                ...prev,
                prices: Array(12).fill(targetData.price),
                margins: Array(12).fill(parseFloat(marginPct.toFixed(1))),
                // 保存回款计算所需的值
                unitCost: strategy.results.costProdUSD > 0 ? strategy.results.costProdUSD : prev.unitCost,
                sellCost: targetData.sellCost || 0, // 总成本(无广)
                shippingUSD: strategy.inputs.shippingUSD || 0, // 头程USD
                profitUSD: targetData.profit || 0, // 净利润USD
                exchRate: strategy.inputs.exchRate || prev.exchRate, // 使用策略的汇率
            }));
        }
    };

    // 根据售价计算费用明细 (返回回款、净利%等)
    const computeFeeBreakdown = useCallback((newPrice: number, strategyId: string): {
        netMargin: number;
        recallUSD: number;
        platformFees: number;
        netProfit: number;
    } => {
        const strategy = strategies.find(s => s.id === strategyId);
        if (!strategy || newPrice <= 0) return { netMargin: 0, recallUSD: 0, platformFees: 0, netProfit: 0 };

        const inputs = strategy.inputs;
        const results = strategy.results;

        // 获取成本项（来自策略）
        const costProdUSD = results.costProdUSD; // 采购成本USD
        const logisticsUSD = inputs.shippingUSD + inputs.miscFee; // 物流杂费
        const storageFee = inputs.storageFee || 0; // 仓储费
        const fbaFee = inputs.fbaFee; // FBA配送费

        // 平台佣金 (动态，根据新售价计算)
        const commRate = results.planB.commRate || 0.15;
        const commission = newPrice * commRate;

        // 退货损耗 (简化计算)
        const retRate = inputs.returnRate ?? 5;
        const unsellRate = inputs.unsellableRate ?? 0;
        const retProcFee = inputs.retProcFee ?? 0;
        const retRemFee = inputs.retRemFee ?? 0;
        const adminFee = Math.min(5.00, commission * 0.20);
        const lossSellable = retProcFee + adminFee + fbaFee;
        const lossUnsellable = lossSellable + costProdUSD + inputs.shippingUSD + retRemFee;
        const returnsCost = ((lossSellable * (1 - unsellRate / 100)) + (lossUnsellable * (unsellRate / 100))) * (retRate / 100);

        // 广告费 (使用策略中的TACOS)
        const tacos = inputs.targetAcos || 15; // 默认15%
        const adSpend = newPrice * (tacos / 100);

        // 平台费用 = 佣金 + FBA + 广告 + 退货损耗 + 月仓储费
        const platformFees = commission + fbaFee + adSpend + returnsCost + storageFee;

        // 回款 = 售价 - 平台费用
        const recallUSD = newPrice - platformFees;

        // 总成本 (包含广告)
        const totalCost = costProdUSD + logisticsUSD + storageFee + fbaFee + returnsCost + commission + adSpend;

        // 净利润和利润率
        const netProfit = newPrice - totalCost;
        const netMargin = newPrice > 0 ? (netProfit / newPrice) * 100 : 0;

        return {
            netMargin: parseFloat(netMargin.toFixed(1)),
            recallUSD,
            platformFees,
            netProfit
        };
    }, [strategies]);

    // 兼容旧接口：只返回净利%
    const computeMarginFromPrice = useCallback((newPrice: number, strategyId: string): number => {
        return computeFeeBreakdown(newPrice, strategyId).netMargin;
    }, [computeFeeBreakdown]);

    // 更新某月售价，并自动计算净利%
    const handlePriceChange = useCallback((monthIndex: number, newPrice: number) => {
        setState(prev => {
            const newPrices = [...prev.prices];
            newPrices[monthIndex] = newPrice;

            // 如果是 M2-M6 且有选定策略，自动计算毛利
            const newMargins = [...prev.margins];
            if (monthIndex > 0 && selectedStrategyId) {
                newMargins[monthIndex] = computeMarginFromPrice(newPrice, selectedStrategyId);
            }

            return { ...prev, prices: newPrices, margins: newMargins };
        });
    }, [selectedStrategyId, computeMarginFromPrice]);

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const [activeTab, setActiveTab] = useState<'spec' | 'pricing' | 'batch' | 'boss'>('spec');
    const [logCosts, setLogCosts] = useState<LogisticsCosts>({ sea: 0, air: 0, exp: 0 });



    const [simResult, setSimResult] = useState<SimulationResult | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<{ event: FinancialEvent; x: number; y: number } | null>(null);
    const [hiddenEventTypes, setHiddenEventTypes] = useState<Set<string>>(new Set());
    const [hiddenChartLines, setHiddenChartLines] = useState<Set<string>>(new Set());

    const ganttCanvasRef = useRef<HTMLCanvasElement>(null);
    const cashCanvasRef = useRef<HTMLCanvasElement>(null);
    const ganttChartRef = useRef<ChartJS | null>(null);
    const cashChartRef = useRef<ChartJS | null>(null);

    // ============ AUTO GENERATE BATCHES ON FIRST LOAD ============


    // ============ LOGISTICS CALC ============
    useEffect(() => {
        const { boxL, boxW, boxH, boxWgt, pcsPerBox, seaPriceCbm, seaPriceKg, seaUnit, airPriceKg, expPriceKg, seaChannelId, airChannelId, expChannelId } = state;
        if (pcsPerBox === 0) return;

        const calcOne = (type: 'sea' | 'air' | 'exp', manualPrice: number, chanId?: string) => {
            const channel = channels.find(c => c.id === chanId);

            // 确定是否按KG计费
            // 海运：如果选了渠道且渠道有KG报价，优先用KG；否则看手动模式的setup
            // 空/快：默认KG
            let useKg = type !== 'sea';
            if (type === 'sea') {
                if (channel) {
                    useKg = !!channel.pricePerKg && channel.pricePerKg > 0;
                } else {
                    useKg = seaUnit === 'kg';
                }
            }

            const volDivisor = channel ? (channel.volDivisor || 0) : (type === 'sea' ? 6000 : (type === 'air' ? 6000 : 5000));
            // Price Selection
            let price = 0;
            if (channel) {
                price = useKg ? (channel.pricePerKg || 0) : (channel.pricePerCbm || 0);
            } else {
                price = (type === 'sea' && useKg) ? seaPriceKg : manualPrice;
            }

            // Volumetric Weight (kg)
            const dimVol = (boxL * boxW * boxH); // cm3
            // 海运默认也是 6000 (1:167)
            const divisor = volDivisor > 0 ? volDivisor : 6000;
            const volWgt = dimVol / divisor;
            const chgWgt = Math.max(boxWgt, volWgt);

            if (type === 'sea') {
                // 海运逻辑: 
                // 如果按KG计费: chgWgt * price
                // 如果按CBM计费: (chgWgt / 167) * price  (因为 1 CBM = 167 KG, chgWgt 是基于1:167算的)
                if (useKg) {
                    return (chgWgt * price) / pcsPerBox;
                } else {
                    // CBM Mode
                    // Re-verify standard: CBM = dimVol / 1,000,000. 
                    // Verify if chgWgt logic holds. 
                    // dimVol/6000 / 167 ≈ dimVol / 1,000,000. Yes.
                    // But if Heavy Goods (Weight > Vol), chgWgt is Weight. 
                    // CBM equivalent = Weight / 167. Correct.
                    return ((chgWgt / 167) * price) / pcsPerBox;
                }
            } else {
                // Air/Exp is Weight based
                return (chgWgt * price) / pcsPerBox;
            }
        };

        setLogCosts({
            sea: calcOne('sea', seaPriceCbm, seaChannelId),
            air: calcOne('air', airPriceKg, airChannelId),
            exp: calcOne('exp', expPriceKg, expChannelId),
        });
    }, [state.boxL, state.boxW, state.boxH, state.boxWgt, state.pcsPerBox,
    state.seaPriceCbm, state.seaPriceKg, state.seaUnit, state.airPriceKg, state.expPriceKg,
    state.seaChannelId, state.airChannelId, state.expChannelId,
        channels]);



    // ============ AUTO INIT ============
    const hasAutoAligned = useRef(false);
    useEffect(() => {
        // 首次加载时自动执行完美接力
        if (!hasAutoAligned.current && state.monthlyDailySales.length > 0) {
            hasAutoAligned.current = true;
            autoAlignBatches();
        }
    }, [state.monthlyDailySales]);

    // ============ SIMULATION ENGINE ============
    const calcSimulation = useCallback((): SimulationResult => {
        return runSimulation(state, logCosts, selectedStrategyId, computeFeeBreakdown);
    }, [state, logCosts, selectedStrategyId, computeFeeBreakdown]);

    // ============ RUN SIMULATION ============
    useEffect(() => {
        if (state.batches.length > 0) {
            const result = calcSimulation();
            setSimResult(result);
        }
    }, [state, logCosts, calcSimulation]);

    // ============ AUTO GENERATE BATCHES ============
    const autoGenerate = () => {
        const newBatches: ReplenishmentBatch[] = [];
        for (let i = 0; i < 6; i++) {
            const nextId = state.batches.length + i; // Calculate nextId for each new batch
            const lastBatch = state.batches.length > 0 ? state.batches[state.batches.length - 1] : null;
            newBatches.push({ // Push to the newBatches array
                id: nextId,
                name: `New Batch ${nextId + 1}`,
                type: 'sea' as const,
                qty: 1000,
                offset: lastBatch ? lastBatch.offset + 30 : 0,
                prodDays: 5,
            });
        }
        setState((s) => ({ ...s, batches: newBatches }));
    };

    // ============ CHARTS ============
    // 1. Cleanup Effect - Runs only on Unmount
    useEffect(() => {
        return () => {
            ganttChartRef.current?.destroy();
            ganttChartRef.current = null;
            cashChartRef.current?.destroy();
            cashChartRef.current = null;
        };
    }, []);

    // 2. Logic Effect - Handles Create OR Update
    useEffect(() => {
        if (!simResult) return;

        // Helper: 动态调整Y轴0点位置。如果有负数，抬高0点(15%)；全正数则沉底(0%)消灭空白。
        const alignZeroHelper = (scale: any) => {
            // 右轴(库存): 始终从0开始，不采用动态对齐，固定在底部
            if (scale.id === 'y1') {
                scale.min = 0;
                scale.max = Math.max(10, scale.max);
                return;
            }

            // 左轴(资金): 维持动态逻辑
            const chart = scale.chart;
            let hasNegative = false;
            // Scan visible datasets for negative values
            if (chart.data && chart.data.datasets) {
                chart.data.datasets.forEach((d: any, i: number) => {
                    const meta = chart.getDatasetMeta(i);
                    // Match scale ID
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

        const yLabels = state.batches.map((b, i) => `批次${i + 1}\n${b.qty}件`);

        const fmtDateAxis = (val: number) => {
            const d = new Date(state.simStart);
            d.setDate(d.getDate() + val);
            return fmtDate(d);
        };

        const commonXScale = {
            type: 'linear' as const,
            min: simResult.xMin,
            max: simResult.xMax, // Allow dynamic X-range updates
            grid: { color: '#3f3f46', lineWidth: 1 },
            ticks: { color: '#fff', font: { weight: 'bold' as const, size: 11 }, stepSize: 14, callback: (v: any) => fmtDateAxis(v as number) },
        };
        const yAxisWidth = 60;
        const chartPadding = { left: 0, right: 20, top: 45, bottom: 0 }; // Deprecated, kept for reference if needed
        const ganttPadding = { left: 0, right: 20, top: 10, bottom: 0 };
        const cashPadding = { left: 0, right: 20, top: 15, bottom: 0 };


        // --- GANTT CHART ---
        if (ganttChartRef.current) {
            // Update Existing
            const chart = ganttChartRef.current;

            // 必须更新 labels 和 callback 以反映最新的 state
            chart.data.labels = state.batches.map((_, i) => i.toString());

            if (chart.options.scales?.y?.ticks) {
                chart.options.scales.y.ticks.callback = function (val: any) {
                    const idx = typeof val === 'string' ? parseInt(val) : val;
                    const b = state.batches[idx];
                    if (!b) return '';
                    const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
                    return `批次${idx + 1}\n${finalQty}件`.split('\n');
                };
            }

            chart.data.datasets[0].data = simResult.ganttProd;
            chart.data.datasets[1].data = simResult.ganttShip;
            chart.data.datasets[2].data = simResult.ganttHold;
            chart.data.datasets[3].data = simResult.ganttSell;
            chart.data.datasets[4].data = simResult.ganttStockout;

            if (chart.options.scales?.x) {
                chart.options.scales.x = { ...commonXScale, position: 'bottom', grid: { color: '#3f3f46', lineWidth: 1 } };
            }
            chart.update('none');
        } else if (ganttCanvasRef.current) {
            // Create New
            ganttChartRef.current = new ChartJS(ganttCanvasRef.current, {
                type: 'bar',
                data: {
                    // 使用索引作为 Category Labels，确保顺序固定
                    labels: state.batches.map((_, i) => i.toString()),
                    datasets: [
                        { label: '产', data: simResult.ganttProd, backgroundColor: '#d94841', borderRadius: 4, barThickness: 35 },
                        { label: '运', data: simResult.ganttShip, backgroundColor: '#e6a23c', borderRadius: 4, barThickness: 35 },
                        { label: '待', data: simResult.ganttHold, backgroundColor: '#909399', borderRadius: 0, barThickness: 35 },
                        { label: '销', data: simResult.ganttSell, backgroundColor: '#2e9f6e', borderRadius: 4, barThickness: 35 },
                        { label: '断货', data: simResult.ganttStockout, backgroundColor: 'rgba(217, 72, 65, 0.3)', borderColor: '#d94841', borderWidth: 1, borderRadius: 4, barThickness: 20 },
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
                                    if (ctx.dataset.label === '产') return [`🗓️ ${start} - ${end}`, `💰 成本: $${Math.round(d.cost).toLocaleString()}`];
                                    if (ctx.dataset.label === '运') return [`🗓️ ${start} - ${end}`, `🚚 运费: $${Math.round(d.freight).toLocaleString()}`];
                                    if (ctx.dataset.label === '销') return [`🗓️ ${start} - ${end}`, `💵 回款: $${Math.round(d.revenue).toLocaleString()}`];
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
                                    // 动态获取最新 Label
                                    const idx = typeof val === 'string' ? parseInt(val) : val;
                                    const b = state.batches[idx];
                                    if (!b) return '';
                                    const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
                                    const label = `批次${idx + 1}\n${finalQty}件`;
                                    return label.split('\n');
                                }
                            }
                        },
                        // 右边隐藏轴，用于对齐下方图表
                        y1: { position: 'right', display: false, afterFit: (axis: any) => { axis.width = 65; } },
                    },
                },
            });
        }

        // --- CASH CHART ---
        if (cashChartRef.current) {
            // Hot-fix: 如果现有实例没有 eventIcons 插件，则销毁重建
            const plugins = cashChartRef.current.config.plugins as any[];
            const hasPlugin = plugins?.find((p: any) => p.id === 'eventIcons');
            if (!hasPlugin) {
                cashChartRef.current.destroy();
                cashChartRef.current = null;
            }
        }


        // Calculate Safety Stock Points (14 Days)
        const safetyPoints = simResult.invPoints.map(p => {
            const date = new Date(state.simStart);
            date.setDate(date.getDate() + p.x);
            const demand = state.monthlyDailySales[date.getMonth()] || 50;
            return { x: p.x, y: demand * 14 };
        });

        if (cashChartRef.current) {
            // Update Existing
            const chart = cashChartRef.current;
            (chart.config as any)._customData = { simResult, hiddenEventTypes, setSelectedEvent }; // Update data for plugin
            chart.data.datasets[0].data = simResult.cashPoints;
            chart.data.datasets[0].hidden = hiddenChartLines.has('cash');
            chart.data.datasets[1].data = simResult.profitPoints;
            chart.data.datasets[1].hidden = hiddenChartLines.has('profit');
            chart.data.datasets[2].data = simResult.invPoints;
            chart.data.datasets[2].hidden = hiddenChartLines.has('inventory');

            // Safety Stock
            if (chart.data.datasets[5]) {
                chart.data.datasets[5].data = safetyPoints;
                chart.data.datasets[5].hidden = hiddenChartLines.has('inventory'); // Hide with inventory
            }

            // 更新回本点和盈利点 scatter datasets - 如果对应线隐藏则也隐藏
            chart.data.datasets[3].data = simResult.bePoint && !hiddenChartLines.has('cash') ? [simResult.bePoint] : [];
            chart.data.datasets[4].data = simResult.profBePoint && !hiddenChartLines.has('profit') ? [simResult.profBePoint] : [];

            // 动态更新 annotations - 根据隐藏状态
            const annotations: any = {};
            // 只有资金或利润线显示时才显示0线
            if (!hiddenChartLines.has('cash') || !hiddenChartLines.has('profit')) {
                annotations.zeroLine = { type: 'line', yMin: 0, yMax: 0, borderColor: '#52525b', borderWidth: 1.5, borderDash: [6, 4] };
            }
            // 资金线显示时才显示回本线
            if (simResult.beIdx !== null && !hiddenChartLines.has('cash')) {
                annotations.breakEvenLine = {
                    type: 'line',
                    xMin: simResult.beIdx,
                    xMax: simResult.beIdx,
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    label: {
                        display: true,
                        content: `回本 ${simResult.breakevenDate}`,
                        position: 'start',
                        backgroundColor: '#6366f1',
                        color: '#fff',
                        font: { size: 10, weight: 'bold' }
                    }
                };
            }
            // 利润线显示时才显示盈利线
            if (simResult.profBeIdx !== null && !hiddenChartLines.has('profit')) {
                annotations.profitLine = {
                    type: 'line',
                    xMin: simResult.profBeIdx,
                    xMax: simResult.profBeIdx,
                    borderColor: '#22c55e',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    label: {
                        display: true,
                        content: `盈利 ${simResult.profBeDateStr}`,
                        position: 'center',
                        backgroundColor: '#22c55e',
                        color: '#fff',
                        font: { size: 10, weight: 'bold' }
                    }
                };
            }
            if (chart.options.plugins?.annotation) {
                (chart.options.plugins.annotation as any).annotations = annotations;
            }


            // Critical: Update Scale Callback to reflect new simStart
            if (chart.options.scales?.x) {
                chart.options.scales.x = { ...commonXScale, ticks: { ...commonXScale.ticks, display: false }, grid: { color: '#3f3f46', lineWidth: 1 } };
            }
            // 设定Y轴：使用 helper 自动对齐0轴
            if (chart.options.scales?.y1) {
                (chart.options.scales.y1 as any).display = true;
                (chart.options.scales.y1 as any).afterDataLimits = alignZeroHelper;
                (chart.options.scales.y1 as any).ticks = { color: '#60a5fa', precision: 0, callback: (v: any) => v < 0 ? '' : v.toLocaleString() + '件' };
            }
            if (chart.options.scales?.y) {
                (chart.options.scales.y as any).display = true;
                (chart.options.scales.y as any).afterDataLimits = alignZeroHelper;
                (chart.options.scales.y as any).ticks = {
                    color: '#a1a1aa',
                    precision: 0,
                    callback: (v: number) => Math.abs(v) >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v
                };
            }
            chart.update('none');
        } else if (cashCanvasRef.current) {
            // Create New
            const ctx = cashCanvasRef.current.getContext('2d');
            // 构建动态 annotations
            const buildAnnotations = () => {
                const annotations: any = {
                    zeroLine: { type: 'line', yMin: 0, yMax: 0, borderColor: '#52525b', borderWidth: 1.5, borderDash: [6, 4] },
                };
                if (simResult.beIdx !== null) {
                    annotations.breakEvenLine = {
                        type: 'line',
                        xMin: simResult.beIdx,
                        xMax: simResult.beIdx,
                        borderColor: '#6366f1',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        label: {
                            display: true,
                            content: `回本 ${simResult.breakevenDate}`,
                            position: 'start',
                            backgroundColor: '#6366f1',
                            color: '#fff',
                            font: { size: 10, weight: 'bold' }
                        }
                    };
                }
                if (simResult.profBeIdx !== null) {
                    annotations.profitLine = {
                        type: 'line',
                        xMin: simResult.profBeIdx,
                        xMax: simResult.profBeIdx,
                        borderColor: '#22c55e',
                        borderWidth: 2,
                        borderDash: [6, 4],
                        label: {
                            display: true,
                            content: `盈利 ${simResult.profBeDateStr}`,
                            position: 'center',
                            backgroundColor: '#22c55e',
                            color: '#fff',
                            font: { size: 10, weight: 'bold' }
                        }
                    };
                }
                return annotations;
            };

            const gradient = ctx?.createLinearGradient(0, 0, 0, 250);
            gradient?.addColorStop(0, 'rgba(64, 158, 255, 0.4)');
            gradient?.addColorStop(1, 'rgba(64, 158, 255, 0)');


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
                            ctx.beginPath();
                            ctx.arc(xPos, yPos, 4, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (e.type === 'balance') {
                            ctx.fillStyle = '#ec4899';
                            ctx.beginPath();
                            ctx.arc(xPos, yPos, 4, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (e.type === 'freight') {
                            ctx.fillStyle = '#fbbf24';
                            ctx.beginPath();
                            ctx.moveTo(xPos, yPos - 4);
                            ctx.lineTo(xPos - 4, yPos + 4);
                            ctx.lineTo(xPos + 4, yPos + 4);
                            ctx.fill();
                        } else if (e.type === 'recall') {
                            ctx.fillStyle = '#4ade80';
                            ctx.font = '10px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
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

                        return Math.pow(mouseX - xPos, 2) + Math.pow(mouseY - yPos, 2) <= 100; // 10px radius
                    });

                    if (clickedEvent) {
                        const nativeEvent = event.native;
                        dSetSelected({ event: clickedEvent, x: nativeEvent.clientX, y: nativeEvent.clientY });
                        args.changed = true;
                    }
                }
            };

            cashChartRef.current = new ChartJS(cashCanvasRef.current, {
                type: 'line',
                plugins: [eventIconsPlugin],
                data: {
                    datasets: [
                        { label: '资金', data: simResult.cashPoints, borderColor: '#f56c6c', backgroundColor: 'transparent', borderWidth: 2, fill: true, pointRadius: 0, yAxisID: 'y', hidden: hiddenChartLines.has('cash') },
                        { label: '累计利润', data: simResult.profitPoints, borderColor: '#67c23a', borderWidth: 2, borderDash: [5, 5], fill: false, pointRadius: 0, yAxisID: 'y', hidden: hiddenChartLines.has('profit') },
                        { label: '库存', data: simResult.invPoints, borderColor: '#409eff', backgroundColor: gradient, borderWidth: 1, fill: true, pointRadius: 0, yAxisID: 'y1', hidden: hiddenChartLines.has('inventory') },
                        // 回本点散点
                        {
                            label: '回本点',
                            type: 'scatter' as const,
                            data: simResult.bePoint ? [simResult.bePoint] : [],
                            backgroundColor: '#6366f1',
                            borderColor: '#fff',
                            borderWidth: 2,
                            pointRadius: 8,
                            pointHoverRadius: 10,
                            yAxisID: 'y'
                        },
                        // 盈利点散点
                        {
                            label: '盈利点',
                            type: 'scatter' as const,
                            data: simResult.profBePoint ? [simResult.profBePoint] : [],
                            backgroundColor: '#22c55e',
                            borderColor: '#fff',
                            borderWidth: 2,
                            pointRadius: 8,
                            pointHoverRadius: 10,
                            yAxisID: 'y'
                        },
                        // 安全库存线
                        {
                            label: '安全库存',
                            data: safetyPoints,
                            borderColor: '#94a3b8', // Slate 400 - Distinct Ref Line
                            borderWidth: 1.5,
                            borderDash: [4, 4],
                            fill: false,
                            pointRadius: 0,
                            yAxisID: 'y1',
                            hidden: hiddenChartLines.has('inventory')
                        },
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
                        annotation: {
                            annotations: buildAnnotations(),
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: (items: any) => {
                                    if (items.length > 0) {
                                        const day = items[0].raw.x;
                                        return `📅 第${day}天 (${fmtDateAxis(day)})`;
                                    }
                                    return '';
                                },
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
                        y: {
                            position: 'left',
                            grid: { color: '#3f3f46', lineWidth: 0.5 },
                            afterFit: (axis: any) => { axis.width = yAxisWidth; },
                            ticks: {
                                color: '#a1a1aa',
                                precision: 0,
                                callback: (v: number) => Math.abs(v) >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v
                            },
                            afterDataLimits: alignZeroHelper
                        },
                        y1: {
                            position: 'right',
                            grid: { display: false },
                            display: true,
                            afterFit: (axis: any) => { axis.width = 65; },
                            ticks: { color: '#60a5fa', precision: 0, callback: (v: any) => v < 0 ? '' : v.toLocaleString() + '件' },
                            afterDataLimits: alignZeroHelper
                        },
                    },
                },
            });
            (cashChartRef.current.config as any)._customData = { simResult, hiddenEventTypes, setSelectedEvent };
        }
    }, [simResult, state.batches, state.simStart, hiddenChartLines, hiddenEventTypes]);

    // ============ BATCH HANDLERS ============
    const addBatch = () => {
        const last = state.batches[state.batches.length - 1];
        const newId = state.batches.length;
        const leadTime = 15 + state.seaDays;

        let newOffset = 0;
        let targetArrival = leadTime;

        // Smart Logic: Find when the last batch actually runs out
        if (last && simResult && simResult.ganttSell) {
            const lastSellItem = simResult.ganttSell.find((item: any) => item.batchIdx === last.id);
            if (lastSellItem) {
                targetArrival = lastSellItem.x[1];
                newOffset = Math.max(0, Math.floor(targetArrival - leadTime));
            } else {
                // Estimate from previous batch
                const arrivalDate = new Date(state.simStart);
                arrivalDate.setDate(arrivalDate.getDate() + last.offset + leadTime);
                const dailyDemand = state.monthlyDailySales[arrivalDate.getMonth()] || 50;
                const sellDays = dailyDemand > 0 ? Math.ceil(last.qty / dailyDemand) : 30;
                targetArrival = last.offset + leadTime + sellDays;
                newOffset = Math.max(0, targetArrival - leadTime);
            }
        }

        // 计算数量：精确30天的跨月需求
        const getDemandForDay = (dayOffset: number): number => {
            const date = new Date(state.simStart);
            date.setDate(date.getDate() + dayOffset);
            return state.monthlyDailySales[date.getMonth()] || 50;
        };
        let smartQty = 0;
        for (let d = 0; d < 30; d++) {
            smartQty += getDemandForDay(targetArrival + d);
        }

        setState((s) => ({
            ...s,
            batches: [...s.batches, {
                id: newId,
                name: `批次${newId + 1}`,
                type: 'sea',
                qty: Math.round(smartQty),
                offset: newOffset,
                prodDays: 15
            }],
        }));
    };


    const deleteBatch = (id: number) => {
        setState((s) => {
            const remainingBatches = s.batches
                .filter((b) => b.id !== id)
                .map((b, i) => ({ ...b, id: i, name: `批次${i + 1}` }));

            if (remainingBatches.length === 0) {
                return { ...s, batches: [] };
            }

            // 重新计算完美接力
            const { simStart, monthlyDailySales, seaDays } = s;
            const leadTime = 15 + seaDays;

            // 辅助函数：获取某天的日销量
            const getDemandForDay = (dayOffset: number): number => {
                const date = new Date(simStart);
                date.setDate(date.getDate() + dayOffset);
                return monthlyDailySales[date.getMonth()] || 50;
            };

            let currentSaleStart = leadTime;

            remainingBatches.forEach((b, i) => {
                if (i === 0) {
                    b.offset = 0;
                    currentSaleStart = leadTime;
                } else {
                    const calcOffset = currentSaleStart - leadTime;
                    const prevOffset = remainingBatches[i - 1].offset;
                    b.offset = Math.max(0, Math.max(prevOffset, Math.floor(calcOffset)));
                    currentSaleStart = Math.max(currentSaleStart, b.offset + leadTime);
                }

                // 模拟消费，计算卖完日
                let qty = b.qty;
                let day = currentSaleStart;
                while (qty > 0 && day < 1000) {
                    const demand = getDemandForDay(day);
                    const take = Math.min(qty, demand);
                    qty -= take;
                    if (qty > 0) {
                        day++;
                    } else {
                        currentSaleStart = take < demand ? day : day + 1;
                    }
                }
            });

            return { ...s, batches: remainingBatches };
        });
    };

    const updateBatch = (id: number, key: keyof ReplenishmentBatch, value: any) => {
        setState((s) => ({
            ...s,
            batches: s.batches.map((b) => (b.id === id ? { ...b, [key]: value } : b)),
        }));
    };

    // ============ LOGIC: BATCH CASCADE & AUTO ALIGN ============
    // 拖拽/输入Offset时的级联处理
    const handleBatchOffsetChange = (id: number, newOffset: number) => {
        // 1. Basic validation
        if (newOffset < 0) newOffset = 0;

        setState((s) => {
            const newBatches = [...s.batches];
            const targetBatch = newBatches.find(b => b.id === id);
            if (!targetBatch) return s;

            targetBatch.offset = newOffset;

            // ALWAYS Enforce Sequential Constraint (M2 >= M1) regardless of mode
            // Constraint A: Cannot be earlier than previous batch
            if (id > 0) {
                const prevBatch = newBatches.find(b => b.id === id - 1);
                if (prevBatch && targetBatch.offset < prevBatch.offset) {
                    targetBatch.offset = prevBatch.offset;
                }
            }

            // Constraint B: Push subsequent batches if overlap
            // If we move M1 later, M2, M3... must be pushed to at least M1's new position
            let currentOffset = targetBatch.offset;
            for (let i = id + 1; i < newBatches.length; i++) {
                const nextBatch = newBatches[i];
                if (nextBatch.offset < currentOffset) {
                    nextBatch.offset = currentOffset;
                }
                // Update currentOffset for the next iteration to ensure chain reaction
                currentOffset = nextBatch.offset;
            }

            return { ...s, batches: newBatches };
        });
    };

    // 一键完美接力 (Auto Align + Reset)
    const autoAlignBatches = () => {
        setState((s) => {
            const newState = { ...s, isFreeMode: false };
            const { simStart, monthlyDailySales, seaDays } = newState;
            const leadTime = 15 + seaDays; // 生产15天 + 海运

            // 辅助函数：获取某天的日销量
            const getDemandForDay = (dayOffset: number): number => {
                const date = new Date(simStart);
                date.setDate(date.getDate() + dayOffset);
                return monthlyDailySales[date.getMonth()] || 50;
            };

            // 辅助函数：计算从某天开始，给定数量能卖多少天
            const simulateSelling = (startDay: number, qty: number): number => {
                let remainingQty = qty;
                let day = startDay;
                while (remainingQty > 0 && day < 1000) {
                    const dailyDemand = getDemandForDay(day);
                    remainingQty -= dailyDemand;
                    if (remainingQty > 0) {
                        day++;
                    }
                }
                return day + 1; // 返回卖完后的下一天
            };

            // 辅助函数：精确计算30天的跨月需求
            const getMonthlyQty = (startDay: number): number => {
                let qty = 0;
                for (let d = 0; d < 30; d++) {
                    qty += getDemandForDay(startDay + d);
                }
                return qty;
            };

            // 生成6个批次
            const newBatches: ReplenishmentBatch[] = [];
            let currentSaleStart = leadTime; // 首批到货日

            for (let i = 0; i < 6; i++) {
                // 计算这批货的数量（一个月的需求）
                const qty = getMonthlyQty(currentSaleStart);

                // 模拟消费，计算实际卖完日期
                const sellOutDay = simulateSelling(currentSaleStart, qty);

                // 计算下单日期（offset）
                let offset = 0;
                if (i === 0) {
                    offset = 0;
                } else {
                    const calcOffset = currentSaleStart - leadTime;
                    const prevOffset = newBatches[i - 1].offset;
                    offset = Math.max(0, Math.max(prevOffset, Math.floor(calcOffset)));
                }

                newBatches.push({
                    id: i,
                    name: `批次${i + 1}`,
                    type: 'sea',
                    qty: Math.round(qty),
                    offset: offset,
                    prodDays: 15,
                });

                // 下一批从卖完日开始
                currentSaleStart = sellOutDay;
            }

            return { ...newState, batches: newBatches };
        });
    };

    // ============ UI COMPONENTS ============
    const tabs = [
        { key: 'spec', label: '📦 物流/财务', icon: 'package_2' },
        { key: 'pricing', label: '💰 变价/回款', icon: 'attach_money' },
        { key: 'batch', label: '📝 补货批次', icon: 'local_shipping' },
    ] as const;

    const inputClass = 'w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white text-center font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
    const labelClass = 'text-xs text-zinc-500 font-bold uppercase mb-1';
    const cardClass = 'bg-[#0f0f12] border border-[#1e1e24] rounded-xl p-4';

    // ============ RENDER ============
    return (
        <div className="flex h-full bg-[#09090b] text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[420px] flex-shrink-0 border-r border-[#27272a] flex flex-col overflow-hidden">
                {/* Tab 导航 - 卡片式 */}
                <div className="h-14 px-2 border-b border-[#27272a] bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
                    <div className="grid grid-cols-3 gap-1 w-full">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                className={`py-1.5 px-1 text-[10px] font-bold rounded-lg transition-all text-center ${activeTab === t.key
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#18181b] border border-transparent'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-4 flex flex-col min-h-0">
                    {activeTab === 'spec' && (
                        <div className="flex-1 flex flex-col gap-4">
                            {/* 财务核心指标 - Full Width */}
                            {simResult && (
                                <div className="bg-[#0f0f12] border border-[#1e1e24] rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                                            <span className="text-blue-400 text-sm">📊</span>
                                        </div>
                                        <h3 className="text-sm font-bold text-white">财务核心指标</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(() => {
                                            // Calculate New Metrics
                                            const duration = simResult.xMax || 365;
                                            const roi = simResult.minCash !== 0 ? Math.abs(simResult.totalNetProfit / simResult.minCash) : 0;
                                            const annualRoi = (roi / duration) * 365;

                                            // Avg Inventory
                                            const sumInv = simResult.invPoints.reduce((acc, p) => acc + p.y, 0);
                                            const avgInv = duration > 0 ? sumInv / duration : 0;
                                            // Turnover Ratio = Sold Qty / Avg Inv
                                            const invTurnoverRatio = avgInv > 0 ? simResult.totalSoldQty / avgInv : 0;
                                            const turnDays = invTurnoverRatio > 0 ? 365 / invTurnoverRatio : 0;

                                            const metrics = [
                                                { label: '资金最大占用', val: fmtMoney(Math.abs(simResult.minCash)), color: 'text-red-400', sub: '需准备本金' },
                                                { label: 'ROI', val: (roi * 100).toFixed(1) + '%', color: 'text-green-400', sub: '总利润 / 占用' },
                                                { label: '年化回报率', val: (annualRoi * 100).toFixed(1) + '%', color: 'text-orange-400', sub: '年化复利参考' },
                                                { label: '资金周转率', val: (simResult.minCash !== 0 ? (simResult.totalGMV / Math.abs(simResult.minCash)).toFixed(2) : 0), color: 'text-blue-400', sub: 'GMV / 占用' },
                                                { label: '净利率', val: (simResult.totalGMV !== 0 ? (simResult.totalNetProfit / simResult.totalGMV * 100).toFixed(1) : 0) + '%', color: 'text-emerald-400', sub: '总利润 / GMV' },
                                                { label: '库存周转天数', val: turnDays.toFixed(0) + '天', color: 'text-purple-400', sub: '平均售罄周期' }
                                            ];

                                            return metrics.map((item, i) => (
                                                <div key={i}>
                                                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">{item.label}</div>
                                                    <div className="bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2">
                                                        <span className={`text-lg font-black ${item.color} font-mono block truncate`}>{item.val}</span>
                                                    </div>
                                                    <div className="text-[9px] text-zinc-600 mt-1">{item.sub}</div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* 关键时间点 - Full Width */}
                            {simResult && (
                                <div className="bg-[#0f0f12] border border-[#1e1e24] rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center">
                                            <span className="text-amber-400 text-sm">⏳</span>
                                        </div>
                                        <h3 className="text-sm font-bold text-white">关键时间点</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1 truncate" title="回本日期 (CASH > 0)">回本日期</div>
                                            <div className="bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2">
                                                <span className="text-lg font-black text-blue-400 font-mono">{simResult.breakevenDate}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">盈利日期 (PROFIT &gt; 0)</div>
                                            <div className="bg-[#18181b] border border-[#27272a] rounded-md px-3 py-2">
                                                <span className="text-lg font-black text-green-400 font-mono">{simResult.profBeDateStr}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 头程运费 */}
                            <div className="flex-1 bg-[#0f0f12] border border-[#1e1e24] rounded-lg p-4 flex flex-col">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center">
                                        <span className="text-orange-400 text-sm">🚚</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-white">头程运费</h3>
                                </div>
                                <div className="flex-1 grid grid-cols-3 gap-2">
                                    {[
                                        { emoji: '🚢', name: '海运', priceKey: 'seaPriceCbm', daysKey: 'seaDays', channelKey: 'seaChannelId', type: 'sea' as const },
                                        { emoji: '✈️', name: '空派', priceKey: 'airPriceKg', daysKey: 'airDays', channelKey: 'airChannelId', type: 'air' as const },
                                        { emoji: '🚀', name: '快递', priceKey: 'expPriceKg', daysKey: 'expDays', channelKey: 'expChannelId', type: 'exp' as const },
                                    ].map(({ emoji, name, priceKey, daysKey, channelKey, type }) => {
                                        const currentChanId = (state as any)[channelKey];
                                        const channel = channels.find(c => c.id === currentChanId);
                                        const costUSD = logCosts[type] / state.exchRate;

                                        // 判定海运当前模式
                                        const isSea = type === 'sea';
                                        let useKg = !isSea;
                                        if (isSea) {
                                            if (channel) useKg = !!channel.pricePerKg && channel.pricePerKg > 0;
                                            else useKg = state.seaUnit === 'kg';
                                        }

                                        // 决定显示的价格值
                                        let displayPrice = 0;
                                        if (channel) {
                                            displayPrice = useKg ? (channel.pricePerKg || 0) : (channel.pricePerCbm || 0);
                                        } else {
                                            displayPrice = (isSea && useKg) ? state.seaPriceKg : (state as any)[priceKey];
                                        }

                                        return (
                                            <div key={type} className={`rounded-lg border p-3 flex flex-col transition-colors overflow-hidden ${currentChanId ? 'bg-blue-900/10 border-blue-500/30' : 'bg-[#18181b]/30 border-[#27272a]/50'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{emoji}</span>
                                                        <span className="text-sm font-bold text-zinc-300">{name}</span>
                                                    </div>
                                                    {/* 海运手动模式切换单位 */}
                                                    {isSea && !currentChanId && (
                                                        <button
                                                            onClick={() => setState(s => ({ ...s, seaUnit: s.seaUnit === 'cbm' ? 'kg' : 'cbm' }))}
                                                            className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 hover:text-white border border-zinc-700"
                                                        >
                                                            {useKg ? '按KG' : '按CBM'}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* 渠道选择 */}
                                                <select
                                                    value={currentChanId || ''}
                                                    onChange={(e) => {
                                                        const newId = e.target.value;
                                                        const ch = channels.find(c => c.id === newId);
                                                        // 切换渠道时自动更新Days
                                                        const updates: any = { [channelKey]: newId };
                                                        if (ch) updates[daysKey] = ch.deliveryDays;
                                                        setState(s => ({ ...s, ...updates }));
                                                    }}
                                                    className={`w-full bg-[#0a0a0a] border rounded text-xs text-white py-1.5 px-2 mb-3 focus:outline-none focus:border-blue-500 ${!currentChanId ? 'border-red-500/50' : 'border-[#27272a]'}`}
                                                >
                                                    <option value="" disabled>🚫 请选择渠道</option>
                                                    {channels.filter(c => c.type === type && c.status === 'active').map(c => (
                                                        <option key={c.id} value={c.id}>{c.name.slice(0, 8)}</option>
                                                    ))}
                                                </select>

                                                {/* 价格展示 (只读) */}
                                                <div className="text-center mb-2 h-[20px] flex items-center justify-center">
                                                    {channel ? (
                                                        <span className="text-xs text-zinc-400">
                                                            {useKg ? `¥${channel.pricePerKg}/kg` : `¥${channel.pricePerCbm}/m³`}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-zinc-600">-- 未选择 --</span>
                                                    )}
                                                </div>

                                                <div className="text-center flex-1 flex flex-col justify-center border-t border-zinc-800 pt-2">
                                                    <div className="text-base font-black text-emerald-400 font-mono whitespace-nowrap">
                                                        {costUSD > 0 ? `$${costUSD.toFixed(2)}` : '--'}/个
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500 mt-0.5">
                                                        {(state as any)[daysKey]}天到货
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <>


                            {/* 月度日销量设置 */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg">📊</span>
                                    <span className="text-sm font-bold text-zinc-300">月度日销量</span>
                                    <span className="text-xs text-zinc-500">(高亮为批次实际销售月份)</span>
                                </div>
                                <div className="bg-gradient-to-r from-[#1e3a5f] to-[#0d1b2a] rounded-xl p-4 border border-[#2d4a6f]">
                                    <div className="flex justify-between items-end gap-1">
                                        {(() => {
                                            // 使用实际模拟计算销售月份
                                            const leadTime = 15 + state.seaDays;
                                            const activeMonths = new Set<number>();

                                            // 辅助函数
                                            const getDemandForDay = (dayOffset: number): number => {
                                                const date = new Date(state.simStart);
                                                date.setDate(date.getDate() + dayOffset);
                                                return state.monthlyDailySales[date.getMonth()] || 50;
                                            };

                                            const getMonthlyQty = (startDay: number): number => {
                                                let qty = 0;
                                                for (let d = 0; d < 30; d++) qty += getDemandForDay(startDay + d);
                                                return qty;
                                            };

                                            let currentDay = leadTime;
                                            for (let batch = 0; batch < 6; batch++) {
                                                const qty = getMonthlyQty(currentDay);
                                                // 模拟消费，记录覆盖的月份
                                                let remainingQty = qty;
                                                let day = currentDay;
                                                while (remainingQty > 0 && day < 1000) {
                                                    const date = new Date(state.simStart);
                                                    date.setDate(date.getDate() + day);
                                                    activeMonths.add(date.getMonth());
                                                    remainingQty -= getDemandForDay(day);
                                                    if (remainingQty > 0) day++;
                                                }
                                                currentDay = day + 1;
                                            }

                                            return ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'].map((month, i) => {
                                                const isActive = activeMonths.has(i);
                                                return (
                                                    <div key={i} className="flex flex-col items-center flex-1">
                                                        <div className={`text-xs font-bold mb-1 ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                                                            {state.monthlyDailySales[i]}
                                                        </div>
                                                        <div className={`relative h-24 w-full flex justify-center ${isActive ? '' : 'opacity-40'}`}>
                                                            <input
                                                                type="range"
                                                                min={1}
                                                                max={500}
                                                                step={1}
                                                                value={state.monthlyDailySales[i]}
                                                                onChange={(e) => {
                                                                    const newSales = [...state.monthlyDailySales];
                                                                    newSales[i] = parseInt(e.target.value);
                                                                    setState((s) => ({ ...s, monthlyDailySales: newSales }));
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
                                                        <div className={`text-xs mt-1 whitespace-nowrap ${isActive ? 'text-white font-bold' : 'text-zinc-500'}`}>
                                                            {month}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        {(() => {
                                            const leadTime = 15 + state.seaDays;
                                            const activeMonths = new Set<number>();
                                            const getDemandForDay = (dayOffset: number): number => {
                                                const date = new Date(state.simStart);
                                                date.setDate(date.getDate() + dayOffset);
                                                return state.monthlyDailySales[date.getMonth()] || 50;
                                            };
                                            const getMonthlyQty = (startDay: number): number => {
                                                let qty = 0;
                                                for (let d = 0; d < 30; d++) qty += getDemandForDay(startDay + d);
                                                return qty;
                                            };
                                            let currentDay = leadTime;
                                            for (let batch = 0; batch < 6; batch++) {
                                                const qty = getMonthlyQty(currentDay);
                                                let remainingQty = qty;
                                                let day = currentDay;
                                                while (remainingQty > 0 && day < 1000) {
                                                    const date = new Date(state.simStart);
                                                    date.setDate(date.getDate() + day);
                                                    activeMonths.add(date.getMonth());
                                                    remainingQty -= getDemandForDay(day);
                                                    if (remainingQty > 0) day++;
                                                }
                                                currentDay = day + 1;
                                            }
                                            return Array(12).fill(0).map((_, i) => (
                                                <div key={i} className={`h-1 flex-1 rounded-full mx-0.5 ${activeMonths.has(i) ? 'bg-blue-500' : 'bg-[#27272a]'}`}></div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* 批次信息表 */}
                            <h3 className="text-sm font-bold text-zinc-300 border-b border-[#27272a] pb-2 mb-3">批次信息表 (6批次)</h3>
                            <div className="bg-[#18181b] rounded-xl border border-[#27272a]">
                                <table className="w-full text-xs table-fixed">
                                    <thead>
                                        <tr className="bg-[#1f2937] text-zinc-400">
                                            <th className="py-4 px-2 text-left font-bold w-16">批次</th>
                                            {[1, 2, 3, 4, 5, 6].map((m) => (
                                                <th key={m} className="py-4 px-2 text-center font-bold">批次{m}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* 销售时段 */}
                                        <tr className="border-t border-[#27272a]">
                                            <td className="py-4 px-2">
                                                <span className="font-bold text-blue-400">销售时段</span>
                                            </td>
                                            {/* (Removed redundant code) */}
                                            {(() => {
                                                // 预计算所有批次的起止时间
                                                const batchTimes: { start: number; end: number }[] = [];
                                                let lastEndDay = -1;

                                                const getDemandForDay = (dayOffset: number): number => {
                                                    const date = new Date(state.simStart);
                                                    date.setDate(date.getDate() + dayOffset);
                                                    return state.monthlyDailySales[date.getMonth()] || 50;
                                                };

                                                // 按顺序处理每个批次
                                                // 注意：这里假设批次是按时间排序的，或者就是 state.batches 的顺序
                                                // 为了准确，应该按 arrivalTime 排序模拟，但表格是对应 batch id 的。
                                                // 这里简单按 idx 顺序模拟接力。
                                                state.batches.forEach((b) => {
                                                    const logDays = b.type === 'sea' ? state.seaDays : b.type === 'air' ? state.airDays : state.expDays;
                                                    const arrivalDay = b.offset + (b.prodDays || 15) + logDays;

                                                    // 开始时间：如果是第一批，不到货不能卖。
                                                    // 如果是后续批次，最早也要等到货，但如果上一批还没卖完，就接着上一批卖。
                                                    // "接力"意味着我们关注的是这批货**被消费**的时间段。
                                                    let start = arrivalDay;
                                                    if (lastEndDay !== -1) {
                                                        start = Math.max(arrivalDay, lastEndDay + 1);
                                                    }

                                                    // 计算卖多久
                                                    const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
                                                    let remainingQty = finalQty;
                                                    let day = start;
                                                    while (remainingQty > 0 && day < 2000) {
                                                        const demand = getDemandForDay(day);
                                                        remainingQty -= demand;
                                                        if (remainingQty > 0) day++;
                                                    }
                                                    const end = day;

                                                    batchTimes.push({ start, end });
                                                    lastEndDay = end;
                                                });

                                                // 补齐到6列
                                                const cells = [];
                                                for (let i = 0; i < 6; i++) {
                                                    if (i < state.batches.length) {
                                                        const t = batchTimes[i];
                                                        const startDate = new Date(state.simStart);
                                                        startDate.setDate(startDate.getDate() + t.start);
                                                        const endDate = new Date(state.simStart);
                                                        endDate.setDate(endDate.getDate() + t.end);

                                                        const startStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`;
                                                        const endStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`;

                                                        // 检查是否断货（跟上一批不连贯）
                                                        let isGap = false;
                                                        if (i > 0) {
                                                            const prevEnd = batchTimes[i - 1].end;
                                                            if (t.start > prevEnd + 1) isGap = true;
                                                        }

                                                        cells.push(
                                                            <td key={i} className="py-3 px-1 text-center align-top">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className={`text-xs font-bold font-mono ${isGap ? 'text-red-500' : 'text-zinc-300'}`}>
                                                                        {startStr}
                                                                    </div>
                                                                    <div className="h-2 w-[1px] bg-zinc-700 relative">
                                                                        {isGap && (
                                                                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] text-red-500 font-bold whitespace-nowrap bg-[#18181b] px-0.5 z-10">
                                                                                断货
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs font-bold font-mono text-zinc-500">
                                                                        {endStr}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        );
                                                    } else {
                                                        cells.push(<td key={i} className="py-3 px-1"></td>);
                                                    }
                                                }
                                                return cells;
                                            })()}
                                        </tr>
                                        {/* 日销量（从月度设置自动获取） */}
                                        <tr className="border-t border-[#27272a] bg-[#1a1a1d]">
                                            <td className="py-4 px-2">
                                                <span className="font-bold text-orange-400">日销量</span>
                                            </td>
                                            {(() => {
                                                const leadTime = 15 + state.seaDays;
                                                const getDemandForDay = (dayOffset: number): number => {
                                                    const date = new Date(state.simStart);
                                                    date.setDate(date.getDate() + dayOffset);
                                                    return state.monthlyDailySales[date.getMonth()] || 50;
                                                };
                                                const getMonthlyQty = (startDay: number): number => {
                                                    let qty = 0;
                                                    for (let d = 0; d < 30; d++) qty += getDemandForDay(startDay + d);
                                                    return qty;
                                                };
                                                let currentDay = leadTime;
                                                return [0, 1, 2, 3, 4, 5].map((i) => {
                                                    const arrivalDate = new Date(state.simStart);
                                                    arrivalDate.setDate(arrivalDate.getDate() + currentDay);
                                                    const dailySales = state.monthlyDailySales[arrivalDate.getMonth()] || 50;
                                                    const qty = getMonthlyQty(currentDay);
                                                    let remainingQty = qty;
                                                    let day = currentDay;
                                                    while (remainingQty > 0 && day < 1000) {
                                                        remainingQty -= getDemandForDay(day);
                                                        if (remainingQty > 0) day++;
                                                    }
                                                    currentDay = day + 1;
                                                    return (
                                                        <td key={i} className="py-3 px-1 text-center font-bold text-white text-sm">{dailySales}</td>
                                                    );
                                                });
                                            })()}
                                        </tr>
                                        {/* 售价 */}
                                        <tr className="border-t border-[#27272a]">
                                            <td className="py-4 px-2">
                                                <span className="font-bold text-green-400">售价($)</span>
                                            </td>
                                            {state.prices.slice(0, 6).map((v, i) => (
                                                <td key={i} className="py-3 px-1 text-center">
                                                    <NumberStepper
                                                        value={v}
                                                        onChange={(val) => handlePriceChange(i, val)}
                                                        step={0.5}
                                                        min={0}
                                                        max={9999}
                                                        decimals={2}
                                                        readOnly={i === 0 && !!selectedStrategyId}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        {/* 净利% */}
                                        <tr className="border-t border-[#27272a]">
                                            <td className="py-4 px-2">
                                                <span className="font-bold text-zinc-400">净利%</span>
                                            </td>
                                            {state.margins.slice(0, 6).map((v, i) => (
                                                <td key={i} className="py-3 px-1 text-center">
                                                    <NumberStepper
                                                        value={v}
                                                        onChange={() => { }}
                                                        step={1}
                                                        min={-100}
                                                        max={100}
                                                        decimals={1}
                                                        negative={v < 0}
                                                        readOnly={true}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                        {/* 预估回款 = 售价 - 平台费用 */}
                                        <tr className="border-t border-[#27272a] bg-[#1a1a1d]">
                                            <td className="py-4 px-2">
                                                <span className="font-bold text-green-400">预估回款</span>
                                            </td>
                                            {state.prices.slice(0, 6).map((price, i) => {
                                                if (price === 0 || !selectedStrategyId) {
                                                    return (
                                                        <td key={i} className="py-3 px-1 text-center">
                                                            <div className="font-bold text-zinc-500 text-xs">$0.00</div>
                                                            <div className="text-zinc-600 text-[10px]">¥0.0</div>
                                                        </td>
                                                    );
                                                }
                                                const { recallUSD } = computeFeeBreakdown(price, selectedStrategyId);
                                                const recallRMB = recallUSD * state.exchRate;
                                                const isNegative = recallUSD < 0;
                                                return (
                                                    <td key={i} className="py-3 px-1 text-center">
                                                        <div className={`font-bold text-xs ${isNegative ? 'text-red-400' : 'text-green-400'}`}>${recallUSD.toFixed(2)}</div>
                                                        <div className="text-zinc-500 text-[10px]">¥{(recallUSD * state.exchRate).toFixed(1)}</div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 采购账期卡片 */}
                            <div className={cardClass + ' mt-6'}>
                                <h3 className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-amber-400">account_balance</span>
                                    采购账期
                                </h3>
                                <div className="flex gap-8">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-zinc-500 whitespace-nowrap">定金</span>
                                        <NumberStepper
                                            value={Math.round(state.ratioDeposit * 100)}
                                            onChange={(val) => setState(s => ({ ...s, ratioDeposit: val / 100, ratioBalance: (100 - val) / 100 }))}
                                            step={5}
                                            min={0}
                                            max={100}
                                        />
                                        <span className="text-zinc-500">%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-zinc-500 whitespace-nowrap">尾款</span>
                                        <NumberStepper
                                            value={Math.round(state.ratioBalance * 100)}
                                            onChange={(val) => setState(s => ({ ...s, ratioBalance: val / 100, ratioDeposit: (100 - val) / 100 }))}
                                            step={5}
                                            min={0}
                                            max={100}
                                        />
                                        <span className="text-zinc-500">%</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'batch' && (
                        <div className="flex flex-col h-full">

                            <div className="flex items-center justify-between mb-2 mt-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">补货批次列表</h3>
                                    <button
                                        onClick={autoAlignBatches}
                                        className="group relative h-5 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded text-[10px] font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 border border-blue-400/20 text-white flex items-center gap-1 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-sm"></div>
                                        <span className="relative z-10 transition-transform group-hover:scale-110">⚡</span>
                                        <span className="relative z-10">完美接力</span>
                                    </button>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setState(s => ({ ...s, batches: s.batches.length > 1 ? s.batches.slice(0, -1) : s.batches }))}
                                        disabled={state.batches.length <= 1}
                                        className="w-6 h-6 bg-[#27272a] hover:bg-zinc-600 disabled:opacity-30 disabled:hover:bg-[#27272a] rounded flex items-center justify-center text-sm text-white font-bold transition-all"
                                    >
                                        -
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (state.batches.length >= 6) return;
                                            addBatch();
                                        }}
                                        disabled={state.batches.length >= 6}
                                        className="w-6 h-6 bg-[#27272a] hover:bg-zinc-600 disabled:opacity-30 disabled:hover:bg-[#27272a] rounded flex items-center justify-center text-sm text-white font-bold transition-all"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Batch Cards - Fixed Grid Stacking */}
                            <div className="grid grid-rows-6 gap-1 h-full pb-1">
                                {state.batches.map((b, idx) => {
                                    const typeLabel = b.type === 'sea' ? '海运' : b.type === 'air' ? '空派' : '快递';
                                    const freightCost = b.type === 'sea' ? logCosts.sea : b.type === 'air' ? logCosts.air : logCosts.exp;
                                    const orderDate = fmtDate(new Date(new Date(state.simStart).getTime() + b.offset * 86400000));
                                    const shipDate = fmtDate(new Date(new Date(state.simStart).getTime() + (b.offset + state.prodDays) * 86400000));

                                    return (
                                        <div
                                            key={b.id}
                                            className="bg-[#0c0c0e] border border-[#27272a] rounded-lg overflow-hidden flex flex-col shadow-sm min-h-0"
                                        >
                                            {/* Header */}
                                            {/* Header */}
                                            <div className="px-2 py-1.5 flex items-center justify-between border-b border-[#27272a] bg-[#18181b] shrink-0">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-xs font-bold text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded bg-orange-500/10">批次{idx + 1}</span>

                                                    {/* Extra Percent - Clean Look */}
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-zinc-500 font-medium">额外补货</span>
                                                        <div className="relative w-9">
                                                            <NumberStepper
                                                                value={b.extraPercent ?? 0}
                                                                onChange={(v) => updateBatch(b.id, 'extraPercent', v)}
                                                                className="w-full text-[10px] py-0 bg-transparent border-none text-right pr-2.5 focus:ring-0 leading-tight font-bold text-zinc-300"
                                                                min={0}
                                                                max={100}
                                                                step={5}
                                                            />
                                                            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-green-500 font-bold pointer-events-none">%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className="text-[10px] text-zinc-500 font-medium">{typeLabel} <span className="text-zinc-300 font-bold ml-1">${(freightCost / state.exchRate).toFixed(2)}</span></span>
                                            </div>

                                            {/* Body */}
                                            <div className="p-1.5 flex flex-col justify-center flex-1 gap-1 min-h-0">
                                                <div className="grid grid-cols-[36px_1fr_1.3fr_1fr] gap-1 items-center shrink-0">
                                                    <select value={b.type} onChange={(e) => updateBatch(b.id, 'type', e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded h-[22px] text-[10px] text-white font-bold cursor-pointer hover:border-zinc-500 transition-colors text-center w-full appearance-none leading-none">
                                                        <option value="sea">🚢</option>
                                                        <option value="air">✈️</option>
                                                        <option value="exp">🚀</option>
                                                    </select>
                                                    <div className="relative">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold z-10 pointer-events-none scale-90">生产</span>
                                                        <NumberStepper value={b.prodDays ?? 15} onChange={(v) => updateBatch(b.id, 'prodDays', v)} className="w-full h-[22px] bg-zinc-900 border border-zinc-700 rounded text-[10px] pl-7 text-white focus:border-blue-500/50 transition-colors leading-none" />
                                                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-600 pointer-events-none scale-90">天</span>
                                                    </div>
                                                    <div className="relative">
                                                        <NumberStepper value={b.qty} onChange={(v) => updateBatch(b.id, 'qty', v)} className="w-full h-[22px] bg-zinc-900 border border-zinc-700 rounded text-[10px] font-bold text-center text-white focus:border-blue-500/50 transition-colors leading-none" />
                                                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-600 pointer-events-none scale-90">pcs</span>
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold z-10 pointer-events-none scale-90">T+</span>
                                                        <NumberStepper value={b.offset} onChange={(v) => handleBatchOffsetChange(b.id, v)} className="w-full h-[22px] bg-zinc-900 border border-zinc-700 rounded text-[10px] pl-5 text-white focus:border-blue-500/50 transition-colors leading-none" />
                                                    </div>
                                                </div>

                                                {/* Slider Area - Compact */}
                                                <div className="px-1 py-1 flex items-end gap-2 mt-0.5 shrink-0 overflow-hidden">
                                                    {/* Order Info (Left) */}
                                                    <div className="flex flex-col items-start min-w-[28px]">
                                                        <span className="text-[10px] text-zinc-500 font-bold leading-none mb-1">下单</span>
                                                        <span className="text-xs text-blue-400 font-black leading-none tracking-tight">{orderDate}</span>
                                                    </div>

                                                    {/* Slider (Middle) */}
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={300}
                                                        value={b.offset}
                                                        onChange={(e) => handleBatchOffsetChange(b.id, parseInt(e.target.value))}
                                                        className="flex-1 accent-blue-500 h-1 cursor-pointer min-w-0 mb-1.5"
                                                    />

                                                    {/* Ship Info (Right) */}
                                                    <div className="flex flex-col items-end min-w-[28px]">
                                                        <span className="text-[10px] text-zinc-500 font-bold leading-none mb-1">发货</span>
                                                        <span className="text-xs text-orange-400 font-black leading-none tracking-tight">{shipDate}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* KPI Bar with Product Selector */}
                <div className="h-14 px-6 flex items-center gap-4 border-b border-[#27272a] bg-[#0a0a0a] flex-shrink-0 overflow-hidden">
                    {/* KPI Metrics */}
                    <div className="w-28 shrink-0">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">资金最大占用</div>
                        <div className="text-base font-black text-red-400">{simResult ? fmtMoney(Math.abs(simResult.minCash)) : '$0'}</div>
                    </div>
                    <div className="w-28 shrink-0">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">累计净利润</div>
                        <div className="text-base font-black text-green-400">{simResult ? fmtMoney(simResult.totalNetProfit) : '$0'}</div>
                    </div>
                    <div className="w-20 shrink-0">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold whitespace-nowrap">回本日期</div>
                        <div className="text-base font-black text-blue-400">{simResult?.breakevenDate || '--'}</div>
                    </div>

                    {/* Spacer to push rest to right */}
                    <div className="flex-1 min-w-0"></div>

                    {/* 产品选择器 */}
                    <div className="relative shrink-0">
                        <select
                            value={selectedProductId || ''}
                            onChange={(e) => handleProductSelect(e.target.value)}
                            className="appearance-none bg-[#18181b] hover:bg-[#1f1f23] border border-[#27272a] hover:border-zinc-600 text-zinc-300 text-xs font-bold py-2 pl-3 pr-8 rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-[140px]"
                        >
                            <option value="">📦 选择产品</option>
                            {products.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.sku || 'SKU'})</option>))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <span className="material-symbols-outlined text-zinc-500 text-[16px]">expand_more</span>
                        </div>
                    </div>

                    {/* 策略选择器 */}
                    <div className="relative shrink-0">
                        <select
                            value={selectedStrategyId}
                            onChange={(e) => handleStrategySelect(e.target.value)}
                            disabled={strategies.length === 0}
                            className={`appearance-none border text-xs font-bold py-2 pl-3 pr-8 rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-[180px] ${strategies.length > 0
                                ? 'bg-amber-900/30 hover:bg-amber-900/50 border-amber-500/30 hover:border-amber-500/50 text-amber-100'
                                : 'bg-[#18181b] border-[#27272a] text-zinc-500 cursor-not-allowed'
                                }`}
                        >
                            <option value="">⚡ {strategies.length > 0 ? '选择策略' : '无策略'}</option>
                            {strategies.map(s => {
                                const marginPct = (s.results?.planB?.margin ?? 0) * 100;
                                return (
                                    <option key={s.id} value={s.id}>
                                        ${s.inputs.actualPrice} - {marginPct.toFixed(0)}% ({s.label || '无标签'})
                                    </option>
                                );
                            })}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <span className={`material-symbols-outlined text-[16px] ${strategies.length > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>expand_more</span>
                        </div>
                    </div>


                    {/* 推演起始日期 */}
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-zinc-500 text-xs font-bold hidden xl:block whitespace-nowrap">推演起始日期</span>
                        <input
                            type="date"
                            value={state.simStart}
                            onChange={(e) => setState((s) => ({ ...s, simStart: e.target.value }))}
                            className="bg-[#18181b] hover:bg-[#1f1f23] border border-[#27272a] hover:border-zinc-600 text-zinc-300 text-xs font-bold py-1.5 px-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono w-[130px]"
                        />
                    </div>
                </div>

                {/* Charts - Shared X-axis layout */}
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Floating Stockout Summary */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-full px-4 py-1 shadow-xl flex items-center gap-2 pointer-events-none">
                        {simResult && simResult.totalStockoutDays > 0 ? (
                            <>
                                <span className="material-symbols-outlined text-red-500 text-sm">warning</span>
                                <span className="text-xs font-bold text-red-400">总体断货: {Math.round(simResult.totalStockoutDays)}天</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                                <span className="text-xs font-bold text-green-400">完美的接力!</span>
                            </>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden" onClick={() => setSelectedEvent(null)}>
                        <div className="h-1/2 pl-1 pr-4 pt-4 pb-0 overflow-hidden">
                            <canvas ref={ganttCanvasRef} />
                        </div>
                        <div className="h-1/2 pl-1 pr-4 pt-0 pb-4 overflow-hidden relative">
                            <canvas ref={cashCanvasRef} />
                            {/* 资金事件时间轴 - 现金流图顶部显示 */}
                            {/* 资金事件时间轴 - 已移至自定义插件绘制 */}
                            {/* 事件详情弹窗 - 竖向布局 */}
                            {selectedEvent && (
                                <div
                                    className="fixed z-50 bg-zinc-900/95 border border-zinc-600 rounded shadow-xl px-2.5 py-2 pointer-events-auto backdrop-blur-sm min-w-[80px]"
                                    style={{
                                        left: selectedEvent.x,
                                        top: selectedEvent.y + 8,
                                        transform: 'translateX(-50%)'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex flex-col gap-0.5 text-[11px]">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-amber-400">批次{selectedEvent.event.batchIdx + 1}</span>
                                            <button className="text-zinc-500 hover:text-white text-[10px]" onClick={() => setSelectedEvent(null)}>✕</button>
                                        </div>
                                        <span className="text-zinc-400">
                                            {selectedEvent.event.type === 'deposit' && '定金'}
                                            {selectedEvent.event.type === 'balance' && '尾款'}
                                            {selectedEvent.event.type === 'freight' && '运费'}
                                            {selectedEvent.event.type === 'recall' && '回款'}
                                        </span>
                                        <span className="font-bold text-white text-sm">{selectedEvent.event.amount < 0 ? '-' : ''}${Math.abs(Math.round(selectedEvent.event.amount)).toLocaleString()}</span>
                                        <span className="text-zinc-500">{selectedEvent.event.label.split(' ')[1]}</span>
                                    </div>
                                </div>
                            )}
                            {/* 图例 - 可点击切换显示/隐藏 */}
                            {/* 统一图例 - 底部居中悬浮 */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[9px] pointer-events-auto bg-zinc-900/90 px-3 py-1 rounded-full border border-zinc-800 shadow-lg backdrop-blur-sm z-10">
                                {/* 事件类型 */}
                                <div className="flex items-center gap-3 border-r border-zinc-700 pr-3">
                                    <span
                                        className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${hiddenEventTypes.has('deposit') ? 'opacity-40 line-through' : 'text-zinc-300'}`}
                                        onClick={() => setHiddenEventTypes(prev => { const n = new Set(prev); n.has('deposit') ? n.delete('deposit') : n.add('deposit'); return n; })}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>定金
                                    </span>
                                    <span
                                        className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${hiddenEventTypes.has('balance') ? 'opacity-40 line-through' : 'text-zinc-300'}`}
                                        onClick={() => setHiddenEventTypes(prev => { const n = new Set(prev); n.has('balance') ? n.delete('balance') : n.add('balance'); return n; })}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>尾款
                                    </span>
                                    <span
                                        className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${hiddenEventTypes.has('freight') ? 'opacity-40 line-through' : 'text-zinc-300'}`}
                                        onClick={() => setHiddenEventTypes(prev => { const n = new Set(prev); n.has('freight') ? n.delete('freight') : n.add('freight'); return n; })}
                                    >
                                        <span className="text-amber-400 text-[10px]">▲</span>运费
                                    </span>
                                    <span
                                        className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${hiddenEventTypes.has('recall') ? 'opacity-40 line-through' : 'text-zinc-300'}`}
                                        onClick={() => setHiddenEventTypes(prev => { const n = new Set(prev); n.has('recall') ? n.delete('recall') : n.add('recall'); return n; })}
                                    >
                                        <span className="text-green-400 text-[10px]">★</span>回款
                                    </span>
                                </div>
                                {/* 图表线条 */}
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${hiddenChartLines.has('cash') ? 'opacity-40 line-through' : 'text-zinc-300'}`}
                                        onClick={() => setHiddenChartLines(prev => { const n = new Set(prev); n.has('cash') ? n.delete('cash') : n.add('cash'); return n; })}
                                    >
                                        <span className="w-3 h-0.5 bg-red-400"></span>资金
                                    </span>
                                    <span
                                        className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${hiddenChartLines.has('profit') ? 'opacity-40 line-through' : 'text-zinc-300'}`}
                                        onClick={() => setHiddenChartLines(prev => { const n = new Set(prev); n.has('profit') ? n.delete('profit') : n.add('profit'); return n; })}
                                    >
                                        <span className="w-3 h-0.5 bg-green-400" style={{ borderTop: '1px dashed #67c23a' }}></span>利润
                                    </span>
                                    <span
                                        className={`flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${hiddenChartLines.has('inventory') ? 'opacity-40 line-through' : 'text-zinc-300'}`}
                                        onClick={() => setHiddenChartLines(prev => { const n = new Set(prev); n.has('inventory') ? n.delete('inventory') : n.add('inventory'); return n; })}
                                    >
                                        <span className="w-3 h-2 bg-blue-400/40 border border-blue-400"></span>库存
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReplenishmentAdvice;
