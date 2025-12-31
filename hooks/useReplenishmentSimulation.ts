import { useMemo } from 'react';
import { SimulationParams, SimulationResult, GanttItem } from '../types/simulation';

const MAX_SIM_DAYS = 400;

export const useReplenishmentSimulation = (params: SimulationParams): SimulationResult | null => {
    return useMemo(() => {
        if (!params.batches || params.batches.length === 0) return null;

        // --- 1. 初始化数组 ---
        const dailyInv = new Array(MAX_SIM_DAYS).fill(0);
        const dailyCashChange = new Array(MAX_SIM_DAYS).fill(0);
        const dailyProfitChange = new Array(MAX_SIM_DAYS).fill(0);
        const dailyMissed = new Array(MAX_SIM_DAYS).fill(false);

        // --- 2. 预处理：批次事件与成本 ---
        const arrivalEvents: Record<number, any[]> = {};
        const ganttProd: GanttItem[] = [];
        const ganttShip: GanttItem[] = [];
        const annotations: Record<string, any> = {};

        // 辅助：日期格式化
        const fmtDate = (offset: number) => {
            const d = new Date(params.simStart);
            d.setDate(d.getDate() + offset);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        };

        // 辅助：创建Annotation配置
        const createBadge = (day: number, color: string, text: string[] | string, yAdjust: number) => ({
            type: 'line',
            scaleID: 'x',
            value: day,
            borderColor: color,
            borderWidth: 1,
            borderDash: [4, 4],
            label: {
                display: true,
                content: text,
                backgroundColor: color,
                color: '#fff',
                font: { size: 10, weight: 'bold' },
                borderRadius: 4,
                padding: 4,
                position: 'start',
                yAdjust: yAdjust,
                z: 10
            }
        });

        params.batches.forEach((b, i) => {
            const log = params.logistics[b.type];
            const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));

            // 时间点
            const t0 = b.offset; // 下单
            const t1 = t0 + b.prodDays; // 发货
            const t2 = t1 + log.days;   // 到货

            // 成本 (RMB)
            const costProd = finalQty * params.global.unitCost;
            const costFreight = finalQty * log.price;

            // 资金流出 (RMB)
            // 1. 定金 (t0)
            const deposit = costProd * (params.global.paymentTerms.deposit / 100);
            if (t0 < MAX_SIM_DAYS) {
                dailyCashChange[t0] -= deposit;
                // Annot: Deposit
                annotations[`dep_${i}`] = createBadge(t0, '#e74c3c', [`#${i + 1}定`, `¥${Math.round(deposit / 1000)}k`], 90);
            }

            // 2. 尾款 (t1) - 假设发货付尾款
            const balance = costProd * (params.global.paymentTerms.balance / 100);
            if (t1 < MAX_SIM_DAYS) {
                dailyCashChange[t1] -= balance;
                if (balance > 0) {
                    annotations[`bal_${i}`] = createBadge(t1, '#c0392b', [`#${i + 1}尾`, `¥${Math.round(balance / 1000)}k`], 70);
                }
            }

            // 3. 运费 (t2) - 假设到港付运费
            const freightDay = Math.floor(t2);
            if (freightDay < MAX_SIM_DAYS) {
                dailyCashChange[freightDay] -= costFreight;
                annotations[`fre_${i}`] = createBadge(freightDay, '#d4a017', [`#${i + 1}运`, `¥${Math.round(costFreight / 1000)}k`], 50);
            }

            // Gantt Items
            const yKey = i.toString();
            ganttProd.push({ x: [t0, t1], y: yKey, batchIdx: i, cost: costProd });
            ganttShip.push({ x: [t1, t2], y: yKey, batchIdx: i, freight: costFreight });

            // Arrival Queue
            if (!arrivalEvents[freightDay]) arrivalEvents[freightDay] = [];
            arrivalEvents[freightDay].push({
                batchIdx: i,
                qty: finalQty,
                unitCost: params.global.unitCost,        // RMB
                unitFreight: log.price,                  // RMB
                arrivalTime: freightDay
            });
        });

        // --- 3. 逐日推演 (Day-by-Day) ---
        const inventoryQueue: any[] = []; // FIFO Queue
        let currentInv = 0;
        let firstSaleDay: number | null = null;

        const salesPeriods = params.batches.map(() => ({ start: null as number | null, end: null as number | null, arrival: null as number | null }));
        const batchRevenueMap = new Array(params.batches.length).fill(0);

        const ganttSell: GanttItem[] = [];
        const ganttHold: GanttItem[] = [];
        const ganttStockout: GanttItem[] = [];

        let totalRevenue = 0;
        let totalNetProfit = 0;

        for (let d = 0; d < MAX_SIM_DAYS; d++) {
            // A. 处理到货
            if (arrivalEvents[d]) {
                arrivalEvents[d].forEach(ev => {
                    inventoryQueue.push(ev);
                    currentInv += ev.qty;
                    salesPeriods[ev.batchIdx].arrival = d;
                });
                // Sort by arrival time then by batch index (FIFO)
                inventoryQueue.sort((a, b) => a.arrivalTime - b.arrivalTime || a.batchIdx - b.batchIdx);
            }

            // B. 计算本日需求
            // 确定当前是第几个"销售月"
            let monthIdx = 0;
            if (firstSaleDay !== null) {
                // 计算实际日期对应的月份
                const currentDate = new Date(params.simStart);
                currentDate.setDate(currentDate.getDate() + d);
                // 简单映射：基于日期的 Calendar Month
                monthIdx = currentDate.getMonth();
            } else if (currentInv > 0) {
                // 还没开始卖，但今天有库存了 -> 今天就是 First Sale Day
                const currentDate = new Date(params.simStart);
                currentDate.setDate(currentDate.getDate() + d);
                monthIdx = currentDate.getMonth();
            }

            // 获取该月的配置
            const dailyDemand = params.sales.dailySales[monthIdx] || 0;
            const priceUSD = params.sales.prices[monthIdx] || 0;
            const feeConfig = params.sales.fees[monthIdx] || params.sales.fees[0]; // fallback

            // 平台扣费 (Unit)
            // 1. 佣金
            const commission = priceUSD * feeConfig.commission;
            // 2. 广告
            const ads = priceUSD * feeConfig.tacos;
            // 3. FBA + 杂费 + 仓储
            const fixedFees = feeConfig.fba + feeConfig.other + feeConfig.storage;

            // 单个产品的回款 (USD)
            const unitRecallUSD = priceUSD - commission - ads - fixedFees;
            const unitRecallRMB = unitRecallUSD * params.global.exchRate;

            let remainingDemand = dailyDemand;

            // C. 扣减库存 (FIFO)
            if (currentInv > 0 && dailyDemand > 0) {
                if (firstSaleDay === null) firstSaleDay = d;

                while (remainingDemand > 0 && inventoryQueue.length > 0) {
                    const batch = inventoryQueue[0];
                    if (salesPeriods[batch.batchIdx].start === null) salesPeriods[batch.batchIdx].start = d;
                    salesPeriods[batch.batchIdx].end = d + 1; // 持续更新结束时间

                    const take = Math.min(remainingDemand, batch.qty);

                    // 财务计算
                    const revenueRMB = take * unitRecallRMB;
                    const cogsRMB = take * (batch.unitCost + batch.unitFreight);
                    const profitRMB = revenueRMB - cogsRMB;

                    // 1. 累加收入/利润
                    totalRevenue += revenueRMB;
                    totalNetProfit += profitRMB;
                    dailyProfitChange[d] += profitRMB;

                    // 2. 资金回流 (T+14)
                    const payDay = d + 14;
                    if (payDay < MAX_SIM_DAYS) {
                        dailyCashChange[payDay] += revenueRMB;
                    }

                    // 3. 批次维度的统计
                    batchRevenueMap[batch.batchIdx] += revenueRMB;

                    // 4. 状态更新
                    batch.qty -= take;
                    currentInv -= take;
                    remainingDemand -= take;

                    if (batch.qty <= 0) inventoryQueue.shift();
                }
            }

            // D. 记录断货
            if (firstSaleDay !== null && d >= firstSaleDay && remainingDemand > 0.01) {
                dailyMissed[d] = true;
            }

            dailyInv[d] = currentInv;
        }

        // --- 4. 后处理：甘特图与曲线生成 ---

        // 生成 Gantt Items
        salesPeriods.forEach((p, i) => {
            const yKey = i.toString();
            if (p.start !== null && p.end !== null) {
                ganttSell.push({ x: [p.start, p.end], y: yKey, batchIdx: i, revenue: batchRevenueMap[i] });

                // Hold time
                if (p.arrival !== null && p.start > p.arrival) {
                    ganttHold.push({ x: [p.arrival, p.start], y: yKey, batchIdx: i, duration: p.start - p.arrival });
                }
            }
        });

        // 断货区间合并
        let stockoutStart = -1;
        if (firstSaleDay !== null) {
            for (let d = firstSaleDay; d < 365; d++) {
                if (dailyMissed[d]) {
                    if (stockoutStart === -1) stockoutStart = d;
                } else {
                    if (stockoutStart !== -1) {
                        // 结束一段断货
                        const gap = d - stockoutStart;
                        if (gap > 0) {
                            // 找到上一个结束的批次，把它放在那一行
                            // 简单起见，放在上一行的位置，或者如果没有上一行，放第一行
                            // 这里我们做一个简单的逻辑：寻找最近结束销售的批次
                            let bestBatchIdx = 0;
                            let maxEnd = -1;
                            salesPeriods.forEach((Sp, idx) => {
                                if (Sp.end !== null && Sp.end <= stockoutStart + 5 && Sp.end > maxEnd) {
                                    maxEnd = Sp.end;
                                    bestBatchIdx = idx;
                                }
                            });
                            ganttStockout.push({
                                x: [stockoutStart, d],
                                y: bestBatchIdx.toString(),
                                batchIdx: bestBatchIdx,
                                gapDays: gap
                            });
                        }
                        stockoutStart = -1;
                    }
                }
            }
        }

        // 资金曲线积分
        const cashPoints = [];
        const profitPoints = [];
        const invPoints = [];

        let runningCash = 0;
        let runningProfit = 0;
        let minCash = 0;
        let breakevenDay: number | null = null;
        let profitabilityDay: number | null = null;

        for (let d = 0; d < MAX_SIM_DAYS; d++) {
            const prevCash = runningCash;
            const prevProf = runningProfit;

            runningCash += dailyCashChange[d];
            runningProfit += dailyProfitChange[d];

            if (runningCash < minCash) minCash = runningCash;

            // Detect Zero Crossings
            if (breakevenDay === null && prevCash < 0 && runningCash >= 0 && d > 10) breakevenDay = d;
            if (profitabilityDay === null && prevProf < 0 && runningProfit >= 0 && d > 10) profitabilityDay = d;

            if (d <= 365) {
                cashPoints.push({ x: d, y: runningCash });
                profitPoints.push({ x: d, y: runningProfit });
                invPoints.push({ x: d, y: dailyInv[d] });
            }
        }

        // Add Annotations for Batch Return (回款完成)
        // 逻辑：当该批次带来的累计现金流转正? 或者简单点：标记该批次的销售结束点 + 14天
        salesPeriods.forEach((p, i) => {
            if (p.arrival !== null) {
                // 标记：该批次大致回款完毕的时间点 (销售结束+14)
                const endDay = p.end ? p.end + 14 : p.arrival + 60; // fallback
                const rev = batchRevenueMap[i];
                const b = params.batches[i];
                const log = params.logistics[b.type];
                const finalQty = Math.round(b.qty * (1 + (b.extraPercent || 0) / 100));
                const totalCost = finalQty * (params.global.unitCost + log.price);

                const isProfitable = rev > totalCost;

                // Color: Profit=Green, Loss=Red
                const color = isProfitable ? '#2ecc71' : '#e74c3c';
                const label = isProfitable ? `B${i + 1}盈` : `B${i + 1}亏`;

                if (endDay < MAX_SIM_DAYS) {
                    annotations[`ret_${i}`] = createBadge(endDay, color, [label, `¥${Math.round((rev - totalCost) / 1000)}k`], 30);
                }
            }
        });

        // Zero Line
        annotations['zero_line'] = {
            type: 'line', yMin: 0, yMax: 0, borderColor: '#71717a', borderWidth: 1, borderDash: [2, 2]
        };

        const totalStockoutDays = ganttStockout.reduce((sum, item) => sum + (item.gapDays || 0), 0);

        return {
            xMin: 0,
            xMax: 365,
            cashPoints,
            profitPoints,
            invPoints,
            ganttProd,
            ganttShip,
            ganttHold,
            ganttSell,
            ganttStockout,
            minCash: minCash,
            finalCash: runningCash,
            totalRevenue,
            totalNetProfit,
            roi: minCash !== 0 ? Math.abs(totalNetProfit / minCash) : 0,
            turnover: minCash !== 0 ? Math.abs(totalRevenue / minCash) : 0,
            breakevenDay,
            profitabilityDay,
            totalStockoutDays,
            annotations
        };

    }, [params]);
};
