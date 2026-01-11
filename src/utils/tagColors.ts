/**
 * 标签颜色配置（暗色主题）
 * 用于给标签分配稳定的颜色
 */
export const TAG_COLORS = [
    { bg: 'bg-gray-700/60', text: 'text-gray-200', hover: 'hover:bg-gray-600/60' },
    { bg: 'bg-red-900/50', text: 'text-red-300', hover: 'hover:bg-red-800/50' },
    { bg: 'bg-orange-900/50', text: 'text-orange-300', hover: 'hover:bg-orange-800/50' },
    { bg: 'bg-yellow-900/50', text: 'text-yellow-300', hover: 'hover:bg-yellow-800/50' },
    { bg: 'bg-green-900/50', text: 'text-green-300', hover: 'hover:bg-green-800/50' },
    { bg: 'bg-teal-900/50', text: 'text-teal-300', hover: 'hover:bg-teal-800/50' },
    { bg: 'bg-blue-900/50', text: 'text-blue-300', hover: 'hover:bg-blue-800/50' },
    { bg: 'bg-purple-900/50', text: 'text-purple-300', hover: 'hover:bg-purple-800/50' },
    { bg: 'bg-pink-900/50', text: 'text-pink-300', hover: 'hover:bg-pink-800/50' },
];

export type TagColor = typeof TAG_COLORS[number];

/**
 * 根据标签名生成稳定的颜色
 * 使用哈希算法确保同一标签始终返回相同颜色
 */
export const getTagColor = (tag: string): TagColor => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % TAG_COLORS.length;
    return TAG_COLORS[index];
};
