import { ModuleState } from '../ReplenishmentTypes';

export const getDefaultState = (): ModuleState => ({
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
    exchRate: 7.2,
    ratioDeposit: 0.3,
    ratioBalance: 0.7,
    prodDays: 15,
    batches: [],
    isFreeMode: false,
});
