/**
 * Shared formatting and utility functions
 */

// Round to 2 decimal places
export const r2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

// Format as USD currency
export const fmtUSD = (num: number): string => '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Format as percentage
export const fmtPct = (num: number): string => (num * 100).toFixed(1) + '%';

/**
 * Calculate refund admin fee based on Amazon's policy
 * Fixed at 20% of commission, capped at $5.00
 */
export const getRefundAdminFee = (price: number, commRate: number): number => {
    if (price <= 0) return 0;
    return Math.min(5.00, (price * commRate) * 0.20);
};

// Format as money (integer, no decimals)
export const fmtMoney = (v: number): string => `$${Math.round(v).toLocaleString()}`;
