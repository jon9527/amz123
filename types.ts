
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  PROFIT = 'PROFIT',
  ADS = 'ADS',
  PROMOTION = 'PROMOTION',
  SIMULATION = 'SIMULATION',
  INVENTORY = 'INVENTORY',
  TRAFFIC = 'TRAFFIC',
  TOOLBOX = 'TOOLBOX'
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
  productName: string;
  asin?: string;
  label: string;
  note?: string;
  timestamp: number;
  inputs: ProfitModelInputs;
  results: ProfitModelResults;
}
