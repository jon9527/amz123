
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  PROFIT = 'PROFIT',
  ADS = 'ADS',
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
