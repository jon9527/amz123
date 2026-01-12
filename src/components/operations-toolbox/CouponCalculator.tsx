import React, { useState, useMemo } from 'react';
import { Card, NumericInput } from '../ui';

/**
 * 优惠券费用计算器 (2025新规)
 */
const CouponCalculator: React.FC = () => {
    const [couponSales, setCouponSales] = useState(0);

    const couponResults = useMemo(() => {
        const fixedFee = 5.0;
        const rawVariable = couponSales * 0.025;
        const variableFee = Math.min(rawVariable, 2000);
        const capped = rawVariable > 2000;
        const totalFee = fixedFee + variableFee;
        const feePct = couponSales > 0 ? (totalFee / couponSales) * 100 : 0;
        return { fixedFee, variableFee, totalFee, capped, feePct };
    }, [couponSales]);

    return (
        <Card icon="confirmation_number" iconColor="bg-gradient-to-br from-orange-500 to-orange-600" title="优惠券费用计算 (2025新规)">
            <div className="p-8 text-center bg-gradient-to-b from-[#18181b] to-orange-500/5 border-b border-[#27272a]">
                <label className="block text-zinc-500 font-bold mb-3">优惠券带来的销售总额 ($)</label>
                <NumericInput
                    defaultValue={couponSales}
                    onChange={setCouponSales}
                    textSize="text-2xl"
                    className="w-full max-w-sm mx-auto text-center py-3 border-2 border-orange-500/30 rounded-xl font-bold"
                />
                <div className="text-xs text-zinc-500 mt-2">Coupon Redemption Sales</div>
            </div>
            <table className="w-full">
                <thead>
                    <tr className="bg-black/20">
                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]" style={{ width: '30%' }}>费用类型</th>
                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]" style={{ width: '30%' }}>计算方式</th>
                        <th className="text-left text-[11px] uppercase text-zinc-500 font-bold px-4 py-3 border-b border-[#27272a]">费用金额</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-[#27272a]">
                        <td className="px-4 py-3">📝 预付费用 (Fixed)</td>
                        <td className="px-4 py-3 text-zinc-500 text-sm">固定收费 $5.00</td>
                        <td className="px-4 py-3 font-mono font-bold text-white">5.00</td>
                    </tr>
                    <tr className="border-b border-[#27272a]">
                        <td className="px-4 py-3">📊 浮动费用 (Variable)</td>
                        <td className="px-4 py-3 text-zinc-500 text-sm">销售额 x 2.5% <span className="text-zinc-600">(Max $2,000)</span></td>
                        <td className="px-4 py-3">
                            <span className="font-mono font-bold text-white">{couponResults.variableFee.toFixed(2)}</span>
                            {couponResults.capped && (
                                <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">MAX</span>
                            )}
                        </td>
                    </tr>
                    <tr className="bg-orange-500/5">
                        <td className="px-4 py-3 text-orange-400 font-bold">💰 总费用 (Total)</td>
                        <td className="px-4 py-3 text-zinc-500 text-sm">预付 + 浮动</td>
                        <td className="px-4 py-3 text-2xl font-black text-orange-400">${couponResults.totalFee.toFixed(2)}</td>
                    </tr>
                    <tr className="border-t border-[#27272a]">
                        <td className="px-4 py-3">📉 综合费率占比</td>
                        <td colSpan={2} className="px-4 py-3 font-bold">
                            {couponResults.feePct.toFixed(2)}%
                            <span className="text-zinc-500 text-sm font-normal ml-2">(总费用 ÷ 销售额)</span>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className="px-4 py-3 bg-black/20 text-zinc-500 text-sm">
                <strong>规则说明:</strong> 每张优惠券收取 $5 预付固定费 + 销售额的 2.5% (上限 $2,000)。
            </div>
        </Card>
    );
};

export default CouponCalculator;
