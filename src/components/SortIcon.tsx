import React from 'react';

export type SortOrder = 'asc' | 'desc';

export interface SortIconProps {
    active: boolean;
    order: SortOrder;
}

/**
 * SortIcon - 排序方向指示器
 * 显示升序/降序箭头或默认展开图标
 */
const SortIcon: React.FC<SortIconProps> = ({ active, order }) => (
    <span className={`material-symbols-outlined text-xs transition-all ${active ? 'text-blue-500' : 'text-zinc-600'}`}>
        {active ? (order === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
    </span>
);

export default SortIcon;
