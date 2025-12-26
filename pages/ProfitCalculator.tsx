
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  LabelList
} from 'recharts';

// --- 全局样式 ---
const globalInputStyles = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number] {
    -moz-appearance: textfield;
  }
`;

const r2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;
const fmtUSD = (num: number) => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (num: number) => (num * 100).toFixed(1) + '%';

/**
 * 管理费计算逻辑：固定为佣金的 20%
 */
const getRefundAdminFee = (price: number, commRate: number) => {
  if (price <= 0) return 0;
  return (price * commRate) * 0.20;
};

const INPUT_H = "h-[32px]";
const CONTAINER_CLASS = `w-full bg-[#0d0d0f] border border-[#27272a] rounded-md ${INPUT_H} flex items-center justify-center relative transition-all focus-within:border-zinc-500 overflow-hidden group`;
const DISABLED_CONTAINER = `bg-[#141416] border-[#1f1f21] cursor-not-allowed opacity-30`;
const INPUT_CLASS = "bg-transparent border-none text-sm font-black text-white text-center w-full h-full outline-none focus:ring-0 p-0 font-mono leading-none disabled:cursor-not-allowed";

/**
 * 步进输入组件
 */
const StepperInput = ({ value, onChange, step = 0.1, color = "white", min = 0, disabled = false }: { value: number, onChange: (v: number) => void, step?: number, color?: string, min?: number, disabled?: boolean }) => {
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
      setDisplayValue(parseFloat(displayValue).toString());
    }
  };

  return (
    <div className={`${CONTAINER_CLASS} ${disabled ? DISABLED_CONTAINER : ''}`}>
      <input type="text" inputMode="decimal" value={displayValue} onChange={handleChange} onBlur={handleBlur} disabled={disabled} className={`${INPUT_CLASS} ${!disabled && color === 'blue' ? 'text-blue-400' : ''}`} />
      {!disabled && (
        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none pr-1">
          <button onClick={() => { const next = r2(value + step); onChange(next); setDisplayValue(next.toString()); }} className="pointer-events-auto material-symbols-outlined text-[14px] text-zinc-600 hover:text-white leading-none scale-75">expand_less</button>
          <button onClick={() => { const next = r2(Math.max(min, value - step)); onChange(next); setDisplayValue(next.toString()); }} className="pointer-events-auto material-symbols-outlined text-[14px] text-zinc-600 hover:text-white leading-none scale-75">expand_more</button>
        </div>
      )}
    </div>
  );
};

const ProfitCalculator: React.FC = () => {
  const [targetAcos, setTargetAcos] = useState(15);
  const [targetMargin, setTargetMargin] = useState(15);
  const [autoComm, setAutoComm] = useState(true);
  const [manualComm, setManualComm] = useState(15); 
  const [purchaseRMB, setPurchaseRMB] = useState(19.99);
  const [exchangeRate, setExchangeRate] = useState(7.1);
  const [shippingUSD, setShippingUSD] = useState(0.9);
  const [fbaFee, setFbaFee] = useState(5.69);
  const [miscFee, setMiscFee] = useState(0);
  const [storageFee, setStorageFee] = useState(0.45);
  const [returnRate, setReturnRate] = useState(10);
  const [unsellableRate, setUnsellableRate] = useState(20);
  const [retProcFee, setRetProcFee] = useState(2.62);
  const [retRemFee, setRetRemFee] = useState(2.24);
  const [actualPrice, setActualPrice] = useState(17.99);
  const [actualPriceDisplay, setActualPriceDisplay] = useState('17.99');

  const results = useMemo(() => {
    const costProdUSD = r2(purchaseRMB / exchangeRate);
    const costShip = r2(shippingUSD);
    const costFba = r2(fbaFee);
    const costMisc = r2(miscFee);
    const costStorage = r2(storageFee);

    const calcPlan = (price: number) => {
      const commRate = autoComm ? (price > 20 ? 0.17 : (price >= 15 ? 0.10 : 0.05)) : manualComm / 100;
      const commVal = r2(price * commRate);
      const adminFee = r2(getRefundAdminFee(price, commRate));
      const lossSellable = r2(retProcFee + adminFee + costFba);
      const lossUnsellable = r2(lossSellable + costProdUSD + costShip + retRemFee);
      const avgRetCost = r2(((lossSellable * (1 - unsellableRate / 100)) + (lossUnsellable * (unsellableRate / 100))) * (returnRate / 100));
      const adsVal = r2(price * (targetAcos / 100));
      const sellCost = r2(costProdUSD + costShip + costMisc + costStorage + costFba + commVal + avgRetCost);
      const profit = r2(price - sellCost - adsVal);
      const margin = price > 0 ? profit / price : 0;
      const bePrice = r2((costProdUSD + costShip + costMisc + costStorage + costFba + avgRetCost) / Math.max(0.01, (1 - commRate)));
      
      return { price, commRate, commVal, ret: avgRetCost, adsVal, sellCost, profit, margin, be: bePrice, costProdUSD };
    };

    let planA_Price = 20.0;
    for (let i = 0; i < 3; i++) {
      const comm = autoComm ? (planA_Price > 20 ? 0.17 : (planA_Price >= 15 ? 0.10 : 0.05)) : manualComm / 100;
      const adminFee = r2(getRefundAdminFee(planA_Price, comm));
      const lossSellable = r2(retProcFee + adminFee + costFba);
      const lossUnsellable = r2(lossSellable + costProdUSD + costShip + retRemFee);
      const retFactor = ((lossSellable * (1 - unsellableRate / 100)) + (lossUnsellable * (unsellableRate / 100))) * (returnRate / 100);
      const fixedTotal = costProdUSD + costShip + costMisc + costStorage + costFba + retFactor;
      const denom = 1 - comm - (targetAcos / 100) - (targetMargin / 100);
      planA_Price = fixedTotal / Math.max(0.01, denom);
    }
    
    return { costProdUSD, planA: calcPlan(r2(planA_Price)), planB: calcPlan(actualPrice) };
  }, [purchaseRMB, exchangeRate, shippingUSD, fbaFee, miscFee, storageFee, targetAcos, targetMargin, autoComm, manualComm, actualPrice, returnRate, unsellableRate, retProcFee, retRemFee]);

  const waterfallData = useMemo(() => {
    const pb = results.planB;
    const costProdUSD = results.costProdUSD;
    const logistics = r2(shippingUSD + miscFee);
    const storage = r2(storageFee);
    const fba = r2(fbaFee);
    const p1 = pb.price;
    const p2 = r2(p1 - costProdUSD);
    const p3 = r2(p2 - logistics);
    const p4 = r2(p3 - storage);
    const p5 = r2(p4 - fba);
    const p6 = r2(p5 - pb.commVal);
    const p7 = r2(p6 - pb.ret);
    const p8 = r2(p7 - pb.adsVal);

    return [
      { name: '销售总额', val: pb.price, range: [0, p1], color: '#334155' },
      { name: '采购成本', val: -costProdUSD, range: [p2, p1], color: '#3b82f6' },
      { name: '物流杂费', val: -logistics, range: [p3, p2], color: '#a855f7' },
      { name: '月仓储费', val: -storage, range: [p4, p3], color: '#6366f1' },
      { name: 'FBA 配送', val: -fba, range: [p5, p4], color: '#71717a' },
      { name: '销售佣金', val: -pb.commVal, range: [p6, p5], color: '#f59e0b' },
      { name: '退货损耗', val: -pb.ret, range: [p7, p6], color: '#ef4444' },
      { name: '广告成本', val: -pb.adsVal, range: [p8, p7], color: '#eab308' },
      { name: '净利润', val: pb.profit, range: [0, pb.profit], color: '#22c55e' }
    ];
  }, [results.planB, results.costProdUSD, shippingUSD, miscFee, storageFee, fbaFee]);

  const Label = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <div className={`mb-1.5 flex flex-col items-center w-full ${className}`}>
      <label className="text-[11px] font-black text-zinc-400 uppercase tracking-tight leading-none text-center">{children}</label>
    </div>
  );

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-8 animate-in fade-in duration-500">
      <style>{globalInputStyles}</style>
      
      {/* 顶部标题区 */}
      <div className="flex items-center gap-6 px-4 py-10 border-b border-[#27272a]/20">
        <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
          <span className="material-symbols-outlined text-6xl text-blue-500 leading-none">account_balance_wallet</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-5xl font-black text-white tracking-tighter leading-none">亚马逊利润测算</h1>
          <p className="text-zinc-600 text-xs font-black uppercase tracking-[0.4em] mt-3">版本 V1.0 • 实时运营仿真系统</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* 输入面板 */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-6 shadow-lg space-y-6">
            <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5">
              <span className="material-symbols-outlined text-blue-500 text-[20px] font-bold">radio_button_checked</span> 运营目标
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="group"><Label>广告占比 %</Label><StepperInput value={targetAcos} onChange={setTargetAcos} step={1} /></div>
              <div className="group"><Label>利润率 %</Label><StepperInput value={targetMargin} onChange={targetMargin => setTargetMargin(targetMargin)} step={1} /></div>
            </div>
            
            <div className="space-y-4 pt-5 border-t border-zinc-900/50">
              <div className={`flex items-center justify-between px-3 h-[40px] bg-[#18181b]/50 border border-zinc-800 rounded-lg`}>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-zinc-400 uppercase leading-none">自动阶梯佣金</span>
                </div>
                <button onClick={() => setAutoComm(!autoComm)} className={`w-12 h-6 rounded-full relative transition-all duration-300 ${autoComm ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-zinc-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${autoComm ? 'left-[24px]' : 'left-1'}`}></div>
                </button>
              </div>
              <div className="space-y-2 relative pb-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-2 w-full relative">
                    <Label className="m-0">手动佣金比例 %</Label>
                    <span className={`absolute right-0 text-[9px] text-blue-500 font-black uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 transition-opacity duration-300 ${autoComm ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                      已锁定
                    </span>
                  </div>
                  <StepperInput value={manualComm} onChange={setManualComm} step={0.5} color="blue" disabled={autoComm} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-6 shadow-lg space-y-5">
            <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5"><span className="material-symbols-outlined text-blue-500 text-[20px]">payments</span> 产品成本</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="group"><Label>采购价 ¥</Label><StepperInput value={purchaseRMB} onChange={setPurchaseRMB} step={1} /></div>
              <div className="group"><Label>汇率</Label><StepperInput value={exchangeRate} onChange={setExchangeRate} step={0.01} min={0.01} /></div>
            </div>
          </div>

          <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-6 shadow-lg space-y-5">
            <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5"><span className="material-symbols-outlined text-blue-500 text-[20px]">inventory_2</span> 物流仓储</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="group"><Label>头程 $</Label><StepperInput value={shippingUSD} onChange={setShippingUSD} step={0.1} /></div>
              <div className="group"><Label>FBA $</Label><StepperInput value={fbaFee} onChange={setFbaFee} step={0.1} /></div>
              <div className="group"><Label>杂费 $</Label><StepperInput value={miscFee} onChange={setMiscFee} step={0.1} /></div>
              <div className="group"><Label>月仓储 $</Label><StepperInput value={storageFee} onChange={setStorageFee} step={0.01} /></div>
            </div>
          </div>

          <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-6 shadow-lg space-y-5">
            <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5"><span className="material-symbols-outlined text-blue-500 text-[20px]">undo</span> 退货损耗</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="group"><Label>退货率 %</Label><StepperInput value={returnRate} onChange={setReturnRate} step={1} /></div>
              <div className="group"><Label>不可售占比 %</Label><StepperInput value={unsellableRate} onChange={setUnsellableRate} step={1} /></div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-900/50">
              <div className="group flex flex-col items-center">
                <Label className="mb-1 font-black">处理费</Label>
                <StepperInput value={retProcFee} onChange={setRetProcFee} step={0.01} />
              </div>
              <div className="group flex flex-col items-center">
                <Label className="mb-1 font-black">管理费</Label>
                <div className={`${CONTAINER_CLASS} bg-zinc-900/20 border-dashed border-zinc-800 font-mono text-zinc-500 text-[13px] font-black cursor-default`} title="佣金的 20%">
                  {getRefundAdminFee(actualPrice, results.planB.commRate).toFixed(2)}
                </div>
              </div>
              <div className="group flex flex-col items-center">
                <Label className="mb-1 font-black">移除费</Label>
                <StepperInput value={retRemFee} onChange={setRetRemFee} step={0.01} />
              </div>
            </div>
          </div>
        </div>

        {/* PLAN A */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="bg-[#111111] border border-[#27272a] rounded-3xl overflow-hidden shadow-2xl flex flex-col flex-1">
            <div className="p-8 pb-6 text-center border-b border-zinc-800/50 bg-gradient-to-b from-blue-600/5 to-transparent flex flex-col items-center">
              <span className="px-5 py-1.5 bg-blue-600/10 text-blue-500 rounded-full text-[11px] font-black uppercase tracking-[0.3em] border border-blue-500/20">PLAN A</span>
              <h2 className="text-6xl font-black text-white my-8 font-mono tracking-tighter leading-none">{fmtUSD(results.planA.price)}</h2>
              <div className="text-sm text-zinc-500 flex items-center gap-2 font-black uppercase tracking-widest">目标利润率: <span className="text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-lg">{targetMargin}.0%</span></div>
            </div>
            <div className="p-8 flex-1 flex flex-col justify-between bg-[#0d0d0f]">
              <div className="flex-1 flex flex-col justify-center space-y-7">
                <DistributionRow label="采购成本" value={results.planA.costProdUSD} price={results.planA.price} color="bg-blue-500" />
                <DistributionRow label="物流杂费" value={r2(shippingUSD + miscFee)} price={results.planA.price} color="bg-purple-500" />
                <DistributionRow label="月仓储费" value={r2(storageFee)} price={results.planA.price} color="bg-indigo-400" />
                <DistributionRow label="FBA 配送" value={r2(fbaFee)} price={results.planA.price} color="bg-zinc-500" />
                <DistributionRow label="销售佣金" value={results.planA.commVal} price={results.planA.price} color="bg-orange-500" />
                <DistributionRow label="退货损耗" value={results.planA.ret} price={results.planA.price} color="bg-rose-500" />
                <DistributionRow label="广告成本" value={results.planA.adsVal} price={results.planA.price} color="bg-amber-400" />
                <DistributionRow label="预期利润" value={results.planA.profit} price={results.planA.price} color="bg-emerald-500" isBold />
              </div>
              
              <div className="mt-8 pt-8 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[12px] text-zinc-500 font-bold mb-2">盈亏平衡</span>
                  <span className="text-[18px] font-black font-mono text-zinc-300 leading-none">{fmtUSD(results.planA.be)}</span>
                </div>
                <div className="w-px h-10 bg-zinc-800"></div>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[12px] text-zinc-500 font-bold mb-2">售卖成本</span>
                  <span className="text-[18px] font-black font-mono text-orange-600 leading-none">{fmtUSD(results.planA.sellCost)}</span>
                </div>
                <div className="w-px h-10 bg-zinc-800"></div>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[12px] text-zinc-500 font-bold mb-2">单品净利</span>
                  <span className="text-[18px] font-black font-mono text-emerald-500 leading-none">{fmtUSD(results.planA.profit)}</span>
                </div>
                <div className="w-px h-10 bg-zinc-800"></div>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[12px] text-zinc-500 font-bold mb-2">佣金比</span>
                  <span className="text-[18px] font-black font-mono text-zinc-300 leading-none">{(results.planA.commRate * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PLAN B */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="bg-[#111111] border border-blue-600/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col flex-1">
            <div className="p-8 pb-6 text-center border-b border-zinc-800/50 bg-gradient-to-b from-emerald-600/5 to-transparent flex flex-col items-center">
              <span className="px-5 py-1.5 bg-zinc-800 text-zinc-400 rounded-full text-[11px] font-black uppercase tracking-[0.3em] border border-zinc-700/50">PLAN B</span>
              <div className="my-8 relative inline-block group w-full px-12">
                <div className="relative inline-flex items-center justify-center w-full">
                  <input type="text" inputMode="decimal" value={actualPriceDisplay} onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') { setActualPriceDisplay(''); setActualPrice(0); return; }
                    if (!/^\d*\.?\d*$/.test(val)) return;
                    setActualPriceDisplay(val);
                    const n = parseFloat(val);
                    if (!isNaN(n)) setActualPrice(Math.max(0, n));
                  }} onBlur={() => {
                    const n = parseFloat(actualPriceDisplay);
                    if (isNaN(n)) { setActualPrice(0); setActualPriceDisplay('0'); }
                    else { setActualPriceDisplay(n.toString()); }
                  }} className="bg-transparent border-none text-6xl font-black text-white focus:ring-0 text-center w-full font-mono tracking-tighter p-0 leading-none" />
                  <div className="absolute right-[-15px] flex flex-col gap-1">
                    <button onClick={() => {
                      const next = r2(actualPrice + 0.1);
                      setActualPrice(next);
                      setActualPriceDisplay(next.toString());
                    }} className="material-symbols-outlined text-zinc-500 hover:text-blue-500 scale-125 transition-colors">expand_less</button>
                    <button onClick={() => {
                      const next = r2(Math.max(0, actualPrice - 0.1));
                      setActualPrice(next);
                      setActualPriceDisplay(next.toString());
                    }} className="material-symbols-outlined text-zinc-500 hover:text-blue-500 scale-125 transition-colors">expand_more</button>
                  </div>
                </div>
                <div className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 w-[55%] h-[3px] bg-blue-600 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.9)]"></div>
              </div>
              <div className="text-sm text-zinc-500 flex items-center gap-2 font-black uppercase tracking-widest">实际利润率: <span className={`px-3 py-1 rounded-lg ${results.planB.profit >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>{fmtPct(results.planB.margin)}</span></div>
            </div>
            <div className="p-8 flex-1 flex flex-col justify-between bg-[#0d0d0f]">
              <div className="flex-1 flex flex-col justify-center space-y-7">
                <DistributionRow label="采购成本" value={results.planB.costProdUSD} price={results.planB.price} color="bg-blue-500" />
                <DistributionRow label="物流杂费" value={r2(shippingUSD + miscFee)} price={results.planB.price} color="bg-purple-500" />
                <DistributionRow label="月仓储费" value={r2(storageFee)} price={results.planB.price} color="bg-indigo-400" />
                <DistributionRow label="FBA 配送" value={r2(fbaFee)} price={results.planB.price} color="bg-zinc-500" />
                <DistributionRow label="销售佣金" value={results.planB.commVal} price={results.planB.price} color="bg-orange-500" />
                <DistributionRow label="退货损耗" value={results.planB.ret} price={results.planB.price} color="bg-rose-500" />
                <DistributionRow label="广告成本" value={results.planB.adsVal} price={results.planB.price} color="bg-amber-400" />
                <DistributionRow label="实际利润" value={results.planB.profit} price={results.planB.price} color="bg-emerald-500" isBold />
              </div>
              
              <div className="mt-8 pt-8 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[12px] text-zinc-500 font-bold mb-2">盈亏平衡</span>
                  <span className="text-[18px] font-black font-mono text-zinc-300 leading-none">{fmtUSD(results.planB.be)}</span>
                </div>
                <div className="w-px h-10 bg-zinc-800"></div>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[12px] text-zinc-500 font-bold mb-2">售卖成本</span>
                  <span className="text-[18px] font-black font-mono text-orange-600 leading-none">{fmtUSD(results.planB.sellCost)}</span>
                </div>
                <div className="w-px h-10 bg-zinc-800"></div>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[12px] text-zinc-500 font-bold mb-2">单品净利</span>
                  <span className="text-[18px] font-black font-mono text-emerald-500 leading-none">{fmtUSD(results.planB.profit)}</span>
                </div>
                <div className="w-px h-10 bg-zinc-800"></div>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[12px] text-zinc-500 font-bold mb-2">佣金比</span>
                  <span className="text-[18px] font-black font-mono text-zinc-300 leading-none">{(results.planB.commRate * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROFIT WATERFALL */}
      <div className="bg-[#0c0c0e] border border-[#27272a] rounded-3xl overflow-hidden shadow-2xl flex flex-col w-full animate-in slide-in-from-bottom-4 duration-700">
        <div className="p-8 border-b border-zinc-900 bg-[#111111]/50 flex justify-between items-center">
          <div className="flex items-center gap-5">
             <div className="bg-zinc-900 size-14 rounded-2xl flex items-center justify-center border border-zinc-800 shadow-inner">
               <span className="material-symbols-outlined text-blue-500 text-4xl">waterfall_chart</span>
             </div>
             <div className="flex flex-col">
               <h3 className="text-2xl font-black text-white tracking-tighter leading-none">单品利润瀑布</h3>
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2">利润构成精细化分析</span>
             </div>
          </div>
          <div className="px-5 py-2.5 bg-blue-600/5 rounded-full border border-blue-500/10 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">数据实时同步</span>
          </div>
        </div>

        <div className="w-full p-10 md:p-16 bg-[#0d0d0f]">
          <div className="h-[550px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 30, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e1e21" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 13, fontWeight: 900, letterSpacing: '0.05em' }} dy={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 12, fontWeight: 600 }} tickFormatter={(v) => `$${v}`} domain={[0, 'auto']} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} animationDuration={0} isAnimationActive={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#18181b] border border-zinc-800 p-6 rounded-2xl shadow-2xl ring-1 ring-white/5 backdrop-blur-xl pointer-events-none min-w-[160px]">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 border-b border-zinc-800 pb-2">{data.name}</p>
                          <p className={`text-2xl font-black font-mono ${data.val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtUSD(data.val)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="range" isAnimationActive={false} barSize={85}>
                  {waterfallData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} radius={[4, 4, 4, 4]} />)}
                  <LabelList dataKey="val" position="top" formatter={(v: number) => fmtUSD(v)} style={{ fill: '#a1a1aa', fontSize: 14, fontWeight: 900, fontFamily: 'JetBrains Mono' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-16 flex items-center justify-center border-t border-zinc-900 pt-12 text-center">
             <div className="flex items-center gap-4 text-zinc-600 bg-zinc-900/30 px-10 py-5 rounded-2xl border border-zinc-800/50 max-w-3xl">
               <span className="material-symbols-outlined text-blue-500 text-3xl">info</span>
               <p className="text-[14px] font-bold italic tracking-wide">
                 瀑布图直观展示了从销售总额到最终净利润的成本切削过程，帮助精准识别利润流失点。
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DistributionRow: React.FC<{ label: string, value: number, price: number, color: string, isBold?: boolean }> = ({ label, value, price, color, isBold }) => {
  const pct = price > 0 ? (value / price) * 100 : 0;
  return (
    <div className="group w-full">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2.5">
          <div className={`size-2.5 rounded-full ${color} shadow-lg shadow-black/50`}></div>
          <span className="text-[13px] text-zinc-400 font-black uppercase tracking-tight">{label}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-[14px] font-mono ${isBold ? 'text-emerald-500 font-black' : 'text-zinc-100 font-black'}`}>{fmtUSD(value)}</span>
          <span className="text-[10px] text-zinc-600 font-mono w-10 text-right font-black">{pct.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-[2px] bg-zinc-950 rounded-full overflow-hidden">
        <div className={`h-full ${color} opacity-90 transition-all duration-700 ease-out`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}></div>
      </div>
    </div>
  );
};

export default ProfitCalculator;
