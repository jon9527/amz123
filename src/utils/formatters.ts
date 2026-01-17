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
