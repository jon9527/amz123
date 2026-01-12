import React from 'react';

export interface Tab {
    id: string;
    icon: string;
    label: string;
}

export interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}

/**
 * Tab 按钮组件（内部使用）
 */
const TabButton: React.FC<{
    tab: Tab;
    isActive: boolean;
    onClick: () => void;
}> = ({ tab, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${isActive
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
    >
        <span className="material-symbols-outlined text-lg">{tab.icon}</span>
        {tab.label}
    </button>
);

/**
 * 通用 Tabs 切换组件
 */
const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
    return (
        <div className={`flex justify-center ${className}`}>
            <div className="inline-flex bg-[#18181b] p-1 rounded-xl border border-[#27272a] gap-1">
                {tabs.map((tab) => (
                    <TabButton
                        key={tab.id}
                        tab={tab}
                        isActive={activeTab === tab.id}
                        onClick={() => onChange(tab.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default Tabs;
