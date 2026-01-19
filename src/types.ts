
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

// ============ 基础类型 ============
/**
 * 基础实体接口 - 所有持久化实体的公共字段
 */
export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
}

// ============ 产品库类型 (Product) ============
export interface ProductSpec {
  id: string;              // Internal UUID
  displayId?: string;      // User-facing ID (e.g. P-1001)
  name: string;            // 产品名称
  sku: string;             // SKU 编码
  asin: string;            // ASIN (必填)

  // 规格尺寸 (单个产品)
  length: number;          // 长度 (cm)
  width: number;           // 宽度 (cm)
  height: number;          // 高度 (cm)
  weight: number;          // 重量 (kg)
  pcsPerBox: number;       // 每箱件数

  // 整箱规格 (用于头程运费计算)
  boxLength?: number;      // 箱长 (cm)
  boxWidth?: number;       // 箱宽 (cm)
  boxHeight?: number;      // 箱高 (cm)
  boxWeight?: number;      // 整箱毛重 (kg)

  // ============ FBA 费用配置 ============
  category?: 'standard' | 'apparel'; // 产品类目：标准 vs 服装
  displayType?: 'standard' | 'apparel' | 'multi' | 'single'; // 产品类型：标品/服装/多变体/单变体

  // 1. FBA 配送费 (Core Fulfillment Fee)
  fbaFeeSystem?: number;   // 系统自动计算的 FBA 费用
  fbaFeeManual?: number;   // 用户手动修正的 FBA 费用 (优先使用)
  fbaFeeYear?: number;     // 费用计算基准年份 (e.g. 2024, 2025)

  // 2. Inbound Placement Fee (入库配置费)
  inboundPlacementMode?: 'minimal' | 'partial' | 'optimized'; // 入库配置模式
  inboundPlacementFeeSystem?: number;  // 系统计算
  inboundPlacementFeeManual?: number;  // 手动覆盖

  // 3. Monthly Storage Fee (月仓储费)
  defaultStorageMonth?: 'jan_sep' | 'oct_dec'; // 默认仓储季节
  monthlyStorageFeeSystem?: number;    // 系统计算 (单位月费)
  monthlyStorageFeeManual?: number;    // 手动覆盖

  // 4. Aged Inventory Surcharge (超龄库存附加费)
  defaultInventoryAge?: number;        // 默认库存天数 (0-365+)
  agedInventoryFeeSystem?: number;     // 系统计算
  agedInventoryFeeManual?: number;     // 手动覆盖

  // 5. Removal Fee (移除费)
  removalFeeSystem?: number;           // 系统计算
  removalFeeManual?: number;           // 手动覆盖

  // 6. Disposal Fee (销毁费)
  disposalFeeSystem?: number;          // 系统计算
  disposalFeeManual?: number;          // 手动覆盖

  // 7. Returns Processing Fee (退货处理费)
  returnsProcessingFeeSystem?: number; // 系统计算
  returnsProcessingFeeManual?: number; // 手动覆盖

  // ============ 成本 ============
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
  agedInventoryFee?: number; // 超龄库存费
  // New FBA Calculation Inputs
  storageMonth?: 'jan_sep' | 'oct_dec'; // 仓储月份 (Seasonality)
  placementMode?: 'minimal' | 'partial' | 'optimized'; // 入库配置模式

  // 退货损耗
  returnRate: number;
  unsellableRate: number;
  retProcFee: number;
  retRemFee: number;
  // Plan B 售价
  actualPrice: number;
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

// NOTE: ProfitModelInputs 已在上方定义 (line 103)

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
  replenishment?: {
    batches: ReplenishmentBatch[];
    summary: ReplenishmentPlanSummary;
    simStart: string;
    monthlyDailySales: number[];
    seaChannelId?: string;
    airChannelId?: string;
    expChannelId?: string;
    lastUpdated: number;
  } | null;
}

// ============ 补货规划 (ReplenishmentPlan) ============
export interface ReplenishmentPlanSummary {
  totalQty: number;           // 总补货量
  totalCost: number;          // 总成本 (USD)
  breakevenDate?: string;     // 回本日期
  stockoutDays: number;       // 断货天数
  minCash: number;            // 最低资金（资金最大占用）
  finalCash: number;          // 最终资金
  // 财务核心指标（保存时填入，Modal 直接读取显示）
  roi?: number;               // ROI (比例，如 2.838 = 283.8%)
  annualRoi?: number;         // 年化回报率 (比例)
  turnoverRatio?: number;     // 资金周转率 (GMV/占用)
  netMargin?: number;         // 净利率 (比例，如 0.295 = 29.5%)
  turnoverDays?: number;      // 库存周转天数
  profitDate?: string;        // 盈利日期 (PROFIT > 0)
}

export interface SavedReplenishmentPlan extends BaseEntity {
  productId: string;          // 关联产品 ID
  productName: string;        // 产品名称快照
  strategyId?: string;        // 关联的利润策略 ID
  strategyLabel?: string;     // 策略标签快照
  name: string;               // 方案名称

  // 核心数据快照
  batches: ReplenishmentBatch[];
  monthlyDailySales: number[];
  prices: number[];
  margins: number[];
  simStart: string;           // 模拟开始日期

  // 物流配置
  seaChannelId?: string;
  airChannelId?: string;
  expChannelId?: string;

  // 模拟结果摘要
  summary: ReplenishmentPlanSummary;
}
