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

// ============ Gantt 图数据类型 ============

/** Gantt 柱状图基础数据 */
export interface GanttBarBase {
    x: [number, number];   // [开始日, 结束日]
    y: number;             // 批次索引
    batchIdx: number;      // 批次索引
    duration?: number;     // 持续天数
}

/** 生产阶段数据 */
export interface GanttProdBar extends GanttBarBase {
    cost: number;          // 采购成本
}

/** 运输阶段数据 */
export interface GanttShipBar extends GanttBarBase {
    freight: number;       // 运费
}

/** 待售阶段数据 */
export interface GanttHoldBar extends GanttBarBase {
    duration: number;      // 待售天数
}

/** 销售阶段数据 */
export interface GanttSellBar extends GanttBarBase {
    revenue: number;       // 回款金额
}

/** 断货数据 */
export interface GanttStockoutBar extends GanttBarBase {
    gapDays: number;       // 断货天数
}

export interface SimulationResult {
    xMin: number;
    xMax: number;
    cashPoints: { x: number; y: number }[];
    invPoints: { x: number; y: number }[];
    profitPoints: { x: number; y: number }[];
    ganttProd: GanttProdBar[];
    ganttShip: GanttShipBar[];
    ganttHold: GanttHoldBar[];
    ganttSell: GanttSellBar[];
    ganttStockout: GanttStockoutBar[];
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

