import { ReplenishmentBatch } from '../types';

export interface LogisticsCosts {
    sea: number;
    air: number;
    exp: number;
}

export interface ModuleState {
    boxL: number; boxW: number; boxH: number; boxWgt: number;
    pcsPerBox: number;
    seaPriceCbm: number; seaPriceKg: number; seaDays: number; seaUnit: 'cbm' | 'kg';
    airPriceKg: number; airDays: number;
    expPriceKg: number; expDays: number;
    simStart: string;
    monthlyDailySales: number[]; // 12个月的预期日销量（1-12月）
    seasonality: number[]; // 保留用于向后兼容
    baseSales: number[]; // 保留用于向后兼容
    prices: number[];
    margins: number[];
    unitCost: number;
    sellCost: number; // 总成本(无广) from strategy
    shippingUSD: number; // 头程USD from strategy
    profitUSD: number; // 净利润USD from strategy

    // 物流渠道选择
    seaChannelId?: string;
    airChannelId?: string;
    expChannelId?: string;

    exchRate: number;
    ratioDeposit: number;
    ratioBalance: number;
    prodDays: number;
    batches: ReplenishmentBatch[];
    isFreeMode: boolean;
    safetyDays: number;
}

// 资金事件类型
export interface FinancialEvent {
    day: number;           // 发生在第几天
    type: 'deposit' | 'balance' | 'freight' | 'recall'; // 事件类型
    batchIdx: number;      // 批次索引
    amount: number;        // 金额 (RMB, 负数为支出)
    label: string;         // 显示标签，如 "#1定 12/27"
}

export interface SimulationResult {
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
    totalGMV: number;
    totalSoldQty: number;
    breakevenDate: string;
    profBeDateStr: string;
    bePoint: { x: number; y: number } | null;
    profBePoint: { x: number; y: number } | null;
    beIdx: number | null;
    profBeIdx: number | null;
    financialEvents: FinancialEvent[];
    totalStockoutDays: number;
}
