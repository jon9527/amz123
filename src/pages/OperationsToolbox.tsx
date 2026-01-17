import React, { useState } from 'react';
import { Tabs, type Tab } from '../components/ui';
import {
    BidCalculator,
    SizeCalculator,
    CouponCalculator,
    DiscountCalculator,
    CompoundCalculator
} from '../components/operations-toolbox';

type TabId = 'bid' | 'size' | 'coupon' | 'discount' | 'compound';

// Tab 配置
const TOOLBOX_TABS: Tab[] = [
    { id: 'bid', icon: 'payments', label: '竞价计算' },
    { id: 'size', icon: 'deployed_code', label: '尺寸重量' },
    { id: 'coupon', icon: 'local_activity', label: '优惠券' },
    { id: 'discount', icon: 'percent', label: '折扣计算' },
    { id: 'compound', icon: 'rocket_launch', label: '资金复利' },
];

const OperationsToolbox: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('bid');

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
                        <span className="material-symbols-outlined text-white">handyman</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">运营工具箱</h1>
                        <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Operations Toolbox</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs
                tabs={TOOLBOX_TABS}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as TabId)}
            />

            {/* Tab Content */}
            {activeTab === 'bid' && <BidCalculator />}
            {activeTab === 'size' && <SizeCalculator />}
            {activeTab === 'coupon' && <CouponCalculator />}
            {activeTab === 'discount' && <DiscountCalculator />}
            {activeTab === 'compound' && <CompoundCalculator />}
        </div>
    );
};

export default OperationsToolbox;
