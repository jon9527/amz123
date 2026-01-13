
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  PROFIT = 'PROFIT',
  ADS = 'ADS',
  PROMOTION = 'PROMOTION',
  SIMULATION = 'SIMULATION',
  INVENTORY = 'INVENTORY',
  TOOLBOX = 'TOOLBOX',
  DEDUCTION = 'DEDUCTION',
  REPLENISHMENT = 'REPLENISHMENT',
  PRODUCT_LIBRARY = 'PRODUCT_LIBRARY',
  LOGISTICS_LIBRARY = 'LOGISTICS_LIBRARY',
  KEYWORD = 'KEYWORD',
  SETTINGS = 'SETTINGS'
}

// ============ 产品库类型 (Product) ============
export interface ProductSpec {
  id: string;              // Internal UUID
  displayId?: string;      // User-facing ID (e.g. P-1001)
  name: string;            // 产品名称
  sku: string;             // SKU 编码
  asin: string;            // ASIN (必填)

  // 规格尺寸
  length: number;          // 长度 (cm)
  width: number;           // 宽度 (cm)
  height: number;          // 高度 (cm)
  weight: number;          // 重量 (kg)
  pcsPerBox: number;       // 每箱件数

  // 成本
  unitCost: number;        // 采购单价 (¥)
  defaultPrice: number;    // 默认售价 ($)
  defaultShippingRate?: number; // 默认头程运费单价 ($/kg)

  // 物流费率（可选，留空则用全局设置）
  seaPriceCbm?: number;    // 海运价格 ($/CBM)
  airPriceKg?: number;     // 空运价格 ($/kg)
  expPriceKg?: number;     // 快递价格 ($/kg)

  // 其他
  imageUrl?: string;       // 产品图片 URL
  notes?: string;          // 备注
  tags?: string[];         // 产品标签
  createdAt: number;       // 创建时间
  updatedAt: number;       // 更新时间
}

// ============ 补货设置 (RestockSetting) ============
export interface RestockSetting {
  id: string;              // UUID
  productId: string;       // 关联的产品 ID
  bufferDays: number;      // 备货天数 (提前多少天开始备货)
  safetyStockDays: number; // 安全库存天数 (最低库存覆盖天数)
  targetTurnoverDays: number; // 目标周转天数
  minOrderQty?: number;    // 最小起订量
  maxOrderQty?: number;    // 最大订购量
  createdAt: number;       // 创建时间
  updatedAt: number;       // 更新时间
}

// ============ 推广推演 (PromotionPlan) ============
export interface PromotionPlan {
  id: string;              // UUID
  productId: string;       // 关联的产品 ID
  name?: string;           // 推广计划名称
  targetSales: number;     // 目标销量 (单位: 件)
  expectedCVR: number;     // 预估转化率 (0-1, 如 0.15 表示 15%)
  budget: number;          // 预算 (USD)
  dailyBudget?: number;    // 日预算 (USD)
  targetAcos?: number;     // 目标 ACOS (0-1)
  startDate?: number;      // 开始日期 (timestamp)
  endDate?: number;        // 结束日期 (timestamp)
  status?: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: number;       // 创建时间
  updatedAt: number;       // 更新时间
}

// ============ 物流库类型 ============
export interface LogisticsChannel {
  id: string;
  name: string;
  type: 'sea' | 'air' | 'exp';
  carrier?: string; // e.g. "Matson", "UPS"
  status: 'active' | 'disabled';

  // 计费规则
  pricePerKg?: number;     // 空/快 核心
  pricePerCbm?: number;    // 海运 核心
  volDivisor?: number;     // 5000, 6000
  minWeight?: number;      // 起运重 (kg)
  taxRate?: number;        // 关税率 (%)

  // 时效
  deliveryDays: number;    // 预计时效
  slowDays?: number;       // 最慢时效(用于风险提示)
}

export interface ReplenishmentBatch {
  id: number;
  name: string;
  type: 'sea' | 'air' | 'exp';
  qty: number;
  offset: number;
  prodDays: number;
  extraPercent?: number; // 加量百分比，默认0
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
    ganttHold: { x: [number, number]; y: string; batchIdx: number; duration: number }[];
    ganttSell: { x: [number, number]; y: string; batchIdx: number; revenue: number }[];
    ganttStockout: { x: [number, number]; y: string; gapDays: number }[];
    totalStockoutDays: number;
    minCash: number;
    finalCash: number;
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
    ganttHold: { x: [number, number]; y: string; batchIdx: number; duration: number }[];
    ganttSell: { x: [number, number]; y: string; batchIdx: number; revenue: number }[];
    ganttStockout: { x: [number, number]; y: string; gapDays: number }[];
    totalStockoutDays: number;
    minCash: number;
    finalCash: number;
    adsVal: number;
    sellCost: number;
    profit: number;
    margin: number;
    be: number;
  };
  costProdUSD: number;
}

// ============ 利润模型 (ProfitModel) ============
export interface SavedProfitModel {
  id: string;              // UUID
  productId: string;       // 关联的产品 ID (必填)
  productName: string;     // 产品名称快照
  asin?: string;           // ASIN 快照
  label: string;           // 保留用于向后兼容
  tags?: string[];         // 多标签数组
  note?: string;           // 备注
  timestamp: number;       // 保存时间
  inputs: ProfitModelInputs;
  results: ProfitModelResults;
}

