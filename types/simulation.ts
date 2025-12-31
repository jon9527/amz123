export interface SimulationParams {
    simStart: string;
    batches: {
        id: number;
        name: string;
        qty: number;
        offset: number; // days from start
        prodDays: number;
        type: 'sea' | 'air' | 'exp';
        extraPercent?: number; // 0-100
    }[];
    global: {
        unitCost: number;     // 采购成本 (¥)
        exchRate: number;
        paymentTerms: {
            deposit: number; // 0-100
            balance: number; // 0-100
        };
    };
    logistics: {
        // [type]: { days, price (¥) }
        sea: { days: number; price: number };
        air: { days: number; price: number };
        exp: { days: number; price: number };
    };
    sales: {
        // 12 months data
        dailySales: number[]; // 1-12月 预估日销量
        prices: number[];     // 1-12月 售价 ($)
        // Specific fee model per month/period
        fees: {
            fba: number;        // ($)
            commission: number; // rate (0.15)
            tacos: number;      // rate (0.10)
            storage: number;    // ($)
            other: number;      // ($) (e.g. returns share)
        }[];
    };
    maxDays?: number;
}

export interface DayMetric {
    dayIndex: number;
    dateStr: string;
    inventory: number;
    cashBalance: number;
    accumulatedProfit: number;

    // Daily flow
    cashIn: number;
    cashOut: number;
    profit: number;

    // Flags
    isStockout: boolean;
}

export interface GanttItem {
    x: [number, number]; // start, end
    y: string;           // y-axis label key
    batchIdx: number;
    // Context specific data
    cost?: number;       // Production cost
    freight?: number;    // Shipping cost
    revenue?: number;    // Sales revenue
    duration?: number;   // days
    gapDays?: number;    // stockout days
}

export interface ChartAnnotation {
    type: 'deposit' | 'balance' | 'freight' | 'recall' | 'stockout';
    dayIndex: number;
    amount: number;
    label: string;
    color: string;
    batchIdx?: number;
}

export interface SimulationResult {
    // Limits
    xMin: number;
    xMax: number;

    // Series Data (for Charts)
    cashPoints: { x: number; y: number }[];
    profitPoints: { x: number; y: number }[];
    invPoints: { x: number; y: number }[];

    // Gantt Data
    ganttProd: GanttItem[];
    ganttShip: GanttItem[];
    ganttHold: GanttItem[];
    ganttSell: GanttItem[];
    ganttStockout: GanttItem[];

    // KPIs
    minCash: number;            // Max Exposure
    finalCash: number;
    totalRevenue: number;
    totalNetProfit: number;
    roi: number;                // NetProfit / |minCash|
    turnover: number;           // Revenue / |minCash|

    // Key Dates
    breakevenDay: number | null; // Index
    profitabilityDay: number | null; // Index

    // Stats
    totalStockoutDays: number;

    // Annotations for Chart.js
    annotations: Record<string, any>;
}
