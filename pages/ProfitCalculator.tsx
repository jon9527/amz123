
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
import SaveProfitModelDialog from '../components/SaveProfitModelDialog';
import { ProfitModelService } from '../services/profitModelService';
import { ProfitModelInputs, ProfitModelResults, SavedProfitModel } from '../types';

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
  return Math.min(5.00, (price * commRate) * 0.20);
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
  const [storageFee, setStorageFee] = useState(0);
  const [returnRate, setReturnRate] = useState(10);
  const [unsellableRate, setUnsellableRate] = useState(20);
  const [retProcFee, setRetProcFee] = useState(2.62);
  const [retRemFee, setRetRemFee] = useState(2.24);
  const [actualPrice, setActualPrice] = useState(17.99);
  const [actualPriceDisplay, setActualPriceDisplay] = useState('17.99');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [savedModelId, setSavedModelId] = useState<string | null>(null);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [recentProducts, setRecentProducts] = useState<SavedProfitModel[]>([]);
  // 新增：所有历史记录（支持展开查看）
  const [allModels, setAllModels] = useState<SavedProfitModel[]>([]);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // 新增：产品基本信息（用于保存和对比）
  const [productName, setProductName] = useState('');
  // const [asin, setAsin] = useState(''); // Removed ASIN

  // Ref to track if user has manually edited Plan B price
  // If false, Plan B price follows Plan A price automatically
  const hasEditedPlanB = React.useRef(false);

  useEffect(() => {
    // 加载最近的产品配置（每个产品取最新的一个方案）
    const models = ProfitModelService.getAll();
    const uniqueProducts = new Map<string, SavedProfitModel>();

    // Sort all models date desc
    const sorted = models.sort((a, b) => b.timestamp - a.timestamp);
    setAllModels(sorted);
    setRecentProducts(sorted); // User requested flat list of ALL versions
  }, [showLoadMenu]); // 每次打开菜单重新加载

  const handleLoadModel = (model: SavedProfitModel) => {
    setTargetAcos(model.inputs.targetAcos);
    setTargetMargin(model.inputs.targetMargin);
    setAutoComm(model.inputs.autoComm);
    setManualComm(model.inputs.manualComm);
    setPurchaseRMB(model.inputs.purchaseRMB);
    setExchangeRate(model.inputs.exchangeRate);
    setShippingUSD(model.inputs.shippingUSD);
    setFbaFee(model.inputs.fbaFee);
    setMiscFee(model.inputs.miscFee);
    setStorageFee(model.inputs.storageFee);
    setReturnRate(model.inputs.returnRate);
    setUnsellableRate(model.inputs.unsellableRate);
    setRetProcFee(model.inputs.retProcFee);
    setRetRemFee(model.inputs.retRemFee);
    setActualPrice(model.inputs.actualPrice);
    setActualPriceDisplay(model.inputs.actualPrice.toString());
    setProductName(model.productName);
    // setAsin(model.asin || '');

    // When loading, disable auto-sync
    hasEditedPlanB.current = true;

    setShowLoadMenu(false);
    setShowToast(true); // Reuse toast specifically for "Loaded" if we want, but simple feedback is OK
  };

  const handleSaveModel = (data: { productName: string; asin: string; label: string; note?: string }) => {
    // 每次保存成功后，更新本地的产品上下文，这样下次保存时就会自动带入
    setProductName(data.productName);
    // setAsin(data.asin);

    const inputs: ProfitModelInputs = {
      targetAcos,
      targetMargin,
      autoComm,
      manualComm,
      purchaseRMB,
      exchangeRate,
      shippingUSD,
      fbaFee,
      miscFee,
      storageFee,
      returnRate,
      unsellableRate,
      retProcFee,
      retRemFee,
      actualPrice
    };

    const modelResults: ProfitModelResults = {
      planA: results.planA,
      planB: results.planB,
      costProdUSD: results.costProdUSD
    };

    const model = {
      id: ProfitModelService.generateId(),
      productName: data.productName,
      asin: data.asin,
      label: data.label,
      note: data.note,
      timestamp: Date.now(),
      inputs,
      results: modelResults
    };

    const success = ProfitModelService.save(model);
    if (success) {
      setSavedModelId(model.id);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
  };

  const results = useMemo(() => {
    const costProdUSD = purchaseRMB / exchangeRate; // High precision for calc, match Legacy
    const costShip = shippingUSD;
    const costFba = fbaFee;
    const costMisc = miscFee;
    const costStorage = storageFee;

    // Helper: Determine Commission Rate based on Price
    const getCommRate = (price: number) => {
      if (!autoComm) return manualComm / 100;
      if (price > 20) return 0.17; // > $20
      if (price >= 15) return 0.10; // $15 - $20
      return 0.05; // < $15
    };

    /**
     * Unified Solver for True Break-Even Price
     * Iteratively finds the price where Profit = 0, accounting for dynamic Commission Rates & Admin Fees.
     */
    const findBreakEvenPrice = () => {
      // Start low to find the first valid point, or use a binary search approach.
      // Given the tiers, a simple robust way is to just solve for the price assuming each tier,
      // and see if the resulting price actually falls within that tier.
      // However, strictly iterative is safest for variable fees.

      let low = costProdUSD + costShip + costFba; // Absolute floor
      let high = 1000;

      // Binary search for Price where Profit ≈ 0
      for (let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;

        // Cost Logic at Price 'mid'
        const rate = getCommRate(mid);
        const commVal = mid * rate;
        const adminFee = getRefundAdminFee(mid, rate);
        const lossSellable = retProcFee + adminFee + costFba;
        const lossUnsellable = lossSellable + costProdUSD + costShip + retRemFee;
        const avgRetCost = ((lossSellable * (1 - unsellableRate / 100)) + (lossUnsellable * (unsellableRate / 100))) * (returnRate / 100);

        const totalVariableCost = costProdUSD + costShip + costMisc + costStorage + costFba + commVal + avgRetCost;

        // Profit at 'mid' (BE excludes advertising usually, or assumes ACOS=0 for "Technical BE")
        // If we want "Zero Profit Break Even", we assume ACOS is 0?
        // The user's previous simple formula was: Fixed / (1 - Comm). This implies ACOS=0 for BE.
        const profit = mid - totalVariableCost;

        if (profit > 0) {
          high = mid;
        } else {
          low = mid;
        }
      }
      return r2(high);
    };

    const trueBE = findBreakEvenPrice();

    const calcPlan = (price: number) => {
      const commRate = getCommRate(price);
      const commVal = r2(price * commRate);
      const adminFee = r2(getRefundAdminFee(price, commRate));
      const lossSellable = r2(retProcFee + adminFee + costFba);
      const lossUnsellable = r2(lossSellable + costProdUSD + costShip + retRemFee);
      const avgRetCost = r2(((lossSellable * (1 - unsellableRate / 100)) + (lossUnsellable * (unsellableRate / 100))) * (returnRate / 100));
      const adsVal = r2(price * (targetAcos / 100));
      const sellCost = r2(costProdUSD + costShip + costMisc + costStorage + costFba + commVal + avgRetCost);
      const profit = r2(price - sellCost - adsVal);
      const margin = price > 0 ? profit / price : 0;

      // Use the unified True BE for consistency
      const bePrice = trueBE;

      return { price, commRate, commVal, ret: avgRetCost, adsVal, sellCost, profit, margin, be: bePrice, costProdUSD };
    };

    // Plan A Solver: Target Profit %
    // We solve for Price where (Profit / Price) = TargetMargin
    // P - Costs - Ads - Comm = P * Target
    // P * (1 - CommRate - Acos - Target) = Costs
    // P = Costs / (1 - CommRate - Acos - Target)
    let planA_Price = 0;

    // Try solving for each tier to find the valid one
    const checkTier = (rate: number) => {
      // Approx Admin Fee at this tier? It depends on P.
      // Iterative approach is best for Plan A too to include Admin Fee accuracy.
      let p = 20.0;
      for (let i = 0; i < 10; i++) {
        const adminFee = getRefundAdminFee(p, rate);
        const lossSellable = retProcFee + adminFee + costFba;
        const lossUnsellable = lossSellable + costProdUSD + costShip + retRemFee;
        const retFactor = ((lossSellable * (1 - unsellableRate / 100)) + (lossUnsellable * (unsellableRate / 100))) * (returnRate / 100);
        const fixedTotal = costProdUSD + costShip + costMisc + costStorage + costFba + retFactor;
        const denom = 1 - rate - (targetAcos / 100) - (targetMargin / 100);
        p = fixedTotal / Math.max(0.01, denom);
      }
      return p;
    };

    // Plan A Solver: Prioritize Lower Commission Tiers (Most Competitive Price)
    // We check tiers from lowest cost (5%) to highest (17%) to find the first valid price point.
    if (autoComm) {
      // 1. Try 5% Tier (Price < $15)
      const p1 = checkTier(0.05);
      if (p1 < 15) {
        planA_Price = p1;
      } else {
        // 2. Try 10% Tier ($15 <= Price <= $20)
        const p2 = checkTier(0.10);
        if (p2 >= 15 && p2 <= 20) {
          planA_Price = p2;
        } else {
          // 3. Fallback to 17% Tier (Price > $20)
          const p3 = checkTier(0.17);
          planA_Price = p3;
        }
      }
    } else {
      planA_Price = checkTier(manualComm / 100);
    }

    return { costProdUSD, planA: calcPlan(r2(planA_Price)), planB: calcPlan(actualPrice) };
  }, [purchaseRMB, exchangeRate, shippingUSD, fbaFee, miscFee, storageFee, targetAcos, targetMargin, autoComm, manualComm, actualPrice, returnRate, unsellableRate, retProcFee, retRemFee]);

  // Sync Plan B Price - REMOVED per user request to prevent overwriting manual input
  // useEffect(() => {
  //   if (!hasEditedPlanB.current && results.planA.price > 0) {
  //     setActualPrice(results.planA.price);
  //     setActualPriceDisplay(results.planA.price.toString());
  //   }
  // }, [results.planA.price]);

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
      <div className="flex items-center justify-between gap-6 px-4 py-10 border-b border-[#27272a]/20">
        <div className="flex items-center gap-6">
          <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/5">
            <span className="material-symbols-outlined text-6xl text-blue-500 leading-none">account_balance_wallet</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none">亚马逊利润测算</h1>
            <p className="text-zinc-600 text-xs font-black uppercase tracking-[0.4em] mt-3">版本 V1.0 • 实时运营仿真系统</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowLoadMenu(!showLoadMenu)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all border border-zinc-700"
            >
              <span className="material-symbols-outlined text-[20px]">file_open</span>
              导入配置
            </button>
            {showLoadMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLoadMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#18181b] border border-[#27272a] rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-2 border-b border-zinc-800">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2 top-1.5 text-zinc-500 text-[16px]">search</span>
                      <input
                        type="text"
                        placeholder="搜索产品..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:border-blue-500 outline-none transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const term = e.target.value.toLowerCase();
                          const items = document.querySelectorAll('.load-item');
                          items.forEach((item: any) => {
                            const name = item.dataset.name.toLowerCase();
                            item.style.display = name.includes(term) ? 'flex' : 'none';
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 mb-1">
                    最近编辑的产品
                  </div>
                  {recentProducts.length === 0 ? (
                    <div className="px-4 py-8 text-center text-zinc-500 text-xs">
                      暂无保存记录
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto">
                      {recentProducts.map(model => (
                        <button
                          key={model.id}
                          className="load-item w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors flex flex-col gap-1 border-b border-zinc-800/50 last:border-0 group"
                          data-name={model.productName}
                          onClick={() => handleLoadModel(model)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-bold text-zinc-300 group-hover:text-white">{model.productName}</span>
                            <span className="text-xs font-black font-mono text-zinc-500 group-hover:text-white transition-colors">
                              ${model.inputs.actualPrice}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-mono">
                            <span>{new Date(model.timestamp).toLocaleString()}</span>
                            {model.label && (
                              <span className="bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-700/50 group-hover:border-zinc-600 transition-colors">
                                {model.label}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2.5 transition-all shadow-lg shadow-blue-600/20 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            保存当前方案
          </button>
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
                    if (val === '') { setActualPriceDisplay(''); setActualPrice(0); hasEditedPlanB.current = true; return; }
                    if (!/^\d*\.?\d*$/.test(val)) return;
                    setActualPriceDisplay(val);
                    const n = parseFloat(val);
                    if (!isNaN(n)) { setActualPrice(Math.max(0, n)); hasEditedPlanB.current = true; }
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
                      hasEditedPlanB.current = true;
                    }} className="material-symbols-outlined text-zinc-500 hover:text-blue-500 scale-125 transition-colors">expand_less</button>
                    <button onClick={() => {
                      const next = r2(Math.max(0, actualPrice - 0.1));
                      setActualPrice(next);
                      setActualPriceDisplay(next.toString());
                      hasEditedPlanB.current = true;
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

      {/* 广告投放分析模块 */}
      <SaveProfitModelDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveModel}
        initialProductName={productName}
        initialAsin={''}
        existingProductNames={Array.from(new Set(recentProducts.map(p => p.productName)))}
      />

      {/* 保存成功提示 */}
      {
        showToast && (
          <div className="fixed bottom-8 right-8 z-50 bg-[#0c0c0e] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/10 p-6 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl">
              <span className="material-symbols-outlined text-emerald-500 text-2xl">check_circle</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-sm">保存成功！</span>
              <span className="text-zinc-500 text-xs font-bold mt-0.5">方案已保存到利润模型库</span>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="ml-4 text-zinc-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        )
      }
    </div >
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
