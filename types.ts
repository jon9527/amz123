
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  PROFIT = 'PROFIT',
  ADS = 'ADS',
  PROMOTION = 'PROMOTION',
  SIMULATION = 'SIMULATION',
  INVENTORY = 'INVENTORY',
  TRAFFIC = 'TRAFFIC',
  TOOLBOX = 'TOOLBOX',
  DEDUCTION = 'DEDUCTION',
  REPLENISHMENT = 'REPLENISHMENT',
  PRODUCT_LIBRARY = 'PRODUCT_LIBRARY'
}

// ============ 产品库类型 ============
export interface ProductSpec {
  id: string; // Internal UUID
  displayId?: string; // User-facing ID (e.g. P-1001)
  name: string;
  sku: string;
  // 规格尺寸
  length: number;  // cm
  width: number;   // cm
  height: number;  // cm
  weight: number;  // kg
  pcsPerBox: number;
  // 成本
  unitCost: number;      // 采购单价 (¥)
  defaultPrice: number;  // 默认售价 ($)
  // 物流费率（可选，留空则用全局设置）
  seaPriceCbm?: number;
  airPriceKg?: number;
  expPriceKg?: number;
  // 其他
  asin?: string;
  imageUrl?: string;
  notes?: string;
  tags?: string[];  // 产品标签
  createdAt: number;
  updatedAt: number;
}

export interface ReplenishmentBatch {
  id: number;
  name: string;
  type: 'sea' | 'air' | 'exp';
  qty: number;
  offset: number;
}

export interface ProductData {
  id: string;
  name: string;
  asin: string;
  price: number;
  unitCost: number;
  fbaFee: number;
  referralRate: number;
  shipping: number;
  acos: number;
}

export interface KPI {
  label: string;
  value: string | number;
  trend: number;
  trendLabel: string;
  icon: string;
  color: string;
}

export interface CampaignData {
  id: string;
  name: string;
  status: 'Active' | 'Paused' | 'Archived';
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  orders: number;
}

export interface ProfitModelInputs {
  // 运营目标
  targetAcos: number;
  targetMargin: number;
  // 佣金设置
  autoComm: boolean;
  manualComm: number;
  // 产品成本
  purchaseRMB: number;
  exchangeRate: number;
  // 物流仓储
  shippingUSD: number;
  fbaFee: number;
  miscFee: number;
  storageFee: number;
  // 退货损耗
  returnRate: number;
  unsellableRate: number;
  retProcFee: number;
  retRemFee: number;
  // Plan B 售价
  actualPrice: number;
}

export interface ProfitModelResults {
  planA: {
    price: number;
    commRate: number;
    commVal: number;
    ret: number;
    adsVal: number;
    sellCost: number;
    profit: number;
    margin: number;
    be: number;
  };
  planB: {
    price: number;
    commRate: number;
    commVal: number;
    ret: number;
    adsVal: number;
    sellCost: number;
    profit: number;
    margin: number;
    be: number;
  };
  costProdUSD: number;
}

export interface SavedProfitModel {
  id: string;
  productId?: string; // 关联的产品ID
  productName: string;
  asin?: string;
  label: string; // 保留用于向后兼容
  tags?: string[]; // 新增：多标签数组
  note?: string;
  timestamp: number;
  inputs: ProfitModelInputs;
  results: ProfitModelResults;
}
