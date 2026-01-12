import { ReplenishmentBatch } from '../types';
import { ModuleState, SimulationResult, FinancialEvent, LogisticsCosts } from './ReplenishmentTypes';

// Helper: Format Date
export const fmtDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
};

export interface FeeBreakdown {
    recallUSD: number;
    netProfit: number;
}

export const runSimulation = (
    state: ModuleState,
    logCosts: LogisticsCosts,
    selectedStrategyId: string,
    computeFeeBreakdown: (price: number, strategyId: string) => FeeBreakdown
): SimulationResult => {
    const { batches, unitCost, exchRate, ratioDeposit, ratioBalance, seaDays, airDays, expDays, margins, prices } = state;
    const logDays = { sea: seaDays, air: airDays, exp: expDays };
    const logPrices = { sea: logCosts.sea, air: logCosts.air, exp: logCosts.exp };
    const maxSimDays = 500;

    const dailyChange = new Array(maxSimDays).fill(0);
    const dailyProfitChange = new Array(maxSimDays).fill(0);
    const dailyInv = new Array(maxSimDays).fill(0);
    const dailyMissed = new Array(maxSimDays).fill(false);

    const ganttProd: any[] = [], ganttShip: any[] = [], ganttHold: any[] = [], ganttSell: any[] = [], ganttStockout: any[] = [];
    let totalRevenue = 0, totalNetProfit = 0, totalGMV = 0, totalSoldQty = 0;
    const batchRevenueMap = new Array(batches.length).fill(0);
    const arrivalEvents: Record<number, any[]> = {};
    const salesPeriods = batches.map(() => ({ start: null as number | null, end: null as number | null, arrival: null as number | null }));

    // 资金事件收集
    const financialEvents: FinancialEvent[] = [];
    const batchRecallMap: Record<number, { day: number; amount: number }[]> = {}; // 每批次的回款记录

    // 辅助函数：根据偏移天数获取当天的日销量
    const getDailyDemand = (dayOffset: number): number => {
        const currentDate = new Date(state.simStart);
        currentDate.setDate(currentDate.getDate() + dayOffset);
        const calendarMonth = currentDate.getMonth();
        return state.monthlyDailySales[calendarMonth] || 50;
    };

    const getBatchLabel = (i: number, b: ReplenishmentBatch) => {
        const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
        return `批次${i + 1}\n${finalQty}件`;
    };
    const getDateStr = (offset: number) => {
        const d = new Date(state.simStart);
        d.setDate(d.getDate() + offset);
        return fmtDate(d);
    };

    batches.forEach((b, i) => {
        const lDays = logDays[b.type] || 0;
        const lPrice = logPrices[b.type] || 0;  // RMB per unit
        const lPriceUSD = lPrice / exchRate;    // Convert to USD
        const t0 = b.offset;
        const t1 = t0 + (b.prodDays || 15);
        const t2 = t1 + lDays;

        const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
        const batchCostUSD = finalQty * unitCost;        // USD (unitCost is already USD)
        const batchFreightUSD = finalQty * lPriceUSD;    // USD
        const yKey = i.toString();

        ganttProd.push({ x: [t0, t1], y: yKey, batchIdx: i, cost: batchCostUSD });
        ganttShip.push({ x: [t1, t2], y: yKey, batchIdx: i, freight: batchFreightUSD });

        // 资金流出 + 事件收集 (单位: USD)
        const depositAmount = batchCostUSD * ratioDeposit;
        const balanceAmount = batchCostUSD * ratioBalance;

        if (t0 < maxSimDays) {
            dailyChange[t0] -= depositAmount;
            dailyProfitChange[t0] -= depositAmount; // 投入阶段：利润曲线减去定金
            financialEvents.push({
                day: t0,
                type: 'deposit',
                batchIdx: i,
                amount: -depositAmount,
                label: `#${i + 1}定 ${getDateStr(t0)}`
            });
        }
        if (t1 < maxSimDays) {
            dailyChange[t1] -= balanceAmount;
            dailyProfitChange[t1] -= balanceAmount; // 投入阶段：利润曲线减去尾款
            financialEvents.push({
                day: t1,
                type: 'balance',
                batchIdx: i,
                amount: -balanceAmount,
                label: `#${i + 1}尾 ${getDateStr(t1)}`
            });
        }
        const freightDay = Math.floor(t2);
        if (freightDay < maxSimDays) {
            dailyChange[freightDay] -= batchFreightUSD;
            dailyProfitChange[freightDay] -= batchFreightUSD; // 投入阶段：利润曲线减去运费
            financialEvents.push({
                day: freightDay,
                type: 'freight',
                batchIdx: i,
                amount: -batchFreightUSD,
                label: `#${i + 1}运 ${getDateStr(freightDay)}`
            });
        }

        if (!arrivalEvents[freightDay]) arrivalEvents[freightDay] = [];
        arrivalEvents[freightDay].push({ qty: finalQty, unitCost, unitFreight: lPriceUSD, batchIdx: i, yLabel: getBatchLabel(i, b), arrivalTime: freightDay });

        batchRecallMap[i] = [];
    });


    const inventoryQueue: any[] = [];
    let currentInv = 0;
    let firstSaleDay: number | null = null;

    for (let d = 0; d < maxSimDays; d++) {
        // ... (Loop unchanged until internal logic)
        if (arrivalEvents[d]) {
            arrivalEvents[d].forEach((batch) => {
                inventoryQueue.push(batch);
                currentInv += batch.qty;
                if (batch.batchIdx !== undefined && batch.batchIdx >= 0 && salesPeriods[batch.batchIdx]) {
                    salesPeriods[batch.batchIdx].arrival = d;
                }
            });
            inventoryQueue.sort((a, b) => a.arrivalTime - b.arrivalTime || a.batchIdx - b.batchIdx);
        }

        let demand = getDailyDemand(d);
        let remainingDemand = demand;

        let mIdx = 0;
        if (firstSaleDay !== null) {
            const currentDate = new Date(state.simStart);
            currentDate.setDate(currentDate.getDate() + d);
            const firstSaleDate = new Date(state.simStart);
            firstSaleDate.setDate(firstSaleDate.getDate() + firstSaleDay);
            const yearsDiff = currentDate.getFullYear() - firstSaleDate.getFullYear();
            const monthsDiff = currentDate.getMonth() - firstSaleDate.getMonth();
            mIdx = yearsDiff * 12 + monthsDiff;
            if (currentDate.getDate() < firstSaleDate.getDate()) {
                mIdx = Math.max(0, mIdx - 1);
            }
            mIdx = Math.min(5, mIdx);
        }

        if (currentInv > 0 && demand > 0) {
            if (firstSaleDay === null) firstSaleDay = d;

            while (demand > 0 && inventoryQueue.length > 0) {
                const batchObj = inventoryQueue[0];
                if (batchObj.batchIdx >= 0) {
                    if (salesPeriods[batchObj.batchIdx].start === null) salesPeriods[batchObj.batchIdx].start = d;
                    salesPeriods[batchObj.batchIdx].end = d + 1;
                }

                const take = Math.min(demand, batchObj.qty);
                remainingDemand -= take;

                const price = prices[mIdx] || 0;
                let unitRecallUSD: number;
                let unitProfitUSD: number;

                if (selectedStrategyId) {
                    const breakdown = computeFeeBreakdown(price, selectedStrategyId);
                    unitRecallUSD = breakdown.recallUSD;   // Already USD
                    unitProfitUSD = breakdown.netProfit;   // Already USD
                } else {
                    const marginPercent = margins[mIdx] || 0;
                    unitProfitUSD = price * (marginPercent / 100);
                    unitRecallUSD = batchObj.unitCost + batchObj.unitFreight + unitProfitUSD;
                }

                const revenue = take * unitRecallUSD;  // USD
                const profit = take * unitProfitUSD;   // USD

                // Track Revenue per Batch
                if (batchObj.batchIdx >= 0 && batchRevenueMap[batchObj.batchIdx] !== undefined) {
                    batchRevenueMap[batchObj.batchIdx] += revenue;
                }
                const payDay = d + 14;
                if (payDay < maxSimDays) dailyChange[payDay] += revenue;

                // Track Recalls
                const recalls = batchRecallMap[batchObj.batchIdx];
                if (recalls) {
                    const lastRecall = recalls[recalls.length - 1];
                    if (lastRecall && lastRecall.day === payDay) {
                        lastRecall.amount += revenue;
                    } else if (payDay < maxSimDays) {
                        recalls.push({ day: payDay, amount: revenue });
                    }
                }

                totalGMV += take * price;
                totalSoldQty += take;
                totalRevenue += revenue;
                totalNetProfit += profit;
                // 利润曲线：销售日计入回款（与成本抵消后即为利润）
                dailyProfitChange[d] += revenue;

                batchObj.qty -= take;
                currentInv -= take;
                demand -= take;

                if (batchObj.qty <= 0) inventoryQueue.shift();
            }
        }
        if (firstSaleDay !== null && d >= firstSaleDay && remainingDemand > 0.01) dailyMissed[d] = true;
        dailyInv[d] = currentInv;
    }

    // Process Recalls (Chunking) - Helper
    const generateRecallEvents = (recalls: { day: number; amount: number }[], bIdx: number) => {
        if (!recalls || recalls.length === 0) return;
        recalls.sort((a, b) => a.day - b.day);
        let chunkStartDay = recalls[0].day;
        let chunkAmount = 0;
        recalls.forEach(r => {
            if (r.day - chunkStartDay > 14) {
                if (chunkAmount > 10) {  // USD threshold
                    const evtDay = chunkStartDay + 7;
                    financialEvents.push({
                        day: evtDay, type: 'recall', batchIdx: bIdx, amount: chunkAmount,
                        label: bIdx === -1 ? `原有回款` : `#${bIdx + 1}回 $${Math.round(chunkAmount / 100) / 10}k`
                    });
                }
                chunkStartDay = r.day;
                chunkAmount = 0;
            }
            chunkAmount += r.amount;
        });
        if (chunkAmount > 10) {  // USD threshold
            const evtDay = chunkStartDay + 7;
            financialEvents.push({
                day: evtDay, type: 'recall', batchIdx: bIdx, amount: chunkAmount,
                label: bIdx === -1 ? `原有回款` : `#${bIdx + 1}回 $${Math.round(chunkAmount / 100) / 10}k`
            });
        }
    };

    // Process Batch Recalls
    batches.forEach((_, i) => generateRecallEvents(batchRecallMap[i], i));

    salesPeriods.forEach((period, i) => {

        const yKey = i.toString();
        if (period.start !== null && period.end !== null) {
            ganttSell.push({ x: [period.start, period.end], y: yKey, batchIdx: i, revenue: batchRevenueMap[i] });
            if (period.arrival !== null && period.start > period.arrival) {
                ganttHold.push({ x: [period.arrival, period.start], y: yKey, batchIdx: i, duration: period.start - period.arrival });
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
                        let maxEnd = -1;
                        for (let k = 0; k < salesPeriods.length; k++) {
                            const end = salesPeriods[k].end;
                            if (end !== null && end <= stockoutStart + 1) {
                                if (end > maxEnd) {
                                    maxEnd = end;
                                    prevBatchIdx = k;
                                }
                            }
                        }
                        ganttStockout.push({ x: [stockoutStart, d], y: prevBatchIdx.toString(), gapDays: d - stockoutStart });
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

    const lastFinDay = financialEvents.reduce((max, e) => Math.max(max, e.day), 0);
    const lastSellDay = ganttSell.reduce((max, item) => Math.max(max, item.x[1]), 0);
    // Also consider Gantt production and shipping bars for xMax
    const lastProdDay = ganttProd.reduce((max, item) => Math.max(max, item.x[1]), 0);
    const lastShipDay = ganttShip.reduce((max, item) => Math.max(max, item.x[1]), 0);
    const rawCutoff = Math.max(lastFinDay, lastSellDay, lastProdDay, lastShipDay) + 14;
    // Round up to nearest 14-day boundary for clean chart alignment
    const cutoffDay = Math.min(Math.ceil(rawCutoff / 14) * 14, maxSimDays - 1);

    for (let d = 0; d < dailyChange.length; d++) {
        const prevCash = runningCash, prevProf = runningProfit;
        runningCash += dailyChange[d];
        runningProfit += dailyProfitChange[d];
        if (runningCash < minCash) minCash = runningCash;
        if (beIdx === null && prevCash < 0 && runningCash >= 0 && d > 10) { beIdx = d; bePoint = { x: d, y: runningCash }; }
        // 利润盈亏点：从负数变成正数（投入回本）
        if (profBeIdx === null && prevProf < 0 && runningProfit >= 0 && d > 10) { profBeIdx = d; profBePoint = { x: d, y: runningProfit }; }
        if (d <= cutoffDay) {
            cashPoints.push({ x: d, y: runningCash });
            profitPoints.push({ x: d, y: runningProfit });
            invPoints.push({ x: d, y: dailyInv[d] || 0 });
        }
    }

    return {
        xMin: 0, xMax: cutoffDay,
        cashPoints, invPoints, profitPoints,
        ganttProd, ganttShip, ganttHold, ganttSell, ganttStockout,
        totalStockoutDays: ganttStockout.reduce((sum, item) => sum + (item.gapDays || 0), 0),
        minCash, finalCash: runningCash, totalNetProfit, totalRevenue, totalGMV, totalSoldQty,
        breakevenDate: beIdx !== null ? getDateStr(beIdx) : '未回本',
        profBeDateStr: profBeIdx !== null ? getDateStr(profBeIdx) : '未盈利',
        bePoint, profBePoint,
        beIdx, profBeIdx,
        financialEvents,
    };
};
