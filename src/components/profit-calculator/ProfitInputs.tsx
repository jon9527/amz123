import React from 'react';
import StepperInput from '../StepperInput';
import { LogisticsChannel } from '../../types';

interface ProfitInputsProps {
    // Operating Targets
    targetAcos: number;
    setTargetAcos: (val: number) => void;
    targetMargin: number;
    setTargetMargin: (val: number) => void;
    autoComm: boolean;
    setAutoComm: (val: boolean) => void;
    manualComm: number;
    setManualComm: (val: number) => void;

    // Product Costs
    purchaseRMB: number;
    setPurchaseRMB: (val: number) => void;
    exchangeRate: number;
    setExchangeRate: (val: number) => void;

    // Logistics
    selectedChannelId: string;
    setSelectedChannelId: (val: string) => void;
    channels: LogisticsChannel[];
    shippingUSD: number;
    setShippingUSD: (val: number) => void;
    fbaFee: number;
    setFbaFee: (val: number) => void;
    miscFee: number;
    setMiscFee: (val: number) => void;
    storageFee: number;
    setStorageFee: (val: number) => void;

    // Returns
    returnRate: number;
    setReturnRate: (val: number) => void;
    unsellableRate: number;
    setUnsellableRate: (val: number) => void;
    retProcFee: number;
    setRetProcFee: (val: number) => void;
    retRemFee: number;
    setRetRemFee: (val: number) => void;

    // Computed
    adminFee: number;
}

const Label = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <div className={`mb-1.5 flex flex-col items-center w-full ${className}`}>
        <label className="text-[11px] font-black text-zinc-400 uppercase tracking-tight leading-none text-center">{children}</label>
    </div>
);

export const ProfitInputs: React.FC<ProfitInputsProps> = ({
    targetAcos, setTargetAcos, targetMargin, setTargetMargin,
    autoComm, setAutoComm, manualComm, setManualComm,
    purchaseRMB, setPurchaseRMB, exchangeRate, setExchangeRate,
    selectedChannelId, setSelectedChannelId, channels, shippingUSD, setShippingUSD,
    fbaFee, setFbaFee, miscFee, setMiscFee, storageFee, setStorageFee,
    returnRate, setReturnRate, unsellableRate, setUnsellableRate,
    retProcFee, setRetProcFee, retRemFee, setRetRemFee,
    adminFee
}) => {
    return (
        <div className="flex flex-col gap-3">
            {/* Operating Targets */}
            <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-3 shadow-lg space-y-2">
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-blue-500 text-[20px] font-bold">radio_button_checked</span> 运营目标
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="group"><Label>广告占比 %</Label><StepperInput value={targetAcos} onChange={setTargetAcos} step={1} height="large" /></div>
                    <div className="group"><Label>利润率 %</Label><StepperInput value={targetMargin} onChange={setTargetMargin} step={1} height="large" /></div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-900/50">
                    <div className="flex items-center justify-between px-2 h-8 bg-[#18181b]/50 border border-zinc-800 rounded-lg">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-zinc-400 uppercase leading-none">自动阶梯佣金</span>
                        </div>
                        <button onClick={() => setAutoComm(!autoComm)} className={`w-12 h-6 rounded-full relative transition-all duration-300 ${autoComm ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-zinc-700'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${autoComm ? 'left-[24px]' : 'left-1'}`}></div>
                        </button>
                    </div>
                    <div className="mt-4">
                        <div className="flex flex-col items-center relative">
                            <div className="flex items-center justify-center gap-2 w-full mb-1.5 relative">
                                <Label className="m-0">手动佣金比例 %</Label>
                                {autoComm && (
                                    <span className="absolute right-0 text-[9px] text-zinc-500 font-bold uppercase bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/50">
                                        已锁定
                                    </span>
                                )}
                            </div>
                            <StepperInput value={manualComm} onChange={setManualComm} step={0.5} color="blue" disabled={autoComm} height="large" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Costs */}
            <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-3 shadow-lg space-y-2">
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5"><span className="material-symbols-outlined text-blue-500 text-[20px]">payments</span> 产品成本</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="group flex flex-col items-center">
                        <div className="flex items-center justify-center mb-1.5 h-[14px] w-full">
                            <label className="text-[11px] font-black text-zinc-400 uppercase tracking-tight leading-none text-center">采购价 ¥</label>
                        </div>
                        <StepperInput value={purchaseRMB} onChange={setPurchaseRMB} step={1} height="large" />
                    </div>
                    <div className="group relative flex flex-col items-center">
                        <div className="flex items-center justify-center gap-2 mb-1.5 h-[14px] w-full">
                            <label className="text-[11px] font-black text-zinc-400 uppercase tracking-tight leading-none text-center">汇率</label>
                            <span className="text-[9px] px-1 py-[1px] rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 leading-none flex items-center h-[13px]">实时</span>
                        </div>
                        <StepperInput value={exchangeRate} onChange={setExchangeRate} step={0.01} min={0.01} disabled={true} color="white" height="large" />
                    </div>
                </div>
            </div>

            {/* Logistics & Storage */}
            <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-3 shadow-lg space-y-2">
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5"><span className="material-symbols-outlined text-blue-500 text-[20px]">inventory_2</span> 物流仓储</h3>
                <div className="space-y-2">
                    {/* Row 1: 头程物流 */}
                    <div className="group">
                        <Label>头程物流</Label>
                        <div className="flex gap-2">
                            <select
                                value={selectedChannelId}
                                onChange={(e) => setSelectedChannelId(e.target.value)}
                                className="flex-1 bg-[#0d0d0f] border border-[#27272a] rounded-md h-8 text-xs text-white px-1 text-center focus:outline-none focus:border-zinc-500 appearance-none"
                                style={{ textAlignLast: 'center' }}
                            >
                                {channels.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="w-24">
                                <StepperInput
                                    value={shippingUSD}
                                    onChange={setShippingUSD}
                                    step={0.1}
                                    height="compact"
                                    disabled={!!selectedChannelId}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: FBA / 杂费 / 仓储 */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="group"><Label>FBA $</Label><StepperInput value={fbaFee} onChange={setFbaFee} step={0.1} height="large" /></div>
                        <div className="group"><Label>杂费 $</Label><StepperInput value={miscFee} onChange={setMiscFee} step={0.1} height="large" /></div>
                        <div className="group"><Label>月仓储 $</Label><StepperInput value={storageFee} onChange={setStorageFee} step={0.01} height="large" /></div>
                    </div>
                </div>
            </div>

            {/* Returns & Losses */}
            <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-3 shadow-lg space-y-2">
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5"><span className="material-symbols-outlined text-blue-500 text-[20px]">assignment_return</span> 退货损耗</h3>
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="group"><Label>退货率 %</Label><StepperInput value={returnRate} onChange={setReturnRate} step={1} height="large" /></div>
                        <div className="group"><Label>不可售占比 %</Label><StepperInput value={unsellableRate} onChange={setUnsellableRate} step={1} height="large" /></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900/50">
                        <div className="group flex flex-col items-center">
                            <Label>处理费</Label>
                            <StepperInput value={retProcFee} onChange={setRetProcFee} step={0.01} height="large" />
                        </div>
                        <div className="group flex flex-col items-center w-full">
                            <div className="flex items-center justify-center gap-1 mb-1.5 h-[14px] w-full">
                                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-tight leading-none text-center">管理费</label>
                                <span className="text-[9px] px-1 py-[1px] rounded bg-blue-500/20 text-blue-400 border border-blue-500/50 leading-none flex items-center h-[13px] self-center">固定</span>
                            </div>
                            <div className="w-full bg-[#141416] border border-[#1f1f21] rounded-md h-8 flex items-center justify-center relative cursor-not-allowed opacity-60">
                                <span className="bg-transparent border-none text-sm font-black text-white text-center w-full h-full outline-none p-0 font-mono leading-none flex items-center justify-center text-zinc-400">
                                    {adminFee.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="group flex flex-col items-center">
                            <Label>移除费</Label>
                            <StepperInput value={retRemFee} onChange={setRetRemFee} step={0.01} height="large" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

