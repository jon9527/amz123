import React, { useMemo } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Scatter, Area, Cell } from 'recharts';

import JCurveLogicDialog from './JCurveLogicDialog';

interface PromotionStrategyPanelProps {
    price: number;
    targetVolume: number;
    totalBudget: number;
    simCpc: number;
    simCvr: number;
    baseCostPerUnit: number; // Now excludes commission (matches HTML fixedCost)
    commissionRate: number; // NEW: For dynamic commission calculation
    viewMode?: 'curve' | 'matrix';
}

const PromotionStrategyPanel: React.FC<PromotionStrategyPanelProps> = ({
    price,
    targetVolume,
    totalBudget,
    simCpc,
    simCvr,
    baseCostPerUnit,
    commissionRate, // NEW
    viewMode = 'curve' // Default to curve if not specified
}) => {
    const [showLogicDialog, setShowLogicDialog] = React.useState(false);

    // 1. J-Curve Data (Cash Flow) - 3-Point Linear Model (Based on original logic)
    const jCurveData = useMemo(() => {
        const safe = { points: [], maxVal: 100, minVal: -100, trueMax: 100, gradientOffset: 0.5, profitAd: 0, profitOrg: 0, bePoint: null, troughPoint: null, finalPoint: null, ticksX: [], ticksY: [], xDomainMax: 100 };

        if (viewMode === 'matrix') return safe;

        // Strict Validation
        if (!Number.isFinite(targetVolume) || targetVolume <= 0) return safe;
        if (!Number.isFinite(simCvr) || simCvr <= 0) return safe;
        if (!Number.isFinite(simCpc) || simCpc < 0) return safe;
        const safePrice = Number.isFinite(price) ? price : 0;
        const safeBaseCost = Number.isFinite(baseCostPerUnit) ? baseCostPerUnit : 0;

        // Core Calculation Logic (Matches HTML tool)
        const cpa = simCpc / (simCvr / 100);

        let adOrders = 0;
        if (cpa > 0.001) {
            adOrders = totalBudget / cpa; // Theoretical max ad orders
        }

        // Cap Ad Orders at Target Volume
        const realAdOrders = Math.min(adOrders, targetVolume);

        // Unit Profit Logic (MATCHES HTML EXACTLY - Line 1752-1754)
        // fixedCostPerUnit = fixedCost + (price * commRate)
        // baseCostPerUnit includes: Purchase + Logistics + FBA + Returns + STORAGE FEE (Critical User Request)
        const fixedCostPerUnit = safeBaseCost + (safePrice * commissionRate);
        const profitOrganic = safePrice - fixedCostPerUnit;

        // Ad Profit = Organic Profit - CPA
        const profitAd = profitOrganic - cpa;

        // Points Generation (Multi-Point Model for Stability)
        // Instead of just 3 points, we generate intermediate points to ensure the curve
        // renders predictably and the area fill respects the boundaries.

        const points = [];
        const segments = 50; // Increased resolution for smoother curve

        // segment 1: P0 (0,0) -> P1 (Ad End)
        const p1X = realAdOrders;
        const p1Y = realAdOrders * profitAd;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = t * p1X;
            const y = x * profitAd; // Linear descent
            // Only add if x > 0 to avoid dupe with next loop
            points.push({ x, y, label: i === segments ? '广告期结束' : '' });
        }

        // segment 2: P1 -> P2 (Final)
        const organicQty = targetVolume - realAdOrders;
        if (organicQty > 0) {
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const x = p1X + (t * organicQty);
                // y = Base + (CurrentOrganicVol * OrganicProfit)
                const y = p1Y + ((x - p1X) * profitOrganic);
                points.push({ x, y, label: i === segments ? '最终预估' : '' });
            }
        }

        // Break Even Point Calculation (Linear Interpolation)
        let bePoint = null;
        if (p1Y < 0) {
            // Find where it crosses 0
            if (profitOrganic > 0.001) {
                const dist = Math.abs(p1Y) / profitOrganic;
                const beX = p1X + dist;
                if (beX <= targetVolume) {
                    bePoint = { x: beX, y: 0, label: '回本点' };
                    // CRITICAL: Add BEP to points array to ensure Tooltip picks up the label
                    // even if user hovers the Line and not the Scatter dot.
                    points.push(bePoint);
                }
            }
        }

        // Sort points by X to ensure correct Line path and Tooltip traversing
        points.sort((a, b) => a.x - b.x);

        const troughPoint = {
            x: p1X,
            y: p1Y,
            color: profitAd < 0 ? '#ef4444' : '#10b981',
            label: profitAd < 0 ? '最大资金投入' : '广告期结束'
        };

        // Final Point (Target Reached)
        const finalPoint = {
            x: targetVolume,
            y: points[points.length - 1].y,
            label: '目标达成'
        };

        // Dynamic Domain Calculation
        const allY = points.map(p => p.y);
        const minY = Math.min(0, ...allY);
        const maxY = Math.max(0, ...allY);

        const xDomainMax = Math.max(100, Math.ceil(targetVolume / 10) * 10);
        const ticksX = [];
        for (let i = 0; i <= xDomainMax; i += 10) { // Step 10
            ticksX.push(i);
        }

        const yMinRound = Math.floor(minY / 20) * 20 - 20; // Padding
        const yMaxRound = Math.ceil(maxY / 20) * 20 + 20;

        const ticksY = [];
        for (let i = yMinRound; i <= yMaxRound; i += 20) {
            ticksY.push(i);
        }

        // Gradient Offset
        let off = 0;
        if ((yMaxRound - yMinRound) > 0.001) {
            off = yMaxRound / (yMaxRound - yMinRound);
        }

        off = Math.max(0, Math.min(1, off));

        return {
            points,
            bePoint,
            troughPoint,
            finalPoint, // Return final point
            trueMax: yMaxRound,
            minVal: yMinRound,
            gradientOffset: off,
            profitAd,
            profitOrg: profitOrganic,
            ticksX,
            ticksY,
            xDomainMax
        };
    }, [price, targetVolume, totalBudget, simCpc, simCvr, baseCostPerUnit, commissionRate, viewMode]);

    // 2. Sweet Spot Matrix (Sensitivity) - Multi-Scenario "Traffic Model"
    const sensitivityData = useMemo(() => {
        const safe = { data: [], maxProfit: 0, minProfit: 0, maxSales: 0 };
        if (viewMode === 'curve') return safe;

        // Strict Input Cleaning to Prevent NaN
        // Force defaults if missing/zero to allow chart to try rendering
        const _cpc = (Number.isFinite(simCpc) && simCpc > 0) ? simCpc : 1.0;
        const _cvr = (Number.isFinite(simCvr) && simCvr > 0) ? simCvr : 10;
        const _price = (Number.isFinite(price) && price > 0) ? price : 0;
        const _budget = Number.isFinite(totalBudget) ? totalBudget : 0;
        const _target = (Number.isFinite(targetVolume) && targetVolume > 0) ? targetVolume : 100;
        const _baseCost = Number.isFinite(baseCostPerUnit) ? baseCostPerUnit : 0;
        const _commRate = Number.isFinite(commissionRate) ? commissionRate : 0.15;

        // Logic check: If Price is 0, we can't really do much, but let's render 0 profit.
        // if (_price <= 0) return safe; 

        const steps = [];
        const start = 0.1;
        const end = Math.max(_cpc * 3.0, 4.0);

        for (let c = start; c <= end; c += 0.1) {
            steps.push(parseFloat(c.toFixed(2)));
        }

        if (!steps.some(s => Math.abs(s - _cpc) < 0.01)) {
            steps.push(_cpc);
            steps.sort((a, b) => a - b);
        }

        // --- Model Parameters ---
        const currentCpa = _cpc / (_cvr / 100);
        const currentBudgetOrders = currentCpa > 0 ? (_budget / currentCpa) : 0;

        const currentAdOrders = Math.min(currentBudgetOrders, _target);
        const baseOrganicOrders = Math.max(0, _target - currentAdOrders);

        // Traffic Model
        const marketPotential = _target * 1.5;
        const refCpc = _cpc;

        let maxProfit = -Infinity;
        let minProfit = Infinity;
        let maxSales = 0;
        let bestCpc = 0;

        const data = steps.map(cpc => {
            // A. Win Rate
            const x = (cpc - refCpc) / refCpc;
            const k = 4;
            let winRate = 1 / (1 + Math.exp(-k * x));
            if (isNaN(winRate)) winRate = 0;

            // B. Two Ceilings
            const trafficCap = marketPotential * winRate;

            const cpa = cpc / (_cvr / 100);
            const budgetCap = cpa > 0.001 ? (_budget / cpa) : 0;

            const adOrders = Math.min(trafficCap, budgetCap);

            // C. Total Sales
            let totalSales = baseOrganicOrders + adOrders;

            // D. Financials
            const fixedCostPerUnit = _baseCost + (_price * _commRate);
            const organicProfitUnit = _price - fixedCostPerUnit;
            const adUnitProfit = organicProfitUnit - cpa;

            let totalProfit = (baseOrganicOrders * organicProfitUnit) + (adOrders * adUnitProfit);

            // NAN GUARD
            if (!Number.isFinite(totalProfit)) totalProfit = 0;
            if (!Number.isFinite(totalSales)) totalSales = 0;

            if (totalProfit > maxProfit) {
                maxProfit = totalProfit;
                bestCpc = cpc;
            }
            if (totalProfit < minProfit) minProfit = totalProfit;
            if (totalSales > maxSales) maxSales = totalSales;

            return {
                cpc,
                totalProfit,
                totalSales,
                adOrders: Number.isFinite(adOrders) ? adOrders : 0,
                organicOrders: baseOrganicOrders,
                isCurrent: Math.abs(cpc - _cpc) < 0.01,
                isBest: false
            };
        });

        // Mark Best
        data.forEach(d => {
            if (Math.abs(d.cpc - bestCpc) < 0.01) d.isBest = true;
        });

        // Check for empty boundaries again
        if (!Number.isFinite(maxProfit)) maxProfit = 0;
        if (!Number.isFinite(minProfit)) minProfit = 0;
        if (!Number.isFinite(maxSales)) maxSales = 0;

        return { data, maxProfit, minProfit, maxSales };
    }, [price, targetVolume, totalBudget, simCpc, simCvr, baseCostPerUnit, commissionRate, viewMode]);


    if (viewMode === 'curve') {
        // Render ONLY J-Curve
        return (
            <div className="bg-[#0c0c0e] border border-[#27272a] rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col h-full relative">
                <JCurveLogicDialog
                    isOpen={showLogicDialog}
                    onClose={() => setShowLogicDialog(false)}
                />

                <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4 justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-rose-500">show_chart</span>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-none">资金池消耗模拟</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowLogicDialog(true)}
                        className="p-1.5 text-zinc-500 hover:text-blue-400 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center border border-transparent hover:border-blue-900/50"
                        title="查看计算原理"
                    >
                        <span className="material-symbols-outlined text-sm">help</span>
                    </button>
                </div>

                <div className="flex-1 min-h-[300px] w-full relative bg-[#18181b] rounded-xl border border-zinc-800 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={jCurveData.points} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={true} horizontal={true} strokeOpacity={0.2} />
                            <XAxis
                                dataKey="x"
                                type="number"
                                domain={[0, jCurveData.xDomainMax]}
                                ticks={jCurveData.ticksX}
                                tick={{ fill: '#71717a', fontSize: 10 }}
                                tickFormatter={(v) => Math.round(v).toString()} // Show integers only
                                tickLine={false}
                                axisLine={{ stroke: '#3f3f46' }}
                                label={{ value: '累计销量 (Units)', position: 'insideBottom', offset: -10, fill: '#71717a', fontSize: 10 }}
                            />
                            <YAxis
                                domain={[jCurveData.minVal, jCurveData.trueMax]}
                                ticks={jCurveData.ticksY}
                                tick={{ fill: '#71717a', fontSize: 10 }}
                                tickLine={false}
                                axisLine={{ stroke: '#3f3f46' }}
                                tickFormatter={(v) => `$${v.toFixed(0)}`}
                                label={{ value: '资金池 ($)', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 10 }}
                            />
                            <Tooltip
                                cursor={{ stroke: '#fff', strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white text-zinc-900 border border-zinc-200 p-2 rounded shadow-xl text-xs font-bold">
                                                <div className="mb-1">销量: {d.x.toFixed(1)} Units</div>
                                                <div className={`${d.y >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    资金: ${d.y.toFixed(2)}
                                                </div>
                                                {d.label && <div className="text-[10px] text-orange-500 font-extrabold mt-1">{d.label}</div>}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine y={0} stroke="#71717a" strokeWidth={1} />

                            {/* Area Fill for Profit/Loss */}
                            {/* Force re-render of gradient by including offset in ID */}
                            <Area
                                type="monotoneX"
                                dataKey="y"
                                fill={`url(#splitColor-${viewMode}-${jCurveData.gradientOffset})`}
                                stroke="none"
                                baseValue={0}
                                isAnimationActive={false}
                            />
                            <defs>
                                <linearGradient id={`splitColor-${viewMode}-${jCurveData.gradientOffset}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset={jCurveData.gradientOffset} stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset={jCurveData.gradientOffset} stopColor="#f43f5e" stopOpacity={0.3} />
                                </linearGradient>
                            </defs>

                            {/* The Line */}
                            <Line
                                type="monotoneX"
                                dataKey="y"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                isAnimationActive={false}
                            />

                            {/* Trough/Knee Point - Simple Dot */}
                            {jCurveData.troughPoint && (
                                <Scatter
                                    data={[jCurveData.troughPoint]}
                                    fill={jCurveData.troughPoint.color}
                                    shape="circle"
                                    isAnimationActive={false}
                                >
                                    {/* Larger, solid dot */}
                                    <Cell key="trough" fill={jCurveData.troughPoint.color} stroke="none" />
                                </Scatter>
                            )}

                            {/* BEP Marker - Simple Dot */}
                            {jCurveData.bePoint && (
                                <ReferenceLine
                                    x={jCurveData.bePoint.x}
                                    stroke="#3b82f6"
                                    strokeDasharray="3 3"
                                    opacity={0.5}
                                />
                            )}
                            {jCurveData.bePoint && (
                                <Scatter
                                    data={[{ x: jCurveData.bePoint.x, y: 0, label: '回本点' }]}
                                    fill="#3b82f6"
                                    shape="circle"
                                    isAnimationActive={false}
                                >
                                    {/* Larger, solid dot */}
                                    <Cell key="bep" fill="#3b82f6" stroke="none" />
                                </Scatter>
                            )}

                            {/* Final Target Marker - Solid Green Dot */}
                            {jCurveData.finalPoint && (
                                <Scatter
                                    data={[jCurveData.finalPoint]}
                                    fill="#10b981"
                                    shape="circle"
                                    isAnimationActive={false}
                                >
                                    <Cell key="final" fill="#10b981" stroke="none" />
                                </Scatter>
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    // Default or 'matrix' mode
    // 3. Render Matrix Chart (Sales vs Profit)
    return (
        <div className="bg-[#0c0c0e] border border-[#27272a] rounded-3xl overflow-hidden shadow-2xl p-8 flex flex-col w-full animate-in slide-in-from-bottom-10 duration-700">
            <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-4 justify-center relative">
                <div className="text-center">
                    <h3 className="text-xl font-bold text-zinc-400 flex items-center justify-center gap-2">
                        ⚔️ 销量 vs 利润 (找准甜蜜点)
                    </h3>
                </div>
            </div>

            <div className="flex items-center justify-center gap-6 mb-6">
                {/* Legend */}
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#eab308]"></div>
                    <span className="text-sm font-bold text-zinc-400">最佳甜点 (Max Profit)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                    <span className="text-sm font-bold text-zinc-400">盈利区</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                    <span className="text-sm font-bold text-zinc-400">亏损区</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-[3px] border-[#8b5cf6] bg-transparent"></div>
                    <span className="text-sm font-bold text-zinc-400">预估销量</span>
                </div>
            </div>

            <div className="w-full h-[500px]">
                {sensitivityData.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={sensitivityData.data} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                            <XAxis
                                dataKey="cpc"
                                tick={{ fill: '#71717a', fontSize: 11, fontWeight: 'bold' }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                                interval={0}
                                tickFormatter={(v) => `$${v.toFixed(2)}`}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                                label={{ value: '模拟 CPC (低价无流量 -> 高价无预算)', position: 'insideBottom', offset: -10, fill: '#52525b', fontSize: 12 }}
                            />
                            {/* Left Axis: Profit - Dynamic Domain to handle negatives */}
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                domain={[
                                    Math.floor(sensitivityData.minProfit * 1.1),
                                    Math.ceil(Math.max(sensitivityData.maxProfit * 1.1, 100))
                                ]}
                                tick={{ fill: '#71717a', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${v.toFixed(0)}`}
                                label={{ value: '总净利润 ($)', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 12, fontWeight: 'bold' }}
                            />
                            {/* Right Axis: Sales Volume */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, Math.ceil(Math.max(sensitivityData.maxSales * 1.1, 10))]}
                                tick={{ fill: '#71717a', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                label={{ value: '销量 (Units)', angle: 90, position: 'insideRight', fill: '#71717a', fontSize: 12, fontWeight: 'bold' }}
                            />

                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-2xl min-w-[180px]">
                                                <div className="flex justify-between items-center mb-3 border-b border-zinc-800 pb-2">
                                                    <span className="text-xs font-bold text-zinc-500">模拟 CPC</span>
                                                    <span className="text-lg font-black text-white font-mono">${d.cpc.toFixed(2)}</span>
                                                    {d.isBest && <span className="ml-2 text-[10px] bg-yellow-500 text-black px-1.5 rounded font-bold">SWEET SPOT</span>}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between">
                                                        <span className="text-xs text-zinc-500">总净利润</span>
                                                        <span className={`text-sm font-black font-mono ${d.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${d.totalProfit.toFixed(1)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-xs text-zinc-500">预估销量</span>
                                                        <span className="text-xs font-bold text-purple-400 font-mono">{d.totalSales.toFixed(1)} Units</span>
                                                    </div>
                                                    <div className="flex justify-between pt-2 border-t border-zinc-900">
                                                        <span className="text-[10px] text-zinc-600">广告单量</span>
                                                        <span className="text-[10px] text-zinc-400">{d.adOrders.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            {/* Profit Bars */}
                            <Bar yAxisId="left" dataKey="totalProfit" barSize={30} radius={[4, 4, 4, 4]}>
                                {
                                    sensitivityData.data.map((entry, index) => {
                                        let fillColor = entry.totalProfit >= 0 ? '#10b981' : '#ef4444'; // Green or Red
                                        if (entry.isBest) fillColor = '#eab308'; // Yellow for Sweet Spot

                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={fillColor}
                                                stroke={entry.isCurrent ? '#fff' : 'none'}
                                                strokeWidth={entry.isCurrent ? 2 : 0}
                                                strokeDasharray={entry.isCurrent ? '4 2' : '0'}
                                            />
                                        )
                                    })
                                }
                            </Bar>

                            {/* Sales Line */}
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="totalSales"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2, fill: '#18181b', stroke: '#8b5cf6' }}
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                isAnimationActive={false}
                            />

                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <span className="material-symbols-outlined text-4xl mb-2">data_info_alert</span>
                        <p>请输入有效的 CVR, 价格 和 预算 以查看分析</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PromotionStrategyPanel;
