
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ProfitModelService } from '../services/profitModelService';
import { SavedProfitModel } from '../types';
import PromotionProfitChart from '../components/PromotionProfitChart';

const r2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;
const fmtUSD = (num: number) => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (num: number) => (num * 100).toFixed(1) + '%';

// --- Styled Stepper Input Component ---
const INPUT_H = "h-[24px]"; // Compact for cards
const CONTAINER_CLASS = `w-full bg-[#0d0d0f] border border-[#27272a] rounded-lg flex items-center justify-center relative transition-all focus-within:border-zinc-500 overflow-hidden group`;
const INPUT_CLASS = "bg-transparent border-none text-[11px] font-black text-white text-center w-full h-full outline-none focus:ring-0 p-0 font-mono leading-none";

const StepperInput = ({ value, onChange, step = 1, min = 0, disabled = false, color = 'white' }: { value: number, onChange: (v: number) => void, step?: number, min?: number, disabled?: boolean, color?: string }) => {
    const [displayValue, setDisplayValue] = useState<string>(value.toString());

    useEffect(() => {
        const parsed = parseFloat(displayValue);
        if (parsed !== value && !isNaN(parsed)) {
            setDisplayValue(value.toString());
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        let val = e.target.value;
        if (val === '') { setDisplayValue(''); onChange(min); return; }
        if (!/^\d*\.?\d*$/.test(val)) return;
        setDisplayValue(val);
        const num = parseFloat(val);
        if (!isNaN(num)) onChange(Math.max(min, num));
    };

    const handleBlur = () => {
        if (disabled) return;
        if (displayValue === '' || isNaN(parseFloat(displayValue))) {
            setDisplayValue(min.toString()); onChange(min);
        } else {
            const num = parseFloat(displayValue);
            setDisplayValue(num.toString());
            onChange(Math.max(min, num));
        }
    };

    const textColorClass = disabled ? 'text-zinc-500' : (color === 'emerald' ? 'text-emerald-500' : 'text-white');

    return (
        <div className={`${CONTAINER_CLASS} ${INPUT_H} ${disabled ? 'bg-zinc-900/50 border-zinc-800 cursor-not-allowed' : ''}`}>
            <input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                className={`${INPUT_CLASS} ${textColorClass}`}
            />
            {!disabled && (
                <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none pr-0.5 bg-[#0d0d0f]">
                    <button
                        onClick={() => { const next = r2(value + step); onChange(next); setDisplayValue(next.toString()); }}
                        className="pointer-events-auto material-symbols-outlined text-[10px] text-zinc-500 hover:text-white leading-none scale-75 block h-[10px]"
                    >
                        expand_less
                    </button>
                    <button
                        onClick={() => { const next = r2(Math.max(min, value - step)); onChange(next); setDisplayValue(next.toString()); }}
                        className="pointer-events-auto material-symbols-outlined text-[10px] text-zinc-500 hover:text-white leading-none scale-75 block h-[10px]"
                    >
                        expand_more
                    </button>
                </div>
            )}
        </div>
    );
};

// --- DATA TYPES ---
interface MonthConfig {
    id: number;
    label: string;
    subLabel: string;
    dailyUnits: number;
    adShare: number; // %
    price: number;
    cvr: number; // %
    cpc: number;
}

const DEFAULT_MONTHS: MonthConfig[] = [
    { id: 1, label: 'M1', subLabel: '启动', dailyUnits: 10, adShare: 80, price: 14.99, cvr: 10, cpc: 1.50 },
    { id: 2, label: 'M2', subLabel: '成长', dailyUnits: 20, adShare: 60, price: 14.99, cvr: 10, cpc: 1.50 },
    { id: 3, label: 'M3', subLabel: '稳定', dailyUnits: 30, adShare: 50, price: 14.99, cvr: 10, cpc: 1.50 },
    { id: 4, label: 'M4', subLabel: '放量', dailyUnits: 40, adShare: 40, price: 14.99, cvr: 10, cpc: 1.20 },
    { id: 5, label: 'M5', subLabel: '盈利', dailyUnits: 50, adShare: 30, price: 14.99, cvr: 10, cpc: 1.20 },
    { id: 6, label: 'M6', subLabel: '成熟', dailyUnits: 60, adShare: 30, price: 14.99, cvr: 10, cpc: 1.20 },
];

const PromotionDeduction: React.FC = () => {
    // --- State: Data Source ---
    const [savedModels, setSavedModels] = useState<SavedProfitModel[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>('');
    const contentRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Dropdown State
    const [showDropdown, setShowDropdown] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // --- State: Dynamic Months ---
    const [months, setMonths] = useState<MonthConfig[]>(DEFAULT_MONTHS.slice(0, 3));

    // --- State: Supply Chain ---
    const [leadTime, setLeadTime] = useState<number>(45);

    // --- State: Commission Settings ---
    const [autoComm, setAutoComm] = useState<boolean>(true);
    const [manualComm, setManualComm] = useState<number>(15);

    // --- State: Base Data ---
    const [baseData, setBaseData] = useState({
        prod: 2.82, firstMile: 0.90, misc: 0, fba: 5.69, storage: 0,
        retRate: 0.1, unsellable: 0.2, retProc: 2.62, retRem: 2.24,
        planBProfit: 2.50, productName: 'Manual Mock'
    });

    // --- Load Models ---
    useEffect(() => {
        const models = ProfitModelService.getAll().sort((a, b) => b.timestamp - a.timestamp);
        setSavedModels(models);
        if (models.length > 0) {
            setSelectedModelId(models[0].id);
        }
    }, []);

    // Group models by product name
    const groupedModels = useMemo(() => {
        const groups: Record<string, SavedProfitModel[]> = {};
        savedModels.forEach(m => {
            const key = m.productName || '未分类';
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        return groups;
    }, [savedModels]);

    // Toggle group expand/collapse
    const toggleGroup = useCallback((groupName: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    }, []);

    // Get selected model for display
    const selectedModel = savedModels.find(m => m.id === selectedModelId);

    // --- Auto-fill ---
    useEffect(() => {
        const model = savedModels.find(m => m.id === selectedModelId);
        if (model) {
            const p = model.inputs;
            // 使用已保存的costProdUSD，确保汇率一致性
            const prodCostUSD = model.results.costProdUSD;

            setBaseData({
                prod: prodCostUSD,
                firstMile: p.shippingUSD,
                misc: p.miscFee,
                fba: p.fbaFee,
                storage: p.storageFee,
                retRate: p.returnRate / 100,
                unsellable: p.unsellableRate / 100,
                retProc: p.retProcFee,
                retRem: p.retRemFee,
                planBProfit: model.results.planB.profit,
                productName: model.productName
            });

            // Auto-fill Price for all months
            const actualPrice = model.inputs.actualPrice;
            setMonths(prev => prev.map(m => ({ ...m, price: actualPrice })));

            // Auto-fill Commission Settings
            setAutoComm(model.inputs.autoComm);
            setManualComm(model.inputs.manualComm);
        }
    }, [selectedModelId, savedModels]);

    // --- State Management Helpers ---
    const updateMonth = (index: number, field: keyof MonthConfig, val: number) => {
        setMonths(prev => {
            const newMonths = [...prev];
            newMonths[index] = { ...newMonths[index], [field]: val };
            // Simple update, no cascading logic for now to keep it predictable
            return newMonths;
        });
    };

    const addMonth = () => {
        setMonths(prev => {
            if (prev.length >= 6) return prev; // Limit to 6
            const last = prev[prev.length - 1];
            const nextId = prev.length + 1;
            return [...prev, {
                ...last,
                id: nextId,
                label: `M${nextId}`,
                subLabel: '延续',
            }];
        });
    };

    const removeMonth = () => {
        if (months.length <= 1) return; // Limit to 1
        setMonths(prev => prev.slice(0, -1));
    };


    // --- CALCULATION LOGIC ---

    // 1. Commission
    const getCommRate = (price: number) => {
        if (!autoComm) return manualComm / 100;
        if (price > 20) return 0.17;
        if (price >= 15) return 0.10;
        return 0.05;
    };

    // 2. Return Cost
    const getReturnCost = (price: number, comm: number) => {
        const adminFee = Math.min(5.00, comm * 0.20);
        const lossSellable = baseData.retProc + adminFee + baseData.fba;
        const lossUnsellable = lossSellable + baseData.prod + baseData.firstMile + baseData.retRem;
        const weightedLoss = (lossSellable * (1 - baseData.unsellable)) + (lossUnsellable * baseData.unsellable);
        return weightedLoss * baseData.retRate;
    };

    // 3. Monthly Calculation Wrapper
    const calculateMonthResult = (m: MonthConfig) => {
        const days = 30;
        const totalUnits = m.dailyUnits * days;
        const adUnits = Math.ceil(totalUnits * (m.adShare / 100));
        const orgUnits = totalUnits - adUnits;

        // Dynamic Unit Economics
        const mComm = m.price * getCommRate(m.price);
        const mRet = getReturnCost(m.price, mComm);
        const mTotalCOGS = baseData.prod + baseData.firstMile + baseData.misc + baseData.fba + baseData.storage + mComm + mRet;
        const mGrossOrganic = m.price - mTotalCOGS;
        const mCpa = (m.cvr > 0) ? m.cpc / (m.cvr / 100) : 0;
        const mNetAd = mGrossOrganic - mCpa;

        const revenue = totalUnits * m.price;
        const spend = adUnits * mCpa;

        const totalProfit = (orgUnits * mGrossOrganic) + (adUnits * mNetAd);
        const tacos = revenue > 0 ? (spend / revenue) : 0;

        return {
            ...m,
            res: {
                totalUnits, adUnits, revenue, spend, totalProfit, tacos,
                unit: {
                    price: m.price, prod: baseData.prod, firstMile: baseData.firstMile, misc: baseData.misc,
                    fba: baseData.fba, storage: baseData.storage, comm: mComm, ret: mRet, cpa: mCpa,
                    grossOrganic: mGrossOrganic, netAd: mNetAd
                }
            }
        };
    };

    const evaluatedMonths = months.map(calculateMonthResult);
    const lastMonth = evaluatedMonths[evaluatedMonths.length - 1];

    // 4. Aggregates
    const totalPromoPeriod = evaluatedMonths.reduce((acc, curr) => ({
        units: acc.units + curr.res.totalUnits,
        revenue: acc.revenue + curr.res.revenue,
        spend: acc.spend + curr.res.spend,
        profit: acc.profit + curr.res.totalProfit,
    }), { units: 0, revenue: 0, spend: 0, profit: 0 });

    // 5. Recovery (Filling the Hole)
    const planBProfit = baseData.planBProfit || 1.0;
    let recoveryUnits = 0;
    let recoveryDays = 0;
    if (totalPromoPeriod.profit < 0 && planBProfit > 0) {
        recoveryUnits = Math.ceil(Math.abs(totalPromoPeriod.profit) / planBProfit);
        if (lastMonth.dailyUnits > 0) {
            recoveryDays = Math.ceil(recoveryUnits / lastMonth.dailyUnits);
        }
    }

    // 6. Supply Chain - Batch Shipment Calculation
    const leadTimeDays = leadTime;
    const leadTimeMonths = Math.ceil(leadTimeDays / 30);

    // Calculate batches based on promotion months
    const totalMonths = evaluatedMonths.length;

    // First batch: covers enough time for lead time + buffer
    // Typically first 2 months or (leadTimeMonths + 1), whichever is larger
    const firstBatchMonths = Math.min(Math.max(2, leadTimeMonths + 1), totalMonths);
    const firstBatchUnits = evaluatedMonths
        .slice(0, firstBatchMonths)
        .reduce((sum, m) => sum + m.res.totalUnits, 0);

    // Pipeline stock: sales during next lead time (based on next month's daily rate)
    const nextMonthDailyUnits = firstBatchMonths < totalMonths
        ? evaluatedMonths[firstBatchMonths].dailyUnits
        : lastMonth.dailyUnits;
    const pipelineStock = Math.ceil(nextMonthDailyUnits * leadTimeDays);

    // First shipment = first batch sales + pipeline buffer
    const firstShipment = firstBatchUnits + pipelineStock;

    // Second batch (if more months exist)
    const remainingMonths = totalMonths - firstBatchMonths;
    const secondBatchUnits = remainingMonths > 0
        ? evaluatedMonths.slice(firstBatchMonths).reduce((sum, m) => sum + m.res.totalUnits, 0) + pipelineStock
        : 0;

    // Total and capital
    const landedCost = baseData.prod + baseData.firstMile + baseData.misc;
    const firstShipmentCapital = firstShipment * landedCost;
    const maxCapitalExposure = firstShipmentCapital + (totalPromoPeriod.profit < 0 ? Math.abs(totalPromoPeriod.profit) : 0);

    // 7. Promotion Efficiency Metrics
    const overallTACoS = totalPromoPeriod.revenue > 0 ? (totalPromoPeriod.spend / totalPromoPeriod.revenue) * 100 : 0;
    const promoROI = totalPromoPeriod.spend > 0 ? (totalPromoPeriod.profit / totalPromoPeriod.spend) * 100 : 0;

    // TACoS trend per month
    const tacosTrend = evaluatedMonths.map(m => ({
        label: m.label,
        tacos: m.res.tacos * 100,
        adShare: m.adShare
    }));

    // Key milestones
    const healthyTacosMonth = tacosTrend.find(t => t.tacos <= 15);
    const lowAdShareMonth = tacosTrend.find(t => t.adShare <= 50);
    const firstProfitMonth = evaluatedMonths.find(m => m.res.totalProfit > 0);

    // Ad spend efficiency
    const avgCPA = totalPromoPeriod.units > 0 ? totalPromoPeriod.spend / (totalPromoPeriod.units * (evaluatedMonths.reduce((sum, m) => sum + m.adShare, 0) / evaluatedMonths.length / 100)) : 0;

    // Export PDF - 使用 onclone 修复 input 渲染问题
    const handleExportPDF = async () => {
        if (!contentRef.current || isExporting) return;
        setIsExporting(true);
        try {
            const element = contentRef.current;

            // 临时保存原始样式
            const originalStyle = element.style.cssText;
            const originalOverflow = document.body.style.overflow;

            // 临时移除高度限制，确保完整捕获
            element.style.overflow = 'visible';
            element.style.height = 'auto';
            element.style.maxHeight = 'none';
            document.body.style.overflow = 'visible';

            // 等待重新渲染
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(element, {
                backgroundColor: '#0a0a0b',
                scale: 2,
                useCORS: true,
                logging: false,
                allowTaint: true,
                foreignObjectRendering: false,
                onclone: (clonedDoc) => {
                    // 1. 添加全局样式修复
                    const style = clonedDoc.createElement('style');
                    style.innerHTML = `
                        /* 禁用动画 */
                        * {
                            animation: none !important;
                            transition: none !important;
                        }
                        /* 隐藏导出/导入按钮 */
                        .export-actions {
                            display: none !important;
                        }
                        /* 隐藏呼吸灯动画 */
                        .animate-ping {
                            display: none !important;
                        }
                        /* 隐藏 stepper 按钮 */
                        .group > div[class*="absolute"] {
                            display: none !important;
                        }
                    `;
                    clonedDoc.head.appendChild(style);

                    // 2. 将所有 input 替换为纯文本 - 不使用负 margin
                    const inputs = clonedDoc.querySelectorAll('input');
                    inputs.forEach((input) => {
                        const value = input.value || '';
                        const container = input.parentElement;

                        if (container instanceof HTMLElement) {
                            // 设置容器为 flex 居中
                            container.style.display = 'flex';
                            container.style.alignItems = 'center';
                            container.style.justifyContent = 'center';
                            container.style.overflow = 'visible';
                            // 用 padding-bottom 实现视觉上移（增加到 6px）
                            container.style.paddingBottom = '6px';

                            // 创建替换文本
                            const textSpan = clonedDoc.createElement('span');
                            textSpan.textContent = value;
                            textSpan.style.cssText = `
                                font-size: 11px;
                                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                                font-weight: 900;
                                color: #ffffff;
                                line-height: 1;
                            `;

                            // 替换 input
                            container.replaceChild(textSpan, input);
                        }
                    });

                    // 3. 修复 label - 确保完全可见
                    const labels = clonedDoc.querySelectorAll('label');
                    labels.forEach((label) => {
                        if (label instanceof HTMLElement) {
                            label.style.overflow = 'visible';
                            label.style.lineHeight = '1.3';
                            // 用 padding-bottom 实现视觉上移（增加到 5px）
                            label.style.paddingBottom = '5px';
                            // 确保父容器也可见
                            if (label.parentElement instanceof HTMLElement) {
                                label.parentElement.style.overflow = 'visible';
                            }
                        }
                    });

                    // 4. 修复阶段标签（启动、成长、稳定、延续等）- 小圆角标签
                    const badgeSpans = clonedDoc.querySelectorAll('span[class*="rounded"]');
                    badgeSpans.forEach((badge) => {
                        if (badge instanceof HTMLElement) {
                            badge.style.paddingBottom = '8px';
                        }
                    });
                }
            });

            // 恢复原始样式
            element.style.cssText = originalStyle;
            document.body.style.overflow = originalOverflow;

            const imgData = canvas.toDataURL('image/jpeg', 0.9);

            // 使用原始 canvas 尺寸
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            const pdf = new jsPDF({
                orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
                unit: 'px',
                format: [imgWidth, imgHeight],
                compress: true
            });

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            const model = savedModels.find(m => m.id === selectedModelId);
            const fileName = `推广推演_${model?.productName || 'export'}_${new Date().toLocaleDateString()}.pdf`;
            pdf.save(fileName);
        } catch (err) {
            console.error('PDF export failed:', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div ref={contentRef} className="p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black tracking-tight text-white">推广策略推演</h2>
                <div className="flex justify-between items-center">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Dynamic Traffic & Budget Simulation</p>

                    {/* Current Model Indicator + Data Source Selector */}
                    <div className="flex items-center gap-3">
                        {/* Current Model Indicator with breathing light */}
                        {selectedModel && (
                            <div className="flex items-center gap-2.5 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                                </span>
                                <span className="text-xs text-zinc-400">当前方案:</span>
                                <span className="text-sm font-bold text-white">{selectedModel.productName}</span>
                                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-medium">
                                    {selectedModel.label || '无标签'}
                                </span>
                                <span className="text-sm font-black font-mono text-zinc-300">${selectedModel.inputs.actualPrice}</span>
                                <span className={`text-[10px] font-bold flex items-center gap-0.5 ${(selectedModel.results?.planB?.margin ?? 0) * 100 >= 20 ? 'text-emerald-400' : (selectedModel.results?.planB?.margin ?? 0) * 100 >= 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                    {((selectedModel.results?.planB?.margin ?? 0) * 100).toFixed(1)}%
                                </span>
                            </div>
                        )}

                        <div className="export-actions flex items-center gap-3">
                            {/* Export PDF Button */}
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-2.5 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                <span className="text-sm font-bold">导出 PDF</span>
                            </button>

                            {/* Data Source Selector - Custom Grouped Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="flex items-center gap-3 bg-[#0c0c0e] border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-2.5 shadow-lg transition-colors"
                                >
                                    <span className="material-symbols-outlined text-blue-500 text-lg">description</span>
                                    <span className="text-sm font-bold text-white">导入数据</span>
                                    <span className="material-symbols-outlined text-zinc-500 text-sm">{showDropdown ? 'expand_less' : 'expand_more'}</span>
                                </button>
                                {/* Dropdown Panel */}
                                {showDropdown && (
                                    <div
                                        className="absolute right-0 mt-2 w-[320px] bg-[#111111] border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                        onMouseLeave={() => setShowDropdown(false)}
                                    >
                                        <div className="max-h-[360px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                            {!savedModels.length && (
                                                <div className="px-4 py-3 text-sm text-zinc-500">无已保存模型</div>
                                            )}

                                            {Object.keys(groupedModels).map(groupName => {
                                                const groupItems = groupedModels[groupName];
                                                const isExpanded = expandedGroups[groupName];

                                                return (
                                                    <div key={groupName} className="border-b border-zinc-800/50 last:border-0">
                                                        {/* Group Header */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleGroup(groupName); }}
                                                            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-zinc-500 material-symbols-outlined transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>chevron_right</span>
                                                                <span className="text-xs font-bold text-zinc-300 group-hover:text-white">{groupName}</span>
                                                                <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 rounded-full">{groupItems.length}</span>
                                                            </div>
                                                        </button>

                                                        {/* Group Content */}
                                                        {isExpanded && (
                                                            <div className="bg-zinc-900/30 pb-1">
                                                                {groupItems.map(model => {
                                                                    const marginPct = (model.results?.planB?.margin ?? 0) * 100;
                                                                    const marginColor = marginPct >= 20 ? 'text-emerald-400' : marginPct >= 10 ? 'text-yellow-400' : 'text-red-400';
                                                                    const isSelected = model.id === selectedModelId;

                                                                    return (
                                                                        <button
                                                                            key={model.id}
                                                                            className={`w-full text-left pl-9 pr-4 py-2 hover:bg-zinc-800 transition-colors flex items-center justify-between border-l-2 ml-1 ${isSelected ? 'bg-blue-900/20 border-blue-500' : 'border-transparent hover:border-blue-500/50'}`}
                                                                            onClick={() => { setSelectedModelId(model.id); setShowDropdown(false); }}
                                                                        >
                                                                            <span className={`text-[10px] ${isSelected ? 'bg-blue-500/30 text-blue-300' : 'bg-blue-500/15 text-blue-400'} border border-blue-500/20 px-1.5 py-0.5 rounded font-medium truncate max-w-[110px]`}>
                                                                                {model.label || '无标签'}
                                                                            </span>
                                                                            <div className="flex items-center gap-4">
                                                                                <span className="text-sm font-black font-mono text-zinc-300 w-16 text-right">
                                                                                    ${model.inputs.actualPrice}
                                                                                </span>
                                                                                <span className={`text-[10px] font-bold ${marginColor} flex items-center gap-0.5 w-14`}>
                                                                                    <span className="material-symbols-outlined text-[12px]">trending_up</span>
                                                                                    {marginPct.toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* --- MAIN SECTION --- */}
                <div className="flex flex-col gap-8">
                    <div className="space-y-6">

                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600/10 p-2 rounded-lg">
                                    <span className="material-symbols-outlined text-blue-500">calendar_month</span>
                                </div>
                                <h3 className="text-xl font-black text-white">阶段性推广计划 ({evaluatedMonths.length}个月)</h3>
                            </div>

                            {/* Dynamic Month Controls */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={removeMonth}
                                    disabled={months.length <= 1}
                                    className="flex items-center gap-1 bg-zinc-900 hover:bg-red-900/30 text-zinc-400 hover:text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-sm">remove</span>
                                    <span>减少月份</span>
                                </button>
                                <button
                                    onClick={addMonth}
                                    disabled={months.length >= 6}
                                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    <span>增加月份</span>
                                </button>
                            </div>
                        </div>

                        {/* Month Cards Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
                            {evaluatedMonths.map((m, idx) => (
                                <div key={idx} className="bg-[#111111] border border-[#27272a] rounded-xl p-3 hover:border-blue-500/30 transition-colors shadow-lg animate-in zoom-in-95 duration-300">
                                    <div className="flex justify-between items-center mb-3 border-b border-zinc-800 pb-2">
                                        <span className="font-black text-white text-sm">{m.label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{m.subLabel}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-600 mb-0.5 block text-center">售价</label>
                                                <StepperInput value={m.price} onChange={(v) => updateMonth(idx, 'price', v)} step={0.10} />
                                            </div>
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-600 mb-0.5 block text-center">日销</label>
                                                <StepperInput value={m.dailyUnits} onChange={(v) => updateMonth(idx, 'dailyUnits', v)} step={1} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-600 mb-0.5 block text-center">CVR%</label>
                                                <StepperInput value={m.cvr} onChange={(v) => updateMonth(idx, 'cvr', v)} step={0.1} />
                                            </div>
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-zinc-600 mb-0.5 block text-center">CPC</label>
                                                <StepperInput value={m.cpc} onChange={(v) => updateMonth(idx, 'cpc', v)} step={0.05} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[9px] uppercase font-bold text-zinc-600 mb-0.5 block text-center">广告%</label>
                                                    <StepperInput value={m.adShare} onChange={(v) => updateMonth(idx, 'adShare', v)} step={5} />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] uppercase font-bold text-zinc-600 mb-0.5 block text-center">自然%</label>
                                                    <StepperInput value={100 - m.adShare} onChange={() => { }} disabled={true} color="emerald" />
                                                </div>
                                            </div>
                                            <div className="w-full bg-zinc-800 h-0.5 mt-2 rounded-full overflow-hidden flex">
                                                <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${m.adShare}%` }}></div>
                                                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${100 - m.adShare}%` }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-dashed border-zinc-800">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="text-zinc-300">售价 Revenue</span>
                                                <span className="font-mono text-white font-bold">{fmtUSD(m.res.unit.price)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                <span>- 采购成本</span>
                                                <span>{fmtUSD(m.res.unit.prod)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                <span>- 头程</span>
                                                <span>{fmtUSD(m.res.unit.firstMile)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                <span>- 杂费</span>
                                                <span>{fmtUSD(m.res.unit.misc)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                <span>- FBA配送</span>
                                                <span>{fmtUSD(m.res.unit.fba)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                <span>- 仓储费</span>
                                                <span>{fmtUSD(m.res.unit.storage)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                <span>- 销售佣金</span>
                                                <span>{fmtUSD(m.res.unit.comm)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                                                <span>- 退货损耗</span>
                                                <span>{fmtUSD(m.res.unit.ret)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-orange-500 font-bold">
                                                <span>- 获客成本 (CPA)</span>
                                                <span>{fmtUSD(m.res.unit.cpa)}</span>
                                            </div>

                                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5 text-center mt-2">
                                                <div className="text-[9px] text-emerald-600 font-bold">= 单品毛利 (自然单)</div>
                                                <div className="text-sm font-black text-emerald-500 font-mono">{fmtUSD(m.res.unit.grossOrganic)}</div>
                                            </div>

                                            <div className="bg-red-500/10 border border-red-500/20 rounded p-1.5 text-center mt-2">
                                                <div className="text-[9px] text-red-500/80 font-bold">= 单品净盈亏 (100%广告单)</div>
                                                <div className="text-sm font-black text-red-500 font-mono">{fmtUSD(m.res.unit.netAd)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-zinc-800">
                                        <div className="text-center mb-3">
                                            <div className="text-[10px] text-zinc-500 mb-0.5">月广告费</div>
                                            <div className="text-xl font-black text-slate-300 font-mono leading-none mb-1">{fmtUSD(m.res.spend)}</div>
                                            <div className="text-[10px] text-zinc-500">TACoS: {fmtPct(m.res.tacos)}</div>
                                        </div>

                                        <div className={`rounded-lg p-2 text-center ${m.res.totalProfit >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                            <div className={`text-[11px] font-bold mb-0.5 ${m.res.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>月净盈亏 (Net)</div>
                                            <div className={`text-xl font-black font-mono leading-none mb-1 ${m.res.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmtUSD(m.res.totalProfit)}</div>
                                            <div className="text-[10px] text-zinc-500/80">(总毛利 - 广告费)</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary Bar */}
                        <div className="bg-zinc-900 border border-[#27272a] rounded-2xl p-6 grid grid-cols-2 md:grid-cols-5 gap-6">
                            {[
                                { l: '总销量 (Units)', v: totalPromoPeriod.units, c: 'text-white' },
                                { l: '总销售额 (Revenue)', v: fmtUSD(totalPromoPeriod.revenue), c: 'text-white' },
                                { l: '总广告费 (Spend)', v: fmtUSD(totalPromoPeriod.spend), c: 'text-orange-400' },
                                { l: '推广期总盈亏', v: fmtUSD(totalPromoPeriod.profit), c: totalPromoPeriod.profit >= 0 ? 'text-emerald-500' : 'text-red-500', big: true },
                                {
                                    l: '综合 ROI',
                                    v: (totalPromoPeriod.spend > 0 ? (totalPromoPeriod.profit / totalPromoPeriod.spend).toFixed(2) : '0.00'),
                                    c: (totalPromoPeriod.spend > 0 && totalPromoPeriod.profit > 0) ? 'text-emerald-500' : (totalPromoPeriod.spend > 0 && totalPromoPeriod.profit < 0) ? 'text-red-500' : 'text-zinc-400',
                                    sub: (totalPromoPeriod.spend > 0 && totalPromoPeriod.profit > 0) ? '盈利' : (totalPromoPeriod.spend > 0 && totalPromoPeriod.profit < 0) ? '亏损' : '持平'
                                }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center text-center">
                                    <span className="text-[10px] uppercase font-bold text-zinc-500 mb-1">{item.l}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono font-black ${item.c} ${item.big ? 'text-2xl' : 'text-xl'} `}>{item.v}</span>
                                        {item.sub && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.c.replace('text-', 'bg-')}/10 ${item.c}`}>{item.sub}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bottom Analysis: Recovery & Supply */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Promotion Profit Chart */}
                            <PromotionProfitChart
                                monthlyProfits={evaluatedMonths.map(m => m.res.totalProfit)}
                            />

                            {/* Supply Box */}
                            <div className="bg-[#111111] border border-[#27272a] rounded-2xl p-6 relative overflow-hidden">
                                <h4 className="text-base font-black text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-500">inventory_2</span>
                                    供应链 & 推广效率
                                </h4>

                                <div className="space-y-4">
                                    {/* Lead Time Input */}
                                    <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded-lg">
                                        <span className="text-xs font-bold text-zinc-500">备货周期 (Lead Time)</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={leadTime}
                                                onChange={e => setLeadTime(Number(e.target.value))}
                                                className="w-16 bg-zinc-800 border-none rounded text-xs font-bold text-white text-center py-1"
                                            />
                                            <span className="text-xs text-zinc-500">天</span>
                                        </div>
                                    </div>

                                    {/* Stock Calculation - Batch Model */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-zinc-500 text-[11px]">
                                            <span>第一批销量 (M1-M{firstBatchMonths})</span>
                                            <span className="font-mono font-bold text-white">{firstBatchUnits.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-zinc-500 text-[11px]">
                                            <span>管道库存 ({leadTime}天)</span>
                                            <span className="font-mono font-bold text-white">{pipelineStock.toLocaleString()}</span>
                                        </div>
                                        <div className="h-px bg-zinc-800 my-1" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-blue-400">🚢 首批发货</span>
                                            <span className="text-lg font-black text-blue-400 font-mono">{firstShipment.toLocaleString()}</span>
                                        </div>

                                        {secondBatchUnits > 0 && (
                                            <div className="flex justify-between items-center text-zinc-500 text-[11px] mt-1">
                                                <span>📦 第二批 (M{firstBatchMonths + 1}-M{totalMonths})</span>
                                                <span className="font-mono font-bold text-orange-400">{secondBatchUnits.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Efficiency Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-2 mt-3">
                                        {/* Overall TACoS */}
                                        <div className={`rounded-lg p-2.5 text-center ${overallTACoS <= 15 ? 'bg-emerald-900/20 border border-emerald-500/20' : overallTACoS <= 30 ? 'bg-yellow-900/20 border border-yellow-500/20' : 'bg-red-900/20 border border-red-500/20'}`}>
                                            <div className="text-[9px] text-zinc-400 font-bold uppercase mb-0.5">整体 TACoS</div>
                                            <div className={`text-lg font-black font-mono ${overallTACoS <= 15 ? 'text-emerald-400' : overallTACoS <= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                {overallTACoS.toFixed(1)}%
                                            </div>
                                        </div>

                                        {/* Promotion ROI */}
                                        <div className={`rounded-lg p-2.5 text-center ${promoROI >= 0 ? 'bg-emerald-900/20 border border-emerald-500/20' : 'bg-red-900/20 border border-red-500/20'}`}>
                                            <div className="text-[9px] text-zinc-400 font-bold uppercase mb-0.5">推广 ROI</div>
                                            <div className={`text-lg font-black font-mono ${promoROI >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {promoROI >= 0 ? '+' : ''}{promoROI.toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Key Milestones */}
                                    <div className="space-y-1.5 mt-2">
                                        <div className="text-[9px] text-zinc-500 font-bold uppercase">关键里程碑</div>

                                        <div className="flex items-center gap-2 text-[11px]">
                                            <span className={`material-symbols-outlined text-sm ${firstProfitMonth ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                                {firstProfitMonth ? 'check_circle' : 'radio_button_unchecked'}
                                            </span>
                                            <span className="text-zinc-400">首次单月盈利</span>
                                            <span className={`ml-auto font-bold ${firstProfitMonth ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                                {firstProfitMonth ? firstProfitMonth.label : '未达成'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px]">
                                            <span className={`material-symbols-outlined text-sm ${healthyTacosMonth ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                                {healthyTacosMonth ? 'check_circle' : 'radio_button_unchecked'}
                                            </span>
                                            <span className="text-zinc-400">TACoS ≤ 15%</span>
                                            <span className={`ml-auto font-bold ${healthyTacosMonth ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                                {healthyTacosMonth ? healthyTacosMonth.label : '未达成'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px]">
                                            <span className={`material-symbols-outlined text-sm ${lowAdShareMonth ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                                {lowAdShareMonth ? 'check_circle' : 'radio_button_unchecked'}
                                            </span>
                                            <span className="text-zinc-400">广告占比 ≤ 50%</span>
                                            <span className={`ml-auto font-bold ${lowAdShareMonth ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                                {lowAdShareMonth ? lowAdShareMonth.label : '未达成'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Capital Exposure */}
                                    <div className="bg-blue-500/10 rounded-lg p-3 mt-2">
                                        <div className="flex justify-between items-end">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-blue-300 uppercase mb-1">💰 最大资金需求</span>
                                                <span className="text-[9px] text-blue-400/60">(库存 + 推广亏损)</span>
                                            </div>
                                            <span className="text-xl font-black text-blue-400 font-mono leading-none">{fmtUSD(maxCapitalExposure)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div >
    );
};

export default PromotionDeduction;
