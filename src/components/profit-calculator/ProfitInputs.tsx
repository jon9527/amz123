import React from 'react';
import StepperInput from '../StepperInput';
import { LogisticsChannel } from '../../types';

interface ProfitInputsProps {
    // Operating Targets
    targetAcos: number;
    setTargetAcos: (val: number) => void;
    targetMargin: number;
    setTargetMargin: (val: number) => void;
    category: 'standard' | 'apparel';

    // Product Costs
    purchaseRMB: number;
    setPurchaseRMB: (val: number) => void;
    exchangeRate: number;
    setExchangeRate: (val: number) => void;
    liveExchangeRate: number;
    onUseLiveRate: () => void;
    isManualExchangeRate: boolean;

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
    agedInventoryFee: number;
    setAgedInventoryFee: (val: number) => void;

    // Returns
    returnRate: number;
    setReturnRate: (val: number) => void;
    unsellableRate: number;
    setUnsellableRate: (val: number) => void;
    retProcFee: number;
    setRetProcFee: (val: number) => void;
    retRemFee: number;
    setRetRemFee: (val: number) => void;
    disposalFee: number;
    setDisposalFee: (val: number) => void;

    // Computed
    adminFee: number;

    // FBA Configs
    storageMonth: 'jan_sep' | 'oct_dec';
    setStorageMonth: (val: 'jan_sep' | 'oct_dec') => void;
    placementMode: 'minimal' | 'partial' | 'optimized';
    setPlacementMode: (val: 'minimal' | 'partial' | 'optimized') => void;
    inventoryDays: number;
    setInventoryDays: (val: number) => void;
}

const Label = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <div className={`mb-1.5 flex flex-col items-center w-full ${className}`}>
        <label className="text-[11px] font-black text-zinc-400 uppercase tracking-tight leading-none text-center">{children}</label>
    </div>
);

export const ProfitInputs: React.FC<ProfitInputsProps> = ({
    targetAcos, setTargetAcos, targetMargin, setTargetMargin,
    category,
    purchaseRMB, setPurchaseRMB, exchangeRate, setExchangeRate,
    liveExchangeRate, onUseLiveRate, isManualExchangeRate,
    selectedChannelId, setSelectedChannelId, channels, shippingUSD, setShippingUSD,
    fbaFee, setFbaFee, miscFee, setMiscFee, storageFee, setStorageFee,
    agedInventoryFee, setAgedInventoryFee,
    returnRate, setReturnRate, unsellableRate, setUnsellableRate,
    retProcFee, setRetProcFee, retRemFee, setRetRemFee,
    disposalFee, setDisposalFee,
    adminFee,
    storageMonth, setStorageMonth, placementMode, setPlacementMode,
    inventoryDays, setInventoryDays
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
                            <span className="text-[11px] font-black text-zinc-400 uppercase leading-none">类目佣金</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/50">
                            自动计算 ({category === 'apparel' ? '服装' : '标准'})
                        </span>
                    </div>
                </div>
            </div>

            {/* Product Costs */}
            <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-3 shadow-lg space-y-2">
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5"><span className="material-symbols-outlined text-blue-500 text-[20px]">payments</span> 产品成本</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="group flex flex-col items-center">
                        <div className="flex items-center justify-center gap-1 mb-1.5 h-[14px] w-full">
                            <label className="text-[11px] font-black text-zinc-400 uppercase tracking-tight leading-none text-center">采购价 ¥</label>
                        </div>
                        <StepperInput value={purchaseRMB} onChange={setPurchaseRMB} step={1} height="large" disabled={true} />
                    </div>
                    {/* Split Exchange Rate UI: Live (Left) & Manual (Right) */}
                    <div className="group relative flex flex-col items-center">
                        <div className="flex w-full gap-2">
                            {/* Live Rate (Read-only) */}
                            <div className="flex-1 flex flex-col items-center">
                                <div className="flex items-center justify-center gap-1 mb-1.5 h-[14px] w-full">
                                    <label className="text-[11px] font-black text-zinc-500 uppercase tracking-tight leading-none text-center">实时汇率</label>
                                </div>
                                <div className="relative w-full">
                                    <StepperInput
                                        value={liveExchangeRate}
                                        onChange={() => { }}
                                        step={0}
                                        min={0}
                                        disabled={true}
                                        color="zinc"
                                        height="large"
                                    />
                                    {/* Sync Button */}
                                    <button
                                        onClick={onUseLiveRate}
                                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-white transition-colors bg-[#0c0c0e] rounded-full border border-zinc-800 hover:border-zinc-600"
                                        title="使用实时汇率"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>

                            {/* Manual Rate (Editable) */}
                            <div className="flex-1 flex flex-col items-center pl-2">
                                <div className="flex items-center justify-center gap-1 mb-1.5 h-[14px] w-full">
                                    <label className="text-[11px] font-black text-white uppercase tracking-tight leading-none text-center">计算汇率</label>
                                </div>
                                <StepperInput
                                    value={exchangeRate}
                                    onChange={setExchangeRate}
                                    step={0.01}
                                    min={0.01}
                                    color="white"
                                    height="large"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logistics & Storage */}
            <div className="bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-3 shadow-lg space-y-2">
                <h3 className="text-[12px] font-black text-white uppercase tracking-widest flex items-center gap-2.5"><span className="material-symbols-outlined text-blue-500 text-[20px]">inventory_2</span> 物流仓储</h3>
                <div className="space-y-2">
                    {/* Row 1: 头程物流 - styled like 类目佣金 */}
                    <div className="group">
                        <Label>头程物流</Label>
                        <div className="flex items-center h-8 bg-[#18181b]/50 border border-zinc-800 rounded-lg overflow-hidden">
                            <select
                                value={selectedChannelId}
                                onChange={(e) => setSelectedChannelId(e.target.value)}
                                className="bg-transparent text-[11px] font-black text-zinc-400 uppercase focus:outline-none appearance-none cursor-pointer px-2 flex-1 text-center"
                                style={{ textAlignLast: 'center' }}
                            >
                                {channels.map(c => (
                                    <option key={c.id} value={c.id} className="bg-zinc-900">{c.name}</option>
                                ))}
                            </select>
                            <div className="w-px h-full bg-zinc-700"></div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/50 mx-2">
                                ${shippingUSD.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* FBA / 杂费 / 仓储 Configs */}
                    <div className="grid grid-cols-2 gap-2 pb-2 border-b border-zinc-900/50">
                        <div className="group">
                            <Label>入库配置</Label>
                            <select
                                value={placementMode}
                                onChange={(e) => setPlacementMode(e.target.value as any)}
                                className="w-full bg-[#0d0d0f] border border-[#27272a] rounded-md h-8 text-[10px] text-zinc-300 px-1 text-center focus:outline-none focus:border-blue-500 appearance-none"
                                style={{ textAlignLast: 'center' }}
                            >
                                <option value="optimized">优化配送 (免费)</option>
                                <option value="partial">部分配送 (收费)</option>
                                <option value="minimal">最少配送 (最贵)</option>
                            </select>
                        </div>
                        <div className="group">
                            <Label>仓储季节</Label>
                            <div className="flex bg-[#0d0d0f] border border-[#27272a] rounded-md h-8 p-0.5 relative">
                                <div className={`absolute top-0.5 bottom-0.5 rounded w-[calc(50%-2px)] transition-all bg-zinc-700 ${storageMonth === 'jan_sep' ? 'left-0.5' : 'left-[calc(50%+1px)]'}`}></div>
                                <button className="flex-1 z-10 text-[10px] font-bold text-center leading-7 text-zinc-300" onClick={() => setStorageMonth('jan_sep')}>仓储 1-9月</button>
                                <button className="flex-1 z-10 text-[10px] font-bold text-center leading-7 text-zinc-300" onClick={() => setStorageMonth('oct_dec')}>仓储 10-12月</button>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: FBA / 入库 / 仓储 / 库龄 Values - 全部自动计算 */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="group"><Label>FBA配送费</Label><StepperInput value={fbaFee} onChange={setFbaFee} step={0.1} height="large" disabled={true} /></div>
                        <div className="group"><Label>入库配置费</Label><StepperInput value={miscFee} onChange={setMiscFee} step={0.1} height="large" disabled={true} /></div>
                        <div className="group"><Label>月仓储费</Label><StepperInput value={storageFee} onChange={setStorageFee} step={0.01} height="large" disabled={true} /></div>
                        <div className="group"><Label>库龄附加费</Label><StepperInput value={agedInventoryFee} onChange={setAgedInventoryFee} step={0.01} height="large" disabled={true} /></div>
                    </div>

                    {/* 库龄天数输入 */}
                    <div className="flex items-center h-8 bg-[#18181b]/50 border border-zinc-800 rounded-lg">
                        <div className="flex-1 flex items-center justify-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-500 leading-none">库龄天数</span>
                            <span className="text-[9px] text-amber-500/70 leading-none">&gt;180天触发</span>
                        </div>
                        <div className="w-20 pr-1">
                            <StepperInput value={inventoryDays} onChange={setInventoryDays} step={1} min={0} height="compact" />
                        </div>
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

                    {/* 退货相关费用 - 自动计算 */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-900/50">
                        <div className="group flex flex-col items-center">
                            <Label>退货处理费</Label>
                            <StepperInput value={retProcFee} onChange={setRetProcFee} step={0.01} height="large" disabled={true} />
                        </div>
                        <div className="group flex flex-col items-center w-full">
                            <div className="flex items-center justify-center gap-1 mb-1.5 h-[14px] w-full">
                                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-tight leading-none text-center">退款管理费</label>
                            </div>
                            <div className="w-full bg-[#141416] border border-[#1f1f21] rounded-md h-8 flex items-center justify-center relative cursor-not-allowed opacity-60">
                                <span className="text-sm font-black text-zinc-400 font-mono">
                                    {adminFee.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="group flex flex-col items-center">
                            <Label>移除订单费</Label>
                            <StepperInput value={retRemFee} onChange={setRetRemFee} step={0.01} height="large" disabled={true} />
                        </div>
                        <div className="group flex flex-col items-center">
                            <Label>弃置订单费</Label>
                            <StepperInput value={disposalFee} onChange={setDisposalFee} step={0.01} height="large" disabled={true} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

