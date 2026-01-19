import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runSimulation, fmtDate } from './ReplenishmentEngine';
import { ModuleState, SimulationResult, FinancialEvent, LogisticsCosts } from './ReplenishmentTypes';
import { ProfitModelService } from '../services/profitModelService';
// import { useProducts } from '../contexts/ProductContext';
import { useCombinedProducts } from '../hooks/useCombinedProducts';
import { useLogistics } from '../contexts/LogisticsContext';
import { useExchangeRateValue } from '../contexts/ExchangeRateContext';

import { STORAGE_KEYS } from '../repositories';
import { ReplenishmentBatch, SavedProfitModel, SavedReplenishmentPlan, ReplenishmentPlanSummary } from '../types';
import { replenishmentPlanRepository, ReplenishmentPlanRepository } from '../repositories/ReplenishmentPlanRepository';

import NumberStepper from '../components/NumberStepper';



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
import { fmtMoney } from '../utils/formatters';


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
    safetyDays: 7, // 默认安全天数
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
    exchRate: 7.2, // Will be overridden by Context in component
    ratioDeposit: 0.3,
    ratioBalance: 0.7,
    prodDays: 15,
    batches: [],
    isFreeMode: false,
});

// ============ PURE HELPER: COMPUTE SMART BATCHES ============
const computeSmartBatches = (
    simStart: string,
    monthlyDailySales: number[],
    leadTime: number,
    safeBuffer: number
): ReplenishmentBatch[] => {
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
        // Limit simulation to avoid infinite loops, but enough to cover normal cycles
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
    let nextCoverageStart = leadTime; // 真正的下一阶段需求开始日（上一批卖完日）

    for (let i = 0; i < 6; i++) {
        // 1. 计算这批货的数量
        const qty = getMonthlyQty(nextCoverageStart);

        // 2. 模拟消费
        const sellOutDay = simulateSelling(nextCoverageStart, qty);

        // 3. 计算期望到货日
        const targetArrival = Math.max(leadTime, nextCoverageStart - safeBuffer);

        // 4. 计算 Offset
        let offset = 0;
        if (i === 0) {
            offset = 0;
        } else {
            const calcOffset = targetArrival - leadTime;
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

        nextCoverageStart = sellOutDay;
    }

    return newBatches;
};

// ============ COMPONENT ============
const STORAGE_KEY = STORAGE_KEYS.REPLENISHMENT_STATE;

const ReplenishmentAdvice: React.FC = () => {
    // ... (Existing state hooks) ...

    // [We need to preserve the lines between component start and handleStrategySelect safely.
    // However, the tool replaces CONTIGUOUS blocks.
    // I will split this into MULTIPLE steps or use the "top of file" / "specific function" targeting more carefully.
    // The user asked to "replace file content". 
    // I will target handleStrategySelect first, and then autoAlignBatches. 
    // AND I need to insert the function definition.
    // The pure function can go BEFORE the component.]

    // Wait, I can't effectively inject code *outside* the component easily without matching a large chunk.
    // I will insert `computeSmartBatches` before `const ReplenishmentAdvice`.
    // Then I will replace `handleStrategySelect`.
    // Then I will replace `autoAlignBatches`.
    // This requires multiple calls or precise targeting.]

    // Let's use `replace_file_content` to insert the helper function before the component definition.

    // ============ STATE ============
    // 当前选中的产品ID
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [strategies, setStrategies] = useState<SavedProfitModel[]>([]);
    const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
    // const { products } = useProducts();
    const products = useCombinedProducts();
    const { channels } = useLogistics();
    const contextExchRate = useExchangeRateValue();



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
            safetyDays: 7,
        };
    };

    const [state, setState] = useState<ModuleState>(getInitialState);
    const lastSavedState = useRef<string>("");
    // Track the source strategy ID of the current data state to prevent cross-saving
    const lastLoadedStrategyId = useRef<string | null>(null);

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
                        lastLoadedStrategyId.current = parsed.selectedStrategyId;
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to restore selection state:', e);
        }
    }, []);

    // Sync exchange rate from Context to local state
    useEffect(() => {
        if (contextExchRate && contextExchRate !== state.exchRate) {
            setState(s => ({ ...s, exchRate: contextExchRate }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextExchRate]);

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
        lastSavedState.current = ""; // Reset baseline state

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
                // 填充规格 (优先使用整箱规格)
                boxL: product.boxLength || prev.boxL,
                boxW: product.boxWidth || prev.boxW,
                boxH: product.boxHeight || prev.boxH,
                boxWgt: product.boxWeight || (product.weight * (product.pcsPerBox || 1)) || prev.boxWgt,
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
        lastLoadedStrategyId.current = sid; // Data is now derived from this strategy
        if (!sid) return;

        const strategy = strategies.find(s => s.id === sid);
        if (strategy) {
            // 使用 Plan B (实际定价) 或 Plan A (目标定价)
            const targetData = strategy.results.planB.price > 0 ? strategy.results.planB : strategy.results.planA;

            // 所有月份填充相同的售价和净利润%
            const marginPct = targetData.margin * 100; // 转换为百分比

            setState(prev => {
                // 1. Prepare Data for Smart Generation
                const finalSales = strategy.replenishment?.monthlyDailySales || [50, 55, 60, 55, 50, 45, 40, 40, 50, 60, 80, 100];
                const finalSeaChannelId = strategy.replenishment?.seaChannelId || prev.seaChannelId;

                // Try to get accurate sea days from channel if available
                const seaChan = channels.find(c => c.id === finalSeaChannelId);
                const finalSeaDays = seaChan ? seaChan.deliveryDays : prev.seaDays;

                // 2. Determine Batches:
                // Logic:
                // A. If saved batches exist AND they are NOT the "Lazy Default" (legacy 2-batch placeholder), use them.
                // B. If no batches or they look like legacy defaults, generate Smart Batches.

                let finalBatches = strategy.replenishment?.batches;
                let useSmartDefault = false;

                if (!finalBatches || finalBatches.length === 0) {
                    useSmartDefault = true;
                } else if (finalBatches.length === 2 && finalBatches[0].qty === 1000 && finalBatches[1].qty === 1000 && finalBatches[0].offset === 0 && finalBatches[1].offset === 30) {
                    // DETECT LEGACY DEFAULT: If it looks exactly like the old hardcoded default, ignore it and upgrade to smart batches.
                    // (Old Default: 2 batches, 1000 qty each, offset 0/30)
                    useSmartDefault = true;
                }

                if (useSmartDefault) {
                    finalBatches = computeSmartBatches(
                        prev.simStart,
                        finalSales,
                        (prev.prodDays || 15) + finalSeaDays,
                        prev.safetyDays || 7
                    );
                }

                return {
                    ...prev,
                    prices: Array(12).fill(targetData.price),
                    margins: Array(12).fill(parseFloat(marginPct.toFixed(1))),
                    // 保存回款计算所需的值
                    unitCost: strategy.results.costProdUSD > 0 ? strategy.results.costProdUSD : prev.unitCost,
                    sellCost: targetData.sellCost || 0, // 总成本(无广)
                    shippingUSD: strategy.inputs.shippingUSD || 0, // 头程USD
                    profitUSD: targetData.profit || 0, // 净利润USD
                    exchRate: strategy.inputs.exchangeRate || prev.exchRate, // 使用策略的汇率

                    // Replenishment Data
                    batches: finalBatches!, // finalBatches is assigned above
                    monthlyDailySales: finalSales,
                    // Also sync logistics IDs if present
                    seaChannelId: finalSeaChannelId,
                    airChannelId: strategy.replenishment?.airChannelId || prev.airChannelId,
                    expChannelId: strategy.replenishment?.expChannelId || prev.expChannelId,
                };
            });
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

    // ============ SYNC TO STRATEGY HANDLER ============
    // ============ SYNC TO STRATEGY HANDLER ============
    const handleSyncToStrategy = useCallback(() => {
        if (!selectedProductId || !selectedStrategyId || !simResult) return;

        const currentStrategy = strategies.find(s => s.id === selectedStrategyId);
        if (!currentStrategy) return;

        // 计算财务核心指标（与面板显示一致）
        const duration = simResult.xMax || 365;
        const roi = simResult.minCash !== 0 ? Math.abs(simResult.totalNetProfit / simResult.minCash) : 0;
        const annualRoi = (roi / duration) * 365;

        // 库存周转天数
        const sumInv = simResult.invPoints.reduce((acc, p) => acc + p.y, 0);
        const avgInv = duration > 0 ? sumInv / duration : 0;
        const invTurnoverRatio = avgInv > 0 ? simResult.totalSoldQty / avgInv : 0;
        const turnoverDays = invTurnoverRatio > 0 ? duration / invTurnoverRatio : 0;

        // 资金周转率 & 净利率
        const fundTurnoverRatio = simResult.minCash !== 0 ? (simResult.totalGMV / Math.abs(simResult.minCash)) : 0;
        const netMargin = simResult.totalGMV !== 0 ? (simResult.totalNetProfit / simResult.totalGMV) : 0;

        const summary = {
            totalQty: state.batches.reduce((acc, b) => acc + Math.round(b.qty * (1 + (b.extraPercent || 0) / 100)), 0),
            totalCost: Math.abs(simResult.minCash),
            breakevenDate: simResult.breakevenDate,
            stockoutDays: simResult.totalStockoutDays,
            minCash: simResult.minCash,
            finalCash: simResult.finalCash,
            // 财务核心指标
            roi,
            annualRoi,
            turnoverRatio: fundTurnoverRatio,
            netMargin,
            turnoverDays: Math.round(turnoverDays),
            profitDate: simResult.profBeDateStr,
        };

        const currentStateSnapshot = {
            batches: state.batches,
            monthlyDailySales: state.monthlyDailySales,
            simStart: state.simStart,
            prices: state.prices,
            margins: state.margins,
            seaChannelId: state.seaChannelId,
            airChannelId: state.airChannelId,
            expChannelId: state.expChannelId,
        };





        // Strict ID Validation: Check if the current data source ID matches the selected target ID
        // This prevents saving data Loaded from Strategy A into Strategy B
        if (lastLoadedStrategyId.current && lastLoadedStrategyId.current !== selectedStrategyId) {
            // Find labels for clearer error message
            const originStrategy = strategies.find(s => s.id === lastLoadedStrategyId.current);
            const targetStrategy = strategies.find(s => s.id === selectedStrategyId);

            alert(`【策略匹配错误】\n\n当前补货数据的源头是策略: "${originStrategy?.label || '未知'}"\n但您正尝试保存到: "${targetStrategy?.label || '未知'}"\n\n请切换回正确的策略，或重新加载目标策略的数据。`);
            return;
        }

        const currentStateStr = JSON.stringify(currentStateSnapshot);

        // 1. Sync to Profit Model (Strategy)
        const updates: Partial<SavedProfitModel> = {
            replenishment: {
                batches: [...state.batches],
                summary,
                simStart: state.simStart,
                monthlyDailySales: [...state.monthlyDailySales],
                seaChannelId: state.seaChannelId,
                airChannelId: state.airChannelId,
                expChannelId: state.expChannelId,
                lastUpdated: Date.now()
            }
        };
        ProfitModelService.update(selectedStrategyId, updates);

        // 2. Feedback only (No auto-snapshot)
        const feedbackMsg = "策略已同步";

        // Update reference to avoid repeated saves if we switch logic later
        lastSavedState.current = currentStateStr;

        // Visual feedback
        const btn = document.getElementById('btn-sync-strategy');
        if (btn) {
            const originalHTML = btn.innerHTML;
            const originalClass = btn.className;
            btn.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span> ${feedbackMsg}`;
            btn.className = "flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shrink-0 whitespace-nowrap";

            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.className = originalClass;
            }, 2500);
        }
    }, [selectedProductId, selectedStrategyId, simResult, state, strategies, products]);


    // ============ SAVE AS NEW PLAN HANDLER ============
    const handleSaveAsNewPlan = useCallback(() => {
        if (!selectedProductId || !selectedStrategyId || !simResult) return;

        // 获取当前策略以便保存快照信息
        const currentStrategy = strategies.find(s => s.id === selectedStrategyId);

        const planName = prompt("请输入新方案名称", `方案 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
        if (!planName) return;

        // 计算财务核心指标（逻辑与 handleSyncToStrategy 复用）
        const duration = simResult.xMax || 365;
        const roi = simResult.minCash !== 0 ? Math.abs(simResult.totalNetProfit / simResult.minCash) : 0;
        const annualRoi = (roi / duration) * 365;

        const sumInv = simResult.invPoints.reduce((acc, p) => acc + p.y, 0);
        const avgInv = duration > 0 ? sumInv / duration : 0;
        const invTurnoverRatio = avgInv > 0 ? simResult.totalSoldQty / avgInv : 0;
        const turnoverDays = invTurnoverRatio > 0 ? duration / invTurnoverRatio : 0;

        const fundTurnoverRatio = simResult.minCash !== 0 ? (simResult.totalGMV / Math.abs(simResult.minCash)) : 0;
        const netMargin = simResult.totalGMV !== 0 ? (simResult.totalNetProfit / simResult.totalGMV) : 0;

        const summary: ReplenishmentPlanSummary = {
            totalQty: state.batches.reduce((acc, b) => acc + Math.round(b.qty * (1 + (b.extraPercent || 0) / 100)), 0),
            totalCost: Math.abs(simResult.minCash),
            breakevenDate: simResult.breakevenDate,
            stockoutDays: simResult.totalStockoutDays,
            minCash: simResult.minCash,
            finalCash: simResult.finalCash,
            roi,
            annualRoi,
            turnoverRatio: fundTurnoverRatio,
            netMargin,
            turnoverDays: Math.round(turnoverDays),
            profitDate: simResult.profBeDateStr,
        };

        const newPlan: SavedReplenishmentPlan = {
            id: ReplenishmentPlanRepository.generateId(),
            productId: selectedProductId,
            productName: currentStrategy?.productName || '未命名产品',
            strategyId: selectedStrategyId,
            strategyLabel: currentStrategy?.label,
            name: planName,

            // 核心数据 (扁平结构)
            batches: [...state.batches],
            monthlyDailySales: [...state.monthlyDailySales],
            prices: [...state.prices],
            margins: [...state.margins],
            simStart: state.simStart,

            // 物流配置
            seaChannelId: state.seaChannelId,
            airChannelId: state.airChannelId,
            expChannelId: state.expChannelId,

            summary,

            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        replenishmentPlanRepository.save(newPlan);
        alert("新方案已保存，可在'补货方案对比'中查看");
    }, [selectedProductId, selectedStrategyId, simResult, state, strategies]);

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

            chart.data.datasets[0].data = simResult.ganttProd as any;
            chart.data.datasets[1].data = simResult.ganttShip as any;
            chart.data.datasets[2].data = simResult.ganttHold as any;
            chart.data.datasets[3].data = simResult.ganttSell as any;
            chart.data.datasets[4].data = simResult.ganttStockout as any;

            if (chart.options.scales?.x) {
                chart.options.scales.x = { ...commonXScale, position: 'bottom', grid: { color: '#3f3f46', lineWidth: 1 } };
            }

            // Fix Stale Closure for Tooltip
            if (chart.options.plugins?.tooltip) {
                chart.options.plugins.tooltip.callbacks = {
                    title: (items: any) => {
                        if (items.length > 0) {
                            const batchIdx = items[0].raw?.batchIdx;
                            if (batchIdx !== undefined) {
                                const b = state.batches[batchIdx];
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
                };
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
                                            const b = state.batches[batchIdx];
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


        // Calculate Safety Stock Points
        // 安全库存 = 未来N天的实际销量总和（适合安全接力场景）
        const safetyDays = state.safetyDays || 7;
        const getDailyDemand = (dayOffset: number): number => {
            const date = new Date(state.simStart);
            date.setDate(date.getDate() + dayOffset);
            return state.monthlyDailySales[date.getMonth()] || 50;
        };
        const safetyPoints = simResult.invPoints.map(p => {
            let safetyStock = 0;
            for (let i = 0; i < safetyDays; i++) {
                safetyStock += getDailyDemand(p.x + 1 + i);
            }
            return { x: p.x, y: safetyStock };
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

            // Fix Stale Closure for Tooltip
            if (chart.options.plugins?.tooltip) {
                chart.options.plugins.tooltip.callbacks = {
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
                };
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
                            ticks: { color: '#fff', font: { weight: 'bold' as const, size: 11 }, stepSize: 14, callback: (v: any) => Math.abs(Number(v)) >= 1000 ? '$' + (Number(v) / 1000).toFixed(0) + 'k' : '$' + v },
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
            const { simStart, monthlyDailySales, seaDays, safetyDays } = newState;
            const safeBuffer = safetyDays || 7;
            const leadTime = 15 + seaDays; // 生产15天 + 海运

            const newBatches = computeSmartBatches(simStart, monthlyDailySales, leadTime, safeBuffer);

            return { ...newState, batches: newBatches };
        });
    };

    // ============ UI COMPONENTS ============
    const tabs = [
        { key: 'spec', label: '📦 物流/财务', icon: 'package_2' },
        { key: 'pricing', label: '💰 销量估算', icon: 'attach_money' },
        { key: 'batch', label: '📝 补货批次', icon: 'local_shipping' },
    ] as const;


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
                                className={`py-1.5 px-1 text-sm font-bold rounded-lg transition-all text-center ${activeTab === t.key
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
                        <div className="flex-1 flex flex-col gap-5 overflow-y-auto">

                            {/* ========== 财务核心指标区域 ========== */}
                            {simResult && (
                                <div className="bg-gradient-to-b from-[#0f0f14] to-[#0a0a0e] border border-[#1e1e28] rounded-2xl p-4">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600/30 to-indigo-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                                            <span className="text-lg">📊</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white tracking-wide">财务核心指标</h3>
                                            <p className="text-[10px] text-zinc-500 font-medium">Financial KPIs</p>
                                        </div>
                                    </div>

                                    {/* Metrics Grid - 3x2 Premium Cards */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {(() => {
                                            const duration = simResult.xMax || 365;
                                            const roi = simResult.minCash !== 0 ? Math.abs(simResult.totalNetProfit / simResult.minCash) : 0;
                                            const annualRoi = (roi / duration) * 365;
                                            const sumInv = simResult.invPoints.reduce((acc, p) => acc + p.y, 0);
                                            const avgInv = duration > 0 ? sumInv / duration : 0;
                                            const invTurnoverRatio = avgInv > 0 ? simResult.totalSoldQty / avgInv : 0;
                                            const turnDays = invTurnoverRatio > 0 ? duration / invTurnoverRatio : 0;

                                            const metrics = [
                                                {
                                                    label: '资金最大占用',
                                                    val: fmtMoney(Math.abs(simResult.minCash)),
                                                    color: 'from-red-500 to-orange-500',
                                                    textColor: 'text-red-400',
                                                    borderColor: 'border-red-500/20',
                                                    bgColor: 'bg-red-500/5',
                                                    sub: '需准备本金',
                                                    icon: '💰'
                                                },
                                                {
                                                    label: 'ROI',
                                                    val: (roi * 100).toFixed(1) + '%',
                                                    color: 'from-green-500 to-emerald-500',
                                                    textColor: 'text-green-400',
                                                    borderColor: 'border-green-500/20',
                                                    bgColor: 'bg-green-500/5',
                                                    sub: '总利润 / 占用',
                                                    icon: '📈'
                                                },
                                                {
                                                    label: '年化回报率',
                                                    val: (annualRoi * 100).toFixed(1) + '%',
                                                    color: 'from-orange-500 to-amber-500',
                                                    textColor: 'text-orange-400',
                                                    borderColor: 'border-orange-500/20',
                                                    bgColor: 'bg-orange-500/5',
                                                    sub: '年化回报参考',
                                                    icon: '🚀'
                                                },
                                                {
                                                    label: '资金周转率',
                                                    val: (simResult.minCash !== 0 ? (simResult.totalGMV / Math.abs(simResult.minCash)).toFixed(2) : '0'),
                                                    color: 'from-blue-500 to-cyan-500',
                                                    textColor: 'text-blue-400',
                                                    borderColor: 'border-blue-500/20',
                                                    bgColor: 'bg-blue-500/5',
                                                    sub: 'GMV / 占用',
                                                    icon: '🔄'
                                                },
                                                {
                                                    label: '净利率',
                                                    val: (simResult.totalGMV !== 0 ? (simResult.totalNetProfit / simResult.totalGMV * 100).toFixed(1) : '0') + '%',
                                                    color: 'from-emerald-500 to-teal-500',
                                                    textColor: 'text-emerald-400',
                                                    borderColor: 'border-emerald-500/20',
                                                    bgColor: 'bg-emerald-500/5',
                                                    sub: '总利润 / GMV',
                                                    icon: '💎'
                                                },
                                                {
                                                    label: '库存周转天数',
                                                    val: turnDays.toFixed(0) + '天',
                                                    color: 'from-purple-500 to-violet-500',
                                                    textColor: 'text-purple-400',
                                                    borderColor: 'border-purple-500/20',
                                                    bgColor: 'bg-purple-500/5',
                                                    sub: '平均售罄周期',
                                                    icon: '⏱️'
                                                }
                                            ];

                                            return metrics.map((item, i) => (
                                                <div
                                                    key={i}
                                                    className={`relative rounded-xl border ${item.borderColor} ${item.bgColor} p-3 flex flex-col items-center justify-center text-center`}
                                                >

                                                    {/* Label with Icon */}
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <span className="text-xs opacity-70">{item.icon}</span>
                                                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{item.label}</span>
                                                    </div>

                                                    {/* Main Value */}
                                                    <div className={`text-xl font-black ${item.textColor} font-mono tracking-tight mb-1`}>
                                                        {item.val}
                                                    </div>

                                                    {/* Sub Label */}
                                                    <div className="text-[9px] text-zinc-600">{item.sub}</div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* ========== 头程物流区域 ========== */}
                            <div className="bg-gradient-to-b from-[#0f0f14] to-[#0a0a0e] border border-[#1e1e28] rounded-2xl p-4 flex-1 flex flex-col">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-600/30 to-blue-600/20 rounded-xl flex items-center justify-center border border-cyan-500/20">
                                        <span className="text-lg">🚚</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white tracking-wide">头程物流</h3>
                                        <p className="text-[10px] text-zinc-500 font-medium">First-Mile Logistics</p>
                                    </div>
                                </div>

                                {/* Logistics Cards - 3 Column, fill remaining height */}
                                <div className="grid grid-cols-3 gap-3 flex-1 min-h-0">
                                    {[
                                        { emoji: '🚢', name: '海运', nameEn: 'Sea', priceKey: 'seaPriceCbm', daysKey: 'seaDays', channelKey: 'seaChannelId', type: 'sea' as const, color: 'text-blue-400', gradientFrom: 'from-blue-600', gradientTo: 'to-cyan-600', borderColor: 'border-blue-500/30', bgColor: 'bg-blue-500/5' },
                                        { emoji: '✈️', name: '空派', nameEn: 'Air', priceKey: 'airPriceKg', daysKey: 'airDays', channelKey: 'airChannelId', type: 'air' as const, color: 'text-sky-400', gradientFrom: 'from-sky-600', gradientTo: 'to-teal-600', borderColor: 'border-sky-500/30', bgColor: 'bg-sky-500/5' },
                                        { emoji: '🚀', name: '快递', nameEn: 'Express', priceKey: 'expPriceKg', daysKey: 'expDays', channelKey: 'expChannelId', type: 'exp' as const, color: 'text-purple-400', gradientFrom: 'from-purple-600', gradientTo: 'to-pink-600', borderColor: 'border-purple-500/30', bgColor: 'bg-purple-500/5' },
                                    ].map(({ emoji, name, nameEn, daysKey, channelKey, priceKey, type, color, borderColor, bgColor }) => {
                                        const currentChanId = (state as any)[channelKey];
                                        const channel = channels.find(c => c.id === currentChanId);

                                        const isSea = type === 'sea';
                                        let useKg = !isSea;
                                        if (isSea) {
                                            if (channel) useKg = !!channel.pricePerKg && channel.pricePerKg > 0;
                                            else useKg = state.seaUnit === 'kg';
                                        }

                                        const volDivisor = channel ? (channel.volDivisor || 6000) : (type === 'exp' ? 5000 : 6000);
                                        const dimVol = state.boxL * state.boxW * state.boxH;
                                        const volWgt = dimVol / volDivisor;

                                        const chargeWgt = Math.max(state.boxWgt, volWgt);

                                        let unitPriceRMB = 0;
                                        let unitLabel = '';

                                        if (channel) {
                                            if (isSea) {
                                                if (useKg) {
                                                    unitPriceRMB = channel.pricePerKg || 0;
                                                    unitLabel = `¥${unitPriceRMB}/kg`;
                                                } else {
                                                    unitPriceRMB = channel.pricePerCbm || 0;
                                                    unitLabel = `¥${unitPriceRMB}/m³`;
                                                }
                                            } else {
                                                unitPriceRMB = channel.pricePerKg || 0;
                                                unitLabel = `¥${unitPriceRMB}/kg`;
                                            }
                                        } else {
                                            if (isSea) {
                                                if (useKg) {
                                                    unitPriceRMB = state.seaPriceKg || 0;
                                                    unitLabel = `¥${unitPriceRMB}/kg`;
                                                } else {
                                                    unitPriceRMB = state.seaPriceCbm || 0;
                                                    unitLabel = `¥${unitPriceRMB}/m³`;
                                                }
                                            } else {
                                                unitPriceRMB = (state as any)[priceKey] || 0;
                                                unitLabel = `¥${unitPriceRMB}/kg`;
                                            }
                                        }

                                        let costPerBoxRMB = 0;
                                        if (isSea && !useKg) {
                                            // Match calcOne logic: use 167 divisor for CBM conversion from Chargeable Weight
                                            costPerBoxRMB = (chargeWgt / 167) * unitPriceRMB;
                                        } else {
                                            costPerBoxRMB = unitPriceRMB * chargeWgt;
                                        }

                                        const costPerBoxUSD = costPerBoxRMB / state.exchRate;
                                        const costPerUnitUSD = costPerBoxUSD / state.pcsPerBox;
                                        const manualValue = isSea && useKg ? state.seaPriceKg : (state as any)[priceKey];
                                        const manualKey = isSea && useKg ? 'seaPriceKg' : priceKey;

                                        return (
                                            <div
                                                key={type}
                                                className={`relative rounded-xl border ${borderColor} ${bgColor} flex flex-col overflow-hidden h-full`}
                                            >

                                                {/* 1. 运输方式 */}
                                                <div className="flex-1 flex items-center justify-center gap-2 py-2 border-b border-zinc-800/30">
                                                    <div className={`w-7 h-7 rounded-md ${bgColor} border ${borderColor} flex items-center justify-center`}>
                                                        <span className="text-sm">{emoji}</span>
                                                    </div>
                                                    <div>
                                                        <div className={`text-xs font-black ${color}`}>{name}</div>
                                                        <div className="text-[9px] text-zinc-600">{nameEn}</div>
                                                    </div>
                                                </div>

                                                {/* 2. 选项 (渠道选择) */}
                                                <div className="flex-1 flex items-center justify-center py-2 border-b border-zinc-800/30">
                                                    <div className="flex items-center gap-1.5">
                                                        {isSea && !currentChanId && (
                                                            <button
                                                                onClick={() => setState(s => ({ ...s, seaUnit: s.seaUnit === 'cbm' ? 'kg' : 'cbm' }))}
                                                                className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 hover:text-white border border-zinc-700"
                                                            >
                                                                {useKg ? 'KG' : 'CBM'}
                                                            </button>
                                                        )}
                                                        <select
                                                            value={currentChanId || ''}
                                                            onChange={(e) => {
                                                                const newId = e.target.value;
                                                                const ch = channels.find(c => c.id === newId);
                                                                const updates: any = { [channelKey]: newId };
                                                                if (ch) updates[daysKey] = ch.deliveryDays;
                                                                setState(s => ({ ...s, ...updates }));
                                                            }}
                                                            className="appearance-none bg-zinc-800 text-[10px] text-zinc-300 font-bold focus:outline-none cursor-pointer px-2 py-1 rounded border border-zinc-700"
                                                        >
                                                            {channels.filter(c => c.type === type && c.status === 'active').map(c => (
                                                                <option key={c.id} value={c.id}>{c.name.slice(0, 8)}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* 3. 单个运费 (突出显示) */}
                                                <div className="flex-1 flex items-center justify-center border-b border-zinc-800/30">
                                                    <div className="text-center">
                                                        <div className="flex items-baseline justify-center gap-0.5">
                                                            <span className={`text-2xl font-black font-mono ${costPerUnitUSD > 0 ? color : 'text-zinc-700'}`}>
                                                                {costPerUnitUSD > 0 ? `$${costPerUnitUSD.toFixed(2)}` : '--'}
                                                            </span>
                                                            <span className="text-[9px] text-zinc-600">/个</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 4. 物流价格 + 时效 */}
                                                <div className="flex-1 flex flex-col items-center justify-center py-2 border-b border-zinc-800/30">
                                                    <div className="text-[10px] text-zinc-500 mb-1">物流价格</div>
                                                    {channel ? (
                                                        <span className="text-[13px] text-zinc-200 font-mono font-bold">{unitLabel}</span>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <NumberStepper
                                                                value={manualValue}
                                                                onChange={(v) => setState(s => ({ ...s, [manualKey]: v }))}
                                                                step={useKg ? 0.5 : 50}
                                                                decimals={useKg ? 2 : 0}
                                                                min={0}
                                                                className="w-14 h-5 bg-zinc-800 border border-zinc-700 rounded text-center text-[10px] text-white"
                                                            />
                                                            <span className="text-[9px] text-zinc-500">{useKg ? '/kg' : '/m³'}</span>
                                                        </div>
                                                    )}
                                                    {channel && (
                                                        <div className="text-[11px] text-zinc-400 mt-1">{(state as any)[daysKey]}天</div>
                                                    )}
                                                </div>

                                                {/* 5. 重量 */}
                                                <div className="flex-1 flex items-center justify-center px-3 py-2 border-b border-zinc-800/30">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-center">
                                                            <div className="text-[9px] text-zinc-500">箱重</div>
                                                            <div className="text-[11px] text-zinc-300 font-mono">{state.boxWgt}kg</div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className="text-[9px] text-zinc-500">抛重</div>
                                                            <div className="text-[11px] text-zinc-300 font-mono">{volWgt.toFixed(1)}kg</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 6. 单箱运费 */}
                                                {/* 6. 单箱运费 + 装箱数 */}
                                                <div className="flex-1 grid grid-cols-2 items-center py-2 bg-zinc-900/30 border-t border-zinc-800/30">
                                                    <div className="flex flex-col items-center justify-center border-r border-zinc-800/50 px-1">
                                                        <div className="text-[10px] text-zinc-500 mb-0.5 scale-90">单箱运费</div>
                                                        <span className={`text-xs font-black font-mono tracking-tight ${costPerBoxUSD > 0 ? 'text-white' : 'text-zinc-700'}`}>
                                                            {costPerBoxUSD > 0 ? `$${costPerBoxUSD.toFixed(2)}` : '--'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center px-1">
                                                        <div className="text-[10px] text-zinc-500 mb-0.5 scale-90">装箱 /pcs</div>
                                                        <span className="text-xs font-black font-mono text-zinc-300 tracking-tight">
                                                            {state.pcsPerBox}
                                                        </span>
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

                                    {/* 安全天数控制 */}
                                    <div className="flex items-center gap-1 ml-2 bg-zinc-800/50 rounded px-1.5 py-0.5 border border-zinc-700/50">
                                        <span className="text-[9px] text-zinc-500">🛡️ 安全天数</span>
                                        <NumberStepper
                                            value={state.safetyDays || 7}
                                            onChange={(v) => setState(s => ({ ...s, safetyDays: v }))}
                                            className="w-12 h-[18px] bg-transparent text-[10px] text-white text-center focus:outline-none"
                                            step={1}
                                            min={0}
                                            max={30}
                                        />
                                    </div>
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
                                                <div className="grid grid-cols-[36px_0.8fr_1.5fr_0.8fr] gap-1 items-center shrink-0">
                                                    <select value={b.type} onChange={(e) => updateBatch(b.id, 'type', e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded h-[22px] text-[10px] text-white font-bold cursor-pointer hover:border-zinc-500 transition-colors text-center w-full appearance-none leading-none">
                                                        <option value="sea">🚢</option>
                                                        <option value="air">✈️</option>
                                                        <option value="exp">🚀</option>
                                                    </select>
                                                    <div className="relative">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold z-10 pointer-events-none scale-90">生产</span>
                                                        <NumberStepper value={b.prodDays ?? 15} onChange={(v) => updateBatch(b.id, 'prodDays', v)} className="w-full h-[22px] bg-zinc-900 border border-zinc-700 rounded text-[10px] pl-6 text-white focus:border-blue-500/50 transition-colors leading-none" />
                                                    </div>
                                                    <div className="relative flex items-center bg-zinc-900 border border-zinc-700 rounded h-[22px] overflow-hidden">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold z-10 pointer-events-none scale-90">基础</span>
                                                        <NumberStepper
                                                            value={b.qty}
                                                            onChange={(v) => updateBatch(b.id, 'qty', v)}
                                                            className="w-1/2 h-full bg-transparent border-none text-[10px] font-bold text-right text-zinc-400 focus:ring-0 leading-none pr-1 pl-6"
                                                        />
                                                        <div className="w-[1px] h-3 bg-zinc-700 mx-0.5"></div>
                                                        <span className="flex-1 text-[10px] font-bold text-blue-400 leading-none pl-3 w-1/2 text-left">
                                                            {Math.round(b.qty * (1 + (b.extraPercent || 0) / 100))}
                                                        </span>
                                                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-500 font-bold pointer-events-none scale-90">实际</span>
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
                <div className="h-14 px-4 flex items-center gap-2 border-b border-[#27272a] bg-[#0a0a0a] flex-shrink-0 relative z-20">
                    {/* KPI Metrics */}
                    <div className="w-24 shrink-0">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">资金最大占用</div>
                        <div className="text-sm font-black text-red-400">{simResult ? fmtMoney(Math.abs(simResult.minCash)) : '$0'}</div>
                    </div>
                    <div className="w-24 shrink-0">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">累计净利润</div>
                        <div className="text-sm font-black text-green-400">{simResult ? fmtMoney(simResult.totalNetProfit) : '$0'}</div>
                    </div>
                    <div className="w-16 shrink-0">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold whitespace-nowrap">回本日期</div>
                        <div className="text-sm font-black text-blue-400">{simResult?.breakevenDate || '--'}</div>
                    </div>
                    <div className="w-16 shrink-0">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold whitespace-nowrap">盈利日期</div>
                        <div className="text-sm font-black text-green-400">{simResult?.profBeDateStr || '--'}</div>
                    </div>

                    {/* Spacer to push rest to right */}
                    <div className="flex-1 min-w-0"></div>

                    {/* 产品选择器 */}
                    <div className="relative shrink-0 flex items-center">
                        <select
                            value={selectedProductId || ''}
                            onChange={(e) => handleProductSelect(e.target.value)}
                            className="appearance-none bg-[#18181b] hover:bg-[#1f1f23] border border-[#27272a] hover:border-zinc-600 text-zinc-300 text-xs font-bold pl-2 pr-6 rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-[180px] h-8 flex items-center"
                        >
                            <option value="">📦 选择产品</option>
                            {products
                                .filter(p => {
                                    // Only show products with existing profit models
                                    const models = ProfitModelService.getAll();
                                    return models.some(m => m.productId === p.id);
                                })
                                .map(p => (<option key={p.id} value={p.id}>{p.name.slice(0, 20)}</option>))}
                        </select>
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                            <span className="material-symbols-outlined text-amber-500/50 text-[16px]">expand_more</span>
                        </div>
                    </div>

                    {/* 策略选择器 */}
                    <div className="relative shrink-0 flex items-center">
                        <select
                            value={selectedStrategyId}
                            onChange={(e) => handleStrategySelect(e.target.value)}
                            disabled={strategies.length === 0}
                            className={`appearance-none border text-xs font-bold pl-2 pr-6 rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 w-[130px] h-8 flex items-center ${strategies.length > 0
                                ? 'bg-amber-900/30 hover:bg-amber-900/50 border-amber-500/30 hover:border-amber-500/50 text-amber-100'
                                : 'bg-[#18181b] border-[#27272a] text-zinc-500 cursor-not-allowed'
                                }`}
                        >
                            <option value="">⚡ {strategies.length > 0 ? '策略' : '无'}</option>
                            {strategies.map(s => {
                                const marginPct = (s.results?.planB?.margin ?? 0) * 100;
                                return (
                                    <option key={s.id} value={s.id}>
                                        ${s.inputs.actualPrice} - {marginPct.toFixed(0)}%
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* 保存策略按钮 */}
                    <div className="flex items-center gap-2 px-2 shrink-0">
                        <button
                            onClick={handleSaveAsNewPlan}
                            className="flex items-center gap-1 px-3 h-8 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 text-xs font-bold rounded-lg transition-all shadow-lg shrink-0"
                            title="将当前配置另存为一个新的对比方案，不覆盖原策略"
                        >
                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                            另存为新方案
                        </button>

                        <button
                            id="btn-sync-strategy"
                            onClick={handleSyncToStrategy}
                            disabled={!simResult || !selectedStrategyId}
                            className="flex items-center gap-1 px-3 h-8 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold rounded-lg transition-all shadow-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="同步到策略，如有变更自动保存快照"
                        >
                            <span className="material-symbols-outlined text-[16px]">save_as</span>
                            保存策略
                        </button>
                    </div>



                    {/* 推演起始日期 */}
                    <div className="flex items-center gap-1 shrink-0 ml-0">
                        <span className="text-zinc-500 text-[10px] font-bold whitespace-nowrap">推演开始</span>
                        <input
                            type="date"
                            value={state.simStart}
                            onChange={(e) => setState((s) => ({ ...s, simStart: e.target.value }))}
                            className="bg-[#18181b] hover:bg-[#1f1f23] border border-[#27272a] hover:border-zinc-600 text-zinc-300 text-xs font-bold px-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono w-[110px] h-8"
                        />
                    </div>
                </div>

                {/* Charts - Shared X-axis layout */}
                < div className="flex-1 flex flex-col overflow-hidden relative" >
                    {/* Floating Stockout Summary */}
                    < div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-[#18181b]/80 backdrop-blur-sm border border-[#27272a] rounded-full px-4 py-1 shadow-xl flex items-center gap-3 pointer-events-none" >
                        {/* 补货总数 */}
                        < div className="flex items-center gap-1 border-r border-[#27272a] pr-3" >
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">补货总数</span>
                            <span className="text-xs font-black text-blue-400 font-mono">
                                {state.batches.reduce((sum, b) => sum + Math.round(b.qty * (1 + (b.extraPercent || 0) / 100)), 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] text-zinc-600">件</span>
                        </div >
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
                    </div >

                    <div className="flex-1 flex flex-col overflow-hidden" onClick={() => setSelectedEvent(null)}>
                        <div className="h-1/2 pl-1 pr-4 pt-4 pb-0 overflow-hidden relative">
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
                </div >
            </main >
        </div>
    );
};

export default ReplenishmentAdvice;
