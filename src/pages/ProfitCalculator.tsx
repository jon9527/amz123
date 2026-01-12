
import React, { useState, useMemo, useEffect } from 'react';
import SaveProfitModelDialog from '../components/SaveProfitModelDialog';
import DistributionRow from '../components/DistributionRow';
import WaterfallChart from '../components/WaterfallChart';
import { ProfitModelService } from '../services/profitModelService';
import { ProfitModelInputs, ProfitModelResults, SavedProfitModel } from '../types';
import { useProducts } from '../contexts/ProductContext';
import { useLogistics } from '../contexts/LogisticsContext';
import { r2, fmtUSD, fmtPct, getRefundAdminFee } from '../utils/formatters';

import { ProfitHeader } from '../components/profit-calculator/ProfitHeader';
import { ProfitInputs } from '../components/profit-calculator/ProfitInputs';

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

const ProfitCalculator: React.FC = () => {
  const { products } = useProducts();
  const { channels } = useLogistics();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('3'); // 默认: 普船海卡
  const [targetAcos, setTargetAcos] = useState(15);
  const [targetMargin, setTargetMargin] = useState(15);
  const [autoComm, setAutoComm] = useState(true);
  const [manualComm, setManualComm] = useState(15);
  const [purchaseRMB, setPurchaseRMB] = useState(19.99);
  const [exchangeRate, setExchangeRate] = useState(() => {
    const cached = localStorage.getItem('exchangeRate');
    return cached ? r2(parseFloat(cached)) : 7.1;
  });
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
  // const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Smart Model Detection State
  const [existingModelsForProduct, setExistingModelsForProduct] = useState<SavedProfitModel[]>([]);

  // 新增：产品基本信息（用于保存和对比）
  const [productName, setProductName] = useState('');
  const [loadedLabel, setLoadedLabel] = useState(''); // 记录导入的方案标签
  const [loadedNote, setLoadedNote] = useState('');   // 记录导入的备注
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null); // 记录导入的模型 ID（用于更新而非新建）

  // Content Hashing for Smart Save
  const [loadedHash, setLoadedHash] = useState<string>('');
  const [saveMode, setSaveMode] = useState<'update' | 'create'>('create');
  const [smartLabel, setSmartLabel] = useState<string>('');

  // Source-Based Save Logic: Track where data came from
  const [dataSource, setDataSource] = useState<'productLibrary' | 'profitModel' | 'manual'>('manual');
  const [toastMessage, setToastMessage] = useState<string>('方案已保存到利润模型库');

  const generateContentHash = (inputs: ProfitModelInputs) => {
    // 包含所有影响 Plan B 的输入框（targetMargin 只影响 Plan A，不纳入）
    return JSON.stringify({
      // 运营目标（只有 targetAcos 影响 Plan B）
      tAcos: inputs.targetAcos,
      aComm: inputs.autoComm,
      mComm: inputs.manualComm,
      // 产品成本
      pRMB: inputs.purchaseRMB,
      rate: inputs.exchangeRate,
      // 物流仓储
      ship: inputs.shippingUSD,
      fba: inputs.fbaFee,
      misc: inputs.miscFee,
      stor: inputs.storageFee,
      // 退货损耗
      ret: inputs.returnRate,
      unsel: inputs.unsellableRate,
      proc: inputs.retProcFee,
      rem: inputs.retRemFee,
      // Plan B 价格
      price: inputs.actualPrice,
    });
  };

  // Helper to generate label: 价格-时间 格式 (e.g., "20.99-22:31:45")
  const getUniqueLabel = (baseLabel: string, _currentProductName: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} `;
    return `${baseLabel} -${time} `;
  };

  // ... (existing code)

  const handleLoadModel = (model: SavedProfitModel) => {
    if (model.productId) setSelectedProductId(model.productId);
    else setSelectedProductId('');

    // Restore Inputs
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
    setTargetAcos(model.inputs.targetAcos);
    setTargetMargin(model.inputs.targetMargin);
    setAutoComm(model.inputs.autoComm);
    setManualComm(model.inputs.manualComm);

    setProductName(model.productName);
    setLoadedLabel(model.label || '');
    setLoadedNote(model.note || '');
    setLoadedModelId(model.id);

    // Set Hash & Source
    setLoadedHash(generateContentHash(model.inputs));
    setDataSource('profitModel'); // 追踪来源：利润模型

    // Disable auto-sync
    hasEditedPlanB.current = true;

    setShowLoadMenu(false);
    setToastMessage('方案数据已导入');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // ... (existing code)


  // If false, Plan B price follows Plan A price automatically
  const hasEditedPlanB = React.useRef(false);

  // Fetch real-time exchange rate
  const fetchRate = async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data && data.rates && data.rates.CNY) {
        return data.rates.CNY;
      }
    } catch (e) {
      console.error("Failed to fetch rate", e);
    }
    return 7.02; // Fallback to current approx rate
  };

  useEffect(() => {
    fetchRate().then(rate => {
      const rounded = r2(rate);
      setExchangeRate(prev => {
        if (prev === rounded) return prev;
        return rounded;
      });
      localStorage.setItem('exchangeRate', rounded.toString());
    });
  }, []); // Run once on mount

  // Auto-calculate shippingUSD from selected channel + product dimensions
  useEffect(() => {
    if (!selectedChannelId) return; // Manual mode, don't override

    const channel = channels.find(c => c.id === selectedChannelId);
    const product = products.find(p => p.id === selectedProductId);

    if (!channel) return;

    // Get dimensions (from product or use defaults)
    const length = product?.length || 30;
    const width = product?.width || 20;
    const height = product?.height || 15;
    const weight = product?.weight || 1;
    const pcsPerBox = product?.pcsPerBox || 1;

    const dimVol = length * width * height; // cm³
    const volDivisor = channel.volDivisor || (channel.type === 'sea' ? 0 : 6000);
    const volWgt = volDivisor > 0 ? dimVol / volDivisor : 0;
    const chgWgt = Math.max(weight, volWgt);

    let costPerPcsRMB: number;
    if (channel.type === 'sea') {
      // Sea: CBM-based
      const cbm = dimVol / 1000000;
      costPerPcsRMB = (cbm * (channel.pricePerCbm || 0)) / pcsPerBox;
    } else {
      // Air/Exp: Weight-based
      costPerPcsRMB = (chgWgt * (channel.pricePerKg || 0)) / pcsPerBox;
    }

    // Convert to USD
    const costPerPcsUSD = r2(costPerPcsRMB / exchangeRate);
    setShippingUSD(costPerPcsUSD);
  }, [selectedChannelId, selectedProductId, channels, products, exchangeRate]);

  const handleProductSelect = (pid: string) => {
    setSelectedProductId(pid);
    // 选择新产品时，清除导入的模型追踪，避免覆盖错误的记录
    setLoadedModelId(null);
    setLoadedLabel('');
    setLoadedHash(''); // 重置 hash，防止切换回来后重复保存
    setExistingModelsForProduct([]);
    setDataSource('productLibrary'); // 追踪来源：产品库

    if (!pid) return; // User cleared selection

    // 1. Load Product Data from Library
    const product = products.find(p => p.id === pid);
    if (product) {
      setProductName(product.name);
      setPurchaseRMB(product.unitCost);
      if (product.defaultPrice) {
        setActualPrice(product.defaultPrice);
        setActualPriceDisplay(product.defaultPrice.toString());
        hasEditedPlanB.current = false;
      }
    }

    // 2. Smart Detection: Check for existing profit models for this product
    const allModels = ProfitModelService.getAll();
    // Filter by productId OR strictly matching productName (fallback)
    const matches = allModels.filter(m =>
      m.productId === pid ||
      (product && m.productName === product.name)
    ).sort((a, b) => b.timestamp - a.timestamp); // Newest first

    if (matches.length > 0) {
      setExistingModelsForProduct(matches);
    }
  };

  const loadRecentModel = () => {
    if (existingModelsForProduct.length > 0) {
      handleLoadModel(existingModelsForProduct[0]);
    }
  };


  // Grouped models state
  const [groupedModels, setGroupedModels] = useState<Record<string, SavedProfitModel[]>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  useEffect(() => {
    // Load and group models
    const models = ProfitModelService.getAll();
    // Sort by date desc
    models.sort((a, b) => b.timestamp - a.timestamp);

    setAllModels(models);
    setRecentProducts(models);

    // Grouping logic
    const groups: Record<string, SavedProfitModel[]> = {};
    models.forEach(m => {
      const name = m.productName || '未命名产品';
      if (!groups[name]) groups[name] = [];
      groups[name].push(m);
    });
    setGroupedModels(groups);

  }, [showLoadMenu]); // Reload on menu open



  const onInfosSaveClick = () => {
    // 1. Generate current hash
    const currentInputs: ProfitModelInputs = {
      purchaseRMB, exchangeRate, shippingUSD, fbaFee, miscFee, storageFee,
      returnRate, unsellableRate, retProcFee, retRemFee,
      actualPrice, targetAcos, targetMargin, autoComm, manualComm
    };
    const currentHash = generateContentHash(currentInputs);

    // 2. Compare with loaded hash - 数据未变化
    if (loadedModelId && currentHash === loadedHash) {
      setToastMessage('数据未做更改');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }

    // 3. 检查是否已存在相同内容的方案（防止切换产品后重复保存）
    const allModels = ProfitModelService.getAll();
    const duplicateModel = allModels.find(m => {
      // 检查同一产品下是否有相同 hash 的方案
      const matchesProduct = m.productId === selectedProductId || m.productName === productName;
      if (!matchesProduct) return false;
      const modelHash = generateContentHash(m.inputs);
      return modelHash === currentHash;
    });

    if (duplicateModel) {
      setToastMessage(`该方案已存在: ${duplicateModel.label || duplicateModel.inputs.actualPrice} `);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }

    // 3. 根据数据来源决定保存行为
    if (dataSource === 'profitModel' && loadedModelId) {
      // 来源：利润模型 → 更新原方案
      setSaveMode('update');
    } else {
      // 来源：产品库或手动 → 创建新方案
      setSaveMode('create');
    }

    // 标签始终使用当前 Plan B 价格（自动去重）
    const baseLabel = actualPrice.toString();
    const uniqueLabel = getUniqueLabel(baseLabel, productName);
    setSmartLabel(uniqueLabel);

    // 先隐藏 Toast，然后在下一帧打开对话框，避免闪烁
    setShowToast(false);
    // 使用 requestAnimationFrame 确保状态已更新后再显示对话框
    requestAnimationFrame(() => {
      setShowSaveDialog(true);
    });
  };

  const handleSaveModel = (data: { productName: string; asin: string; label: string; note?: string }, saveAsNew: boolean = false, forceUpdateId?: string) => {
    setProductName(data.productName);

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

    const getResultDefaults = (plan: any) => ({
      ...plan,
      ganttHold: [],
      ganttSell: [],
      ganttStockout: [],
      totalStockoutDays: 0,
      minCash: 0,
      finalCash: 0
    });

    const modelResults: ProfitModelResults = {
      planA: getResultDefaults(results.planA),
      planB: getResultDefaults(results.planB),
      costProdUSD: results.costProdUSD
    };

    // Smart Save Logic based on SaveMode state determined purely by connection + content hash
    let isUpdate = false;
    let targetId: string;

    if (saveAsNew) {
      // Manual override by user toggling "Save as New"
      isUpdate = false;
      targetId = ProfitModelService.generateId();
    } else if (forceUpdateId) {
      isUpdate = true;
      targetId = forceUpdateId;
    } else if (saveMode === 'update' && loadedModelId) {
      // Only update if our smart check said so
      isUpdate = true;
      targetId = loadedModelId;
    } else {
      // Default to new
      isUpdate = false;
      targetId = ProfitModelService.generateId();
    }

    const model = {
      id: targetId,
      productId: selectedProductId || undefined,
      productName: data.productName,
      asin: data.asin,
      label: data.label,
      note: data.note,
      timestamp: Date.now(),
      inputs,
      results: modelResults
    };

    let success: boolean;
    if (isUpdate) {
      success = ProfitModelService.update(targetId, model);
    } else {
      success = ProfitModelService.save(model);
    }

    if (success) {
      setSavedModelId(model.id);

      // Update Context for next operation
      setLoadedModelId(model.id);
      setLoadedLabel(data.label);
      setLoadedHash(generateContentHash(inputs)); // Update hash to current
      // 注意：不要在这里改变 dataSource！
      // 产品库来源的数据，每次修改后保存都应该是新建
      // 只有从利润模型导入的才应该是更新

      // 设置不同的 Toast 消息
      setToastMessage(isUpdate ? '方案已更新' : '新方案已保存');
      setShowToast(true);
      setShowSaveDialog(false);

      setTimeout(() => setShowToast(false), 2000);
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
    const firstMile = r2(shippingUSD);
    const logistics = r2(fbaFee + miscFee); // FBA + 杂费
    const storage = r2(storageFee);
    const p1 = pb.price;
    const p2 = r2(p1 - costProdUSD);
    const p3 = r2(p2 - firstMile);
    const p4 = r2(p3 - logistics);
    const p5 = r2(p4 - storage);
    const p6 = r2(p5 - pb.commVal);
    const p7 = r2(p6 - pb.ret);
    const p8 = r2(p7 - pb.adsVal);

    return [
      { name: '销售总额', val: pb.price, range: [0, p1] as [number, number], color: '#334155' },
      { name: '采购成本', val: -costProdUSD, range: [p2, p1] as [number, number], color: '#3b82f6' },
      { name: '头程', val: -firstMile, range: [p3, p2] as [number, number], color: '#0ea5e9' },
      { name: '物流杂费', val: -logistics, range: [p4, p3] as [number, number], color: '#a855f7' },
      { name: '月仓储费', val: -storage, range: [p5, p4] as [number, number], color: '#6366f1' },
      { name: '销售佣金', val: -pb.commVal, range: [p6, p5] as [number, number], color: '#f59e0b' },
      { name: '退货损耗', val: -pb.ret, range: [p7, p6] as [number, number], color: '#ef4444' },
      { name: '广告成本', val: -pb.adsVal, range: [p8, p7] as [number, number], color: '#eab308' },
      { name: '净利润', val: pb.profit, range: [0, pb.profit] as [number, number], color: '#22c55e' }
    ];
  }, [results.planB, results.costProdUSD, shippingUSD, miscFee, storageFee, fbaFee]);



  return (
    <div className="p-6 pt-0 max-w-[1700px] mx-auto space-y-4" >
      <style>{globalInputStyles}</style>

      <ProfitHeader
        products={products}
        selectedProductId={selectedProductId}
        onProductSelect={handleProductSelect}
        showLoadMenu={showLoadMenu}
        setShowLoadMenu={setShowLoadMenu}
        recentProducts={recentProducts}
        groupedModels={groupedModels}
        expandedGroups={expandedGroups}
        toggleGroup={toggleGroup}
        onLoadModel={handleLoadModel}
        onSaveClick={onInfosSaveClick}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* 输入面板 */}
        <div className="lg:col-span-4 flex flex-col gap-3">

          <ProfitInputs
            targetAcos={targetAcos}
            setTargetAcos={setTargetAcos}
            targetMargin={targetMargin}
            setTargetMargin={setTargetMargin}
            autoComm={autoComm}
            setAutoComm={setAutoComm}
            manualComm={manualComm}
            setManualComm={setManualComm}
            purchaseRMB={purchaseRMB}
            setPurchaseRMB={setPurchaseRMB}
            exchangeRate={exchangeRate}
            setExchangeRate={setExchangeRate}
            selectedChannelId={selectedChannelId}
            setSelectedChannelId={setSelectedChannelId}
            channels={channels}
            shippingUSD={shippingUSD}
            setShippingUSD={setShippingUSD}
            fbaFee={fbaFee}
            setFbaFee={setFbaFee}
            miscFee={miscFee}
            setMiscFee={setMiscFee}
            storageFee={storageFee}
            setStorageFee={setStorageFee}
            returnRate={returnRate}
            setReturnRate={setReturnRate}
            unsellableRate={unsellableRate}
            setUnsellableRate={setUnsellableRate}
            retProcFee={retProcFee}
            setRetProcFee={setRetProcFee}
            retRemFee={retRemFee}
            setRetRemFee={setRetRemFee}
            adminFee={getRefundAdminFee(actualPrice, results.planB.commRate)}
          />
        </div>

        {/* PLAN A */}
        <div className="lg:col-span-4 flex flex-col h-full">
          <div className="bg-[#111111] border border-[#27272a] rounded-3xl overflow-hidden shadow-2xl flex flex-col flex-1">
            <div className="p-4 pb-2 h-[130px] text-center border-b border-zinc-800/50 bg-gradient-to-b from-blue-600/5 to-transparent flex flex-col items-center justify-center">
              <span className="px-4 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border border-blue-500/20">PLAN A</span>
              <h2 className="text-5xl font-black text-white my-3 font-mono tracking-tighter leading-none">{fmtUSD(results.planA.price)}</h2>
              <div className="text-[10px] text-zinc-500 flex items-center gap-2 font-black uppercase tracking-widest">目标利润率: <span className="text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded">{targetMargin}%</span></div>
            </div>
            <div className="p-4 flex-1 flex flex-col bg-[#0d0d0f]">
              <div className="flex-1 flex flex-col justify-between">
                <DistributionRow label="采购成本" value={results.planA.costProdUSD} price={results.planA.price} color="bg-blue-500" />
                <DistributionRow label="头程" value={r2(shippingUSD)} price={results.planA.price} color="bg-sky-500" />
                <DistributionRow label="物流杂费" value={r2(fbaFee + miscFee)} price={results.planA.price} color="bg-purple-500" />
                <DistributionRow label="月仓储费" value={r2(storageFee)} price={results.planA.price} color="bg-indigo-400" />
                <DistributionRow label="销售佣金" value={results.planA.commVal} price={results.planA.price} color="bg-orange-500" />
                <DistributionRow label="退货损耗" value={results.planA.ret} price={results.planA.price} color="bg-rose-500" />
                <DistributionRow label="广告成本" value={results.planA.adsVal} price={results.planA.price} color="bg-amber-400" />
                <DistributionRow label="预期利润" value={results.planA.profit} price={results.planA.price} color="bg-emerald-500" isBold />
              </div>

              <div className="mt-auto pt-6 border-t border-zinc-800 flex items-center justify-between">
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
            <div className="p-4 pb-2 h-[130px] text-center border-b border-zinc-800/50 bg-gradient-to-b from-emerald-600/5 to-transparent flex flex-col items-center justify-center">
              <span className="px-4 py-1 bg-zinc-800 text-zinc-400 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border border-zinc-700/50">PLAN B</span>
              <div className="my-3 relative inline-block group w-full px-8">
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
                  }} className="bg-transparent border-none text-5xl font-black text-white focus:ring-0 text-center w-full font-mono tracking-tighter p-0 leading-none" />
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
              <div className="text-sm text-zinc-500 flex items-center gap-2 font-black uppercase tracking-widest">实际利润率: <span className={`px - 3 py - 1 rounded - lg ${results.planB.profit >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'} `}>{fmtPct(results.planB.margin)}</span></div>
            </div>
            <div className="p-4 flex-1 flex flex-col bg-[#0d0d0f]">
              <div className="flex-1 flex flex-col justify-between">
                <DistributionRow label="采购成本" value={results.planB.costProdUSD} price={results.planB.price} color="bg-blue-500" />
                <DistributionRow label="头程" value={r2(shippingUSD)} price={results.planB.price} color="bg-sky-500" />
                <DistributionRow label="物流杂费" value={r2(fbaFee + miscFee)} price={results.planB.price} color="bg-purple-500" />
                <DistributionRow label="月仓储费" value={r2(storageFee)} price={results.planB.price} color="bg-indigo-400" />
                <DistributionRow label="销售佣金" value={results.planB.commVal} price={results.planB.price} color="bg-orange-500" />
                <DistributionRow label="退货损耗" value={results.planB.ret} price={results.planB.price} color="bg-rose-500" />
                <DistributionRow label="广告成本" value={results.planB.adsVal} price={results.planB.price} color="bg-amber-400" />
                <DistributionRow label="实际利润" value={results.planB.profit} price={results.planB.price} color="bg-emerald-500" isBold />
              </div>

              <div className="mt-auto pt-6 border-t border-zinc-800 flex items-center justify-between">
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
      <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl overflow-hidden shadow-2xl flex flex-col w-full animate-in slide-in-from-bottom-4 duration-700">
        <div className="p-5 border-b border-zinc-900 bg-[#111111]/50 flex justify-between items-center">
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

        <div className="w-full p-6 md:p-8 bg-[#0d0d0f]">
          <WaterfallChart data={waterfallData} height={420} />
        </div>
      </div>

      {/* 广告投放分析模块 */}
      <SaveProfitModelDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveModel}
        onCheckDuplicate={(pName, pLabel) => {
          // 检查是否存在同名同标签记录 (返回重复 ID 用于上下文切换)
          const all = ProfitModelService.getAll();
          const exist = all.find(m => m.productName === pName && m.label === pLabel);
          return exist ? exist.id : null;
        }}
        initialProductName={productName}
        initialAsin={''}
        // 标签始终使用当前 Plan B 价格
        initialLabel={smartLabel}
        isUpdate={saveMode === 'update'}
        existingProductNames={Array.from(new Set(recentProducts.map(p => p.productName)))}
      />

      {/* 保存成功提示 */}
      {
        showToast && (
          <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-[#0c0c0e] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/10 p-4 flex items-center gap-3 animate-in zoom-in-95 fade-in duration-300">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl">
              <span className="material-symbols-outlined text-emerald-500 text-2xl">check_circle</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-sm">操作成功</span>
              <span className="text-zinc-500 text-xs font-bold mt-0.5">{toastMessage}</span>
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

export default ProfitCalculator;
