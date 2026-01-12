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
        <div className="p-6 max-w-5xl mx-auto space-y-6">
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
