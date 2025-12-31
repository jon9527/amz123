import React, { useState } from 'react';
import { LogisticsChannel } from '../types';
import { useLogistics } from '../LogisticsContext';

const emptyForm: LogisticsChannel = {
    id: '',
    name: '',
    type: 'sea',
    status: 'active',
    deliveryDays: 0,
    volDivisor: 6000
};

export const LogisticsLibrary: React.FC = () => {
    const { channels, addChannel, updateChannel, deleteChannel } = useLogistics();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<LogisticsChannel>({ ...emptyForm });

    // 统计
    const stats = {
        sea: channels.filter(c => c.type === 'sea').length,
        air: channels.filter(c => c.type === 'air').length,
        exp: channels.filter(c => c.type === 'exp').length,
    };

    const resetForm = () => {
        setForm({ ...emptyForm });
        setEditingId(null);
        setShowForm(false);
    };

    const openAddForm = () => {
        setForm({ ...emptyForm });
        setEditingId(null);
        setShowForm(true);
    };

    const handleEdit = (channel: LogisticsChannel) => {
        setForm({ ...channel });
        setEditingId(channel.id);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('确认删除此渠道吗？')) {
            deleteChannel(id);
        }
    };

    const handleSubmit = () => {
        if (!form.name || !form.deliveryDays) {
            alert('请完善必填信息');
            return;
        }

        if (editingId) {
            updateChannel(editingId, form);
        } else {
            addChannel(form);
        }
        resetForm();
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'sea': return '🚢';
            case 'air': return '✈️';
            case 'exp': return '🚀';
            default: return '📦';
        }
    };

    const inputClass = 'w-full bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
    const labelClass = 'text-xs text-zinc-500 font-bold uppercase mb-1';

    return (
        <div className="h-full bg-[#09090b] text-white p-6 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🏗️</span>
                    <div>
                        <h1 className="text-2xl font-black">物流渠道库</h1>
                        <p className="text-zinc-500 text-sm">管理头程物流渠道及费率规则</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex gap-2">
                        <div className="bg-[#18181b] border border-[#27272a] px-3 py-1 rounded-lg flex items-center gap-2">
                            <span>🚢</span> <span className="font-bold">{stats.sea}</span>
                        </div>
                        <div className="bg-[#18181b] border border-[#27272a] px-3 py-1 rounded-lg flex items-center gap-2">
                            <span>✈️</span> <span className="font-bold">{stats.air}</span>
                        </div>
                        <div className="bg-[#18181b] border border-[#27272a] px-3 py-1 rounded-lg flex items-center gap-2">
                            <span>🚀</span> <span className="font-bold">{stats.exp}</span>
                        </div>
                    </div>
                    <button
                        onClick={openAddForm}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold flex items-center gap-2"
                    >
                        + 新增渠道
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto bg-[#18181b] border border-[#27272a] rounded-xl">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-[#1f2937] text-zinc-400 text-left">
                            <th className="py-3 px-4 font-bold w-16 text-center">类型</th>
                            <th className="py-3 px-4 font-bold">渠道名称</th>
                            <th className="py-3 px-4 font-bold">承运商</th>
                            <th className="py-3 px-4 font-bold text-right">核心费率</th>
                            <th className="py-3 px-4 font-bold text-center">计费除数</th>
                            <th className="py-3 px-4 font-bold text-center">时效 (天)</th>
                            <th className="py-3 px-4 font-bold text-center">状态</th>
                            <th className="py-3 px-4 font-bold text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {channels.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-zinc-500">
                                    暂无物流渠道，请点击右上角新增
                                </td>
                            </tr>
                        ) : (
                            channels.map((channel, index) => (
                                <tr key={channel.id} className={`border-t border-[#27272a] hover:bg-[#1a1a1d] transition-colors ${index % 2 === 0 ? '' : 'bg-[#0f0f11]'}`}>
                                    <td className="py-3 px-4 text-center text-xl">{getTypeIcon(channel.type)}</td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-white">{channel.name}</div>
                                        <div className="text-xs text-zinc-500">{channel.minWeight ? `起运 ${channel.minWeight}kg` : '无起运限制'}</div>
                                    </td>
                                    <td className="py-3 px-4 text-zinc-400">{channel.carrier || '-'}</td>
                                    <td className="py-3 px-4 text-right font-mono">
                                        {channel.type === 'sea' ? (
                                            <div className="text-emerald-400">¥{channel.pricePerCbm} <span className="text-zinc-600 text-xs">/CBM</span></div>
                                        ) : (
                                            <div className="text-orange-400">¥{channel.pricePerKg} <span className="text-zinc-600 text-xs">/KG</span></div>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono text-zinc-400">
                                        {channel.volDivisor ? `÷${channel.volDivisor}` : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="inline-block px-2 py-1 bg-zinc-800 rounded text-xs font-bold text-blue-300">
                                            {channel.deliveryDays}天
                                            {channel.slowDays && <span className="text-zinc-500 font-normal"> - {channel.slowDays}天</span>}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`inline-block w-2 h-2 rounded-full ${channel.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleEdit(channel)} className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs">✏️</button>
                                            <button onClick={() => handleDelete(channel.id)} className="px-2 py-1 rounded bg-red-900/50 hover:bg-red-800 text-xs">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={resetForm}>
                    <div className="bg-[#18181b] border border-[#27272a] rounded-xl w-[500px] max-h-[90vh] overflow-auto flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-[#27272a] flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white">{editingId ? '编辑渠道' : '新增物流渠道'}</h2>
                            <button onClick={resetForm} className="text-zinc-500 hover:text-white">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Type Selection */}
                            <div>
                                <div className={labelClass}>运输方式</div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'sea', label: '海运 / 船运', icon: '🚢' },
                                        { id: 'air', label: '空运 / 空派', icon: '✈️' },
                                        { id: 'exp', label: '快递 / 红单', icon: '🚀' },
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setForm(f => ({ ...f, type: t.id as any }))}
                                            className={`py-2 px-3 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition-all ${form.type === t.id
                                                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                                    : 'bg-[#0a0a0a] border-[#27272a] text-zinc-500 hover:bg-[#27272a]'
                                                }`}
                                        >
                                            <span>{t.icon}</span> {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className={labelClass}>渠道名称 *</div>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="例: 美森限时达"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <div className={labelClass}>承运商 / 货代</div>
                                    <input
                                        type="text"
                                        value={form.carrier || ''}
                                        onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))}
                                        placeholder="例: 义乌仓"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="bg-[#0a0a0a] border border-[#27272a] rounded-lg p-4">
                                <div className="text-sm font-bold text-zinc-300 mb-3 flex items-center gap-2">
                                    <span>💰</span> 计费规则
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {form.type === 'sea' ? (
                                        <div>
                                            <div className={labelClass}>海运费 (¥/CBM)</div>
                                            <input
                                                type="number"
                                                value={form.pricePerCbm || ''}
                                                onChange={e => setForm(f => ({ ...f, pricePerCbm: parseFloat(e.target.value) }))}
                                                className={inputClass}
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <div className={labelClass}>运费单价 (¥/KG)</div>
                                            <input
                                                type="number"
                                                value={form.pricePerKg || ''}
                                                onChange={e => setForm(f => ({ ...f, pricePerKg: parseFloat(e.target.value) }))}
                                                className={inputClass}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <div className={labelClass}>材积除数 (Vol Divisor)</div>
                                        <select
                                            value={form.volDivisor || 6000}
                                            onChange={e => setForm(f => ({ ...f, volDivisor: parseInt(e.target.value) }))}
                                            className={inputClass}
                                        >
                                            <option value={6000}>6000 (标准)</option>
                                            <option value={5000}>5000 (快递)</option>
                                            <option value={0}>无 (纯实重)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <div className={labelClass}>起运重量 (KG)</div>
                                        <input
                                            type="number"
                                            value={form.minWeight || ''}
                                            onChange={e => setForm(f => ({ ...f, minWeight: parseFloat(e.target.value) }))}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                    </div>

                                    <div>
                                        <div className={labelClass}>关税率 (%)</div>
                                        <input
                                            type="number"
                                            value={form.taxRate || ''}
                                            onChange={e => setForm(f => ({ ...f, taxRate: parseFloat(e.target.value) }))}
                                            placeholder="0"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className={labelClass}>预计时效 (天) *</div>
                                    <input
                                        type="number"
                                        value={form.deliveryDays || ''}
                                        onChange={e => setForm(f => ({ ...f, deliveryDays: parseInt(e.target.value) }))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <div className={labelClass}>最慢时效 (天)</div>
                                    <input
                                        type="number"
                                        value={form.slowDays || ''}
                                        onChange={e => setForm(f => ({ ...f, slowDays: parseInt(e.target.value) }))}
                                        placeholder="用于风险提示"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className={labelClass}>状态:</div>
                                <button
                                    onClick={() => setForm(f => ({ ...f, status: f.status === 'active' ? 'disabled' : 'active' }))}
                                    className={`px-3 py-1 rounded text-xs font-bold ${form.status === 'active' ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-400'}`}
                                >
                                    {form.status === 'active' ? '启用中' : '已停用'}
                                </button>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[#27272a] bg-[#1f1f23] rounded-b-xl flex gap-3">
                            <button onClick={resetForm} className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-bold">取消</button>
                            <button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold">保存</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
