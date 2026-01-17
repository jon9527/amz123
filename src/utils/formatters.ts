/**
 * Shared formatting and utility functions
 */

// Round to 2 decimal places
export const r2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

// Format as USD currency
export const fmtUSD = (num: number): string => {
    if (num < 0) return '-$' + Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Format as USD with +/- sign (for charts showing profit/loss)
export const fmtUSDSigned = (num: number): string => {
    if (num === 0) return '$0';
    const sign = num < 0 ? '-' : '+';
    return sign + '$' + Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// Format as percentage
export const fmtPct = (num: number): string => (num * 100).toFixed(1) + '%';



// Format as money (integer, no decimals)
export const fmtMoney = (v: number): string => `$${Math.round(v).toLocaleString()}`;

// Compact USD format for large numbers (e.g. $100K, $1.5M)
export const fmtUSDCompact = (num: number): string => {
    const absNum = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (absNum >= 1000000) {
        return sign + '$' + (absNum / 1000000).toFixed(1) + 'M';
    }
    if (absNum >= 100000) {
        return sign + '$' + (absNum / 1000).toFixed(0) + 'K';
    }
    // 完整显示，但不带小数点（整数）
    return sign + '$' + Math.round(absNum).toLocaleString();
};
