import React from 'react';
import { createPortal } from 'react-dom';

interface JCurveLogicDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const JCurveLogicDialog: React.FC<JCurveLogicDialogProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Dialog Panel */}
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0c0c0e]/95 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-500">school</span>
                        <h2 className="text-xl font-bold text-white">亚马逊资金曲线 (J-Curve) 计算原理详解</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 text-zinc-300 leading-relaxed font-sans">

                    {/* Intro Alert */}
                    <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-5 flex gap-4">
                        <span className="material-symbols-outlined text-blue-400 shrink-0">info</span>
                        <div>
                            <p className="font-bold text-blue-100 mb-1">核心逻辑：先投入后产出</p>
                            <p className="text-sm text-blue-200/70">
                                模型假设优先消耗预算获取广告订单（通常处于亏损/投入期），随后依靠自然流量订单进行回血（盈利/回报期）。
                            </p>
                        </div>
                    </div>

                    {/* Section 1: Unit Economics */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-zinc-500">01.</span> 基础单品模型 (Unit Economics)
                        </h3>
                        <p className="text-zinc-400 mb-4 text-sm">一切计算的基石是单品固定成本。加入仓储费后，成本结构如下：</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                                <h4 className="text-sm font-bold text-white mb-2">A. 单品总固定成本 (Total Fixed Cost)</h4>
                                <p className="text-xs text-zinc-500 mb-3">每卖出一单必须支付的刚性成本 (代码变量 `baseFixedCost`)</p>
                                <div className="font-mono text-sm bg-black/50 p-2 rounded text-emerald-400 border border-emerald-900/30">
                                    FixedCost = 采购 + 头程 + FBA + 佣金 + 退货损耗 + <span className="text-orange-400 font-bold">月仓储费</span>
                                </div>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
                                <h4 className="text-sm font-bold text-white mb-2">B. 流量获客成本 (CPA)</h4>
                                <p className="text-xs text-zinc-500 mb-3">获取单个广告订单的成本</p>
                                <div className="font-mono text-sm bg-black/50 p-2 rounded text-blue-400 border border-blue-900/30">
                                    CPA = CPC / (CVR / 100)
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-zinc-800" />

                    {/* Section 2: Order Types */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-zinc-500">02.</span> 两种订单的盈亏计算
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-white">① 自然订单 (Organic Unit) —— <span className="text-emerald-400">回血主力</span></h4>
                                    <p className="text-sm text-zinc-400 mt-1">无需支付 CPA，利润最高，决定了曲线回升的斜率。</p>
                                    <div className="mt-2 text-xs font-mono text-zinc-500">Profit = Price - FixedCost</div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-1.5 rounded-full bg-rose-500 shrink-0" />
                                <div>
                                    <h4 className="font-bold text-white">② 广告订单 (Ad Unit) —— <span className="text-rose-400">烧钱来源</span></h4>
                                    <p className="text-sm text-zinc-400 mt-1">在自然单基础上多减去获客成本。通常利润为负，代表 J-Curve 下行阶段。</p>
                                    <div className="mt-2 text-xs font-mono text-zinc-500">Profit = Price - FixedCost - CPA</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-zinc-800" />

                    {/* Section 3: Key Points */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-zinc-500">03.</span> 资金曲线三大关键点
                        </h3>

                        <div className="relative pl-8 border-l border-zinc-700 space-y-8">
                            {/* P0 */}
                            <div className="relative">
                                <span className="absolute -left-[39px] flex items-center justify-center size-5 rounded-full bg-zinc-700 ring-4 ring-[#0c0c0e] text-[10px] font-bold">P0</span>
                                <h4 className="font-bold text-white">原点 (Start)</h4>
                                <p className="text-sm text-zinc-500">销售开始前，资金变动为 0。</p>
                            </div>

                            {/* P1 */}
                            <div className="relative">
                                <span className="absolute -left-[39px] flex items-center justify-center size-5 rounded-full bg-rose-600 ring-4 ring-[#0c0c0e] text-[10px] font-bold">P1</span>
                                <h4 className="font-bold text-white">投入期谷底 (The Valley)</h4>
                                <p className="text-sm text-zinc-400 mb-2">假设优先花光预算或达到目标销量中的广告部分，这是曲线的最低点。</p>
                                <ul className="list-disc list-inside text-xs text-zinc-500 font-mono space-y-1 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                    <li>广告单量 (Vol_ad) = Budget / CPA</li>
                                    <li>累计投入 (Total_Loss) = Vol_ad × Ad_Unit_Profit</li>
                                </ul>
                            </div>

                            {/* P2 */}
                            <div className="relative">
                                <span className="absolute -left-[39px] flex items-center justify-center size-5 rounded-full bg-emerald-600 ring-4 ring-[#0c0c0e] text-[10px] font-bold">P2</span>
                                <h4 className="font-bold text-white">终局状态 (The Final State)</h4>
                                <p className="text-sm text-zinc-400 mb-2">广告单卖完后，剩余的目标销量全部算作自然单。</p>
                                <ul className="list-disc list-inside text-xs text-zinc-500 font-mono space-y-1 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                    <li>剩余自然单 (Vol_org) = Target_Vol - Vol_ad</li>
                                    <li>最终资金 = Total_Loss + (Vol_org × Org_Unit_Profit)</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-zinc-800" />

                    {/* Section 4: BEP */}
                    <section>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-zinc-500">04.</span> 盈亏平衡点 (Break-Even Point)
                        </h3>
                        <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-5">
                            <p className="text-sm text-zinc-300 mb-3">如果广告期亏损且最终盈利，则中间必然存在一个回本点。逻辑是：需要卖多少个自然单，才能填平广告单挖的坑？</p>
                            <div className="font-mono text-center text-indigo-400 text-lg font-bold">
                                BEP_Units = Vol_ad + (|Ad_Loss| / Org_Profit)
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[#0c0c0e]/95 backdrop-blur border-t border-zinc-800 p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors text-sm"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default JCurveLogicDialog;
