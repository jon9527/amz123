/**
 * Date Utilities
 * 日期处理工具函数
 */

/**
 * 格式化日期为 MM/DD 格式
 */
export const fmtDate = (date: Date): string => {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
};

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
export const fmtDateISO = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

/**
 * 格式化日期为中文格式 (X月X日)
 */
export const fmtDateCN = (date: Date): string => {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
};

/**
 * 计算两个日期之间的天数差
 */
export const daysBetween = (start: Date, end: Date): number => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((end.getTime() - start.getTime()) / msPerDay);
};

/**
 * 获取日期偏移后的新日期
 */
export const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

/**
 * 获取当前日期 (中国时区)
 */
export const getTodayCN = (): Date => {
    const now = new Date();
    // 调整到中国时区 (UTC+8)
    const offset = 8 * 60 * 60 * 1000;
    return new Date(now.getTime() + offset);
};

/**
 * 解析 YYYY-MM-DD 格式的日期字符串
 */
export const parseDateISO = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

/**
 * 获取某天属于哪个月 (0-11)
 */
export const getMonthFromOffset = (startDate: Date, dayOffset: number): number => {
    const target = addDays(startDate, dayOffset);
    return target.getMonth();
};

/**
 * 计算从某天开始的月度汇总天数
 * @param startDate 起始日期
 * @param totalDays 总天数
 * @returns 每月天数的数组 (12个元素)
 */
export const getDaysPerMonth = (startDate: Date, totalDays: number): number[] => {
    const result = Array(12).fill(0);
    for (let i = 0; i < totalDays; i++) {
        const month = getMonthFromOffset(startDate, i);
        result[month]++;
    }
    return result;
};
