
import { AppView, KPI, CampaignData, ProductData } from './types';

export const NAVIGATION_ITEMS = [
  { view: AppView.DASHBOARD, label: '总览面板', icon: 'dashboard' },
  { view: AppView.PRODUCT_LIBRARY, label: '产品库', icon: 'inventory_2' },
  { view: AppView.PROFIT, label: '利润计算器', icon: 'attach_money' },
  { view: AppView.SIMULATION, label: '利润模型', icon: 'analytics' },
  { view: AppView.PROMOTION, label: '盈亏沙盘', icon: 'trending_up' },
  { view: AppView.ADS, label: '广告投放模拟', icon: 'bar_chart' },
  { view: AppView.DEDUCTION, label: '推广推演', icon: 'rocket_launch' },
  { view: AppView.REPLENISHMENT, label: '补货建议', icon: 'local_shipping' },
  { view: AppView.TRAFFIC, label: '流量分析', icon: 'insights' },
  { view: AppView.TOOLBOX, label: '运营工具箱', icon: 'construction' },
];

export const MOCK_KPIS: KPI[] = [
  { label: '广告支出', value: '￥12,450', trend: 2.4, trendLabel: '较上周', icon: 'payments', color: 'primary' },
  { label: '广告销售额', value: '￥45,200', trend: 5.1, trendLabel: '较上周', icon: 'shopping_cart', color: 'green-500' },
  { label: 'ACOS', value: '27.5%', trend: -1.2, trendLabel: '目标: < 30%', icon: 'percent', color: 'orange-500' },
  { label: 'ROAS', value: '3.63', trend: 0.4, trendLabel: '较上周', icon: 'monitoring', color: 'purple-500' },
  { label: '展示量', value: '892K', trend: 0.0, trendLabel: '较上周', icon: 'visibility', color: 'blue-400' },
];

export const MOCK_CAMPAIGNS: CampaignData[] = [
  { id: '1', name: '夏季促销_手动型_SP', status: 'Active', spend: 1240.5, sales: 4850.0, acos: 25.5, roas: 3.91, orders: 142 },
  { id: '2', name: '全站自动_兜底计划', status: 'Active', spend: 850.2, sales: 3100.0, acos: 27.4, roas: 3.64, orders: 98 },
  { id: '3', name: '竞品定向_V1版本', status: 'Paused', spend: 420.0, sales: 980.0, acos: 42.8, roas: 2.33, orders: 24 },
  { id: '4', name: '品牌防御_精准匹配', status: 'Active', spend: 2100.0, sales: 12400.0, acos: 16.9, roas: 5.90, orders: 320 },
];

export const DEFAULT_PRODUCT: ProductData = {
  id: 'main-sku',
  name: '耐克 Air Zoom Pegasus 39 跑鞋',
  asin: 'B09X9Y4Z',
  price: 29.99,
  unitCost: 4.50,
  fbaFee: 5.40,
  referralRate: 15,
  shipping: 0.95,
  acos: 25
};
