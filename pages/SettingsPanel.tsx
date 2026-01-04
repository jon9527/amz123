import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { DataService } from '../services/DataService';

const SettingsPanel: React.FC = () => {
    const { lock, hasPin, clearPin, setPin } = useAuth();
    const [stats, setStats] = useState({ productCount: 0, modelCount: 0, channelCount: 0 });
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [showChangePinModal, setShowChangePinModal] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [pinStep, setPinStep] = useState<'new' | 'confirm'>('new');
    const [pinError, setPinError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setStats(DataService.getStats());
    }, []);

    const showMessage = (msg: string, type: 'success' | 'error') => {
        setToastMessage(msg);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleExport = () => {
        DataService.downloadBackup();
        showMessage('备份文件已下载', 'success');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const result = await DataService.importFromFile(file);
        showMessage(result.message, result.success ? 'success' : 'error');

        if (result.success) {
            setStats(DataService.getStats());
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClearData = () => {
        if (confirm('⚠️ 警告：这将清除所有产品数据、利润模型和物流渠道数据。\n\nPIN 设置将保留。确定要继续吗？')) {
            DataService.clearAllData();
            setStats({ productCount: 0, modelCount: 0, channelCount: 0 });
            showMessage('数据已清除', 'success');
        }
    };

    const handleResetAll = () => {
        if (confirm('⚠️ 危险操作：这将清除所有数据并重置 PIN。\n\n你需要重新设置 PIN 码。确定要继续吗？')) {
            localStorage.clear();
            clearPin();
            window.location.reload();
        }
    };

    const handleLock = () => {
        lock();
    };

    const handleChangePinSubmit = async () => {
        if (pinStep === 'new') {
            if (newPin.length !== 6) {
                setPinError('PIN 必须是 6 位数字');
                return;
            }
            setPinStep('confirm');
            setPinError('');
        } else {
            if (confirmNewPin !== newPin) {
                setPinError('两次输入不一致');
                setNewPin('');
                setConfirmNewPin('');
                setPinStep('new');
                return;
            }
            await setPin(newPin);
            setShowChangePinModal(false);
            setNewPin('');
            setConfirmNewPin('');
            setPinStep('new');
            showMessage('PIN 已更新', 'success');
        }
    };

    const SettingCard: React.FC<{
        icon: string;
        iconColor: string;
        title: string;
        desc: string;
        action: React.ReactNode;
    }> = ({ icon, iconColor, title, desc, action }) => (
        <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${iconColor}`}>
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <div>
                    <h3 className="text-white font-bold">{title}</h3>
                    <p className="text-zinc-500 text-sm">{desc}</p>
                </div>
            </div>
            {action}
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-[#27272a]">
                <div className="bg-zinc-800 p-3 rounded-xl">
                    <span className="material-symbols-outlined text-3xl text-zinc-400">settings</span>
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white">系统设置</h1>
                    <p className="text-zinc-500 text-sm">数据管理、安全设置</p>
                </div>
            </div>

            {/* Data Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4 text-center">
                    <div className="text-3xl font-black text-blue-500 font-mono">{stats.productCount}</div>
                    <div className="text-zinc-500 text-sm font-bold mt-1">产品数量</div>
                </div>
                <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4 text-center">
                    <div className="text-3xl font-black text-emerald-500 font-mono">{stats.modelCount}</div>
                    <div className="text-zinc-500 text-sm font-bold mt-1">利润模型</div>
                </div>
                <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4 text-center">
                    <div className="text-3xl font-black text-purple-500 font-mono">{stats.channelCount}</div>
                    <div className="text-zinc-500 text-sm font-bold mt-1">物流渠道</div>
                </div>
            </div>

            {/* Data Management */}
            <div className="space-y-3">
                <h2 className="text-zinc-400 text-xs font-black uppercase tracking-widest">数据管理</h2>

                <SettingCard
                    icon="download"
                    iconColor="bg-blue-500/10 text-blue-500"
                    title="导出数据"
                    desc="将所有数据备份为 JSON 文件"
                    action={
                        <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors">
                            导出备份
                        </button>
                    }
                />

                <SettingCard
                    icon="upload"
                    iconColor="bg-emerald-500/10 text-emerald-500"
                    title="导入数据"
                    desc="从 JSON 备份文件恢复数据"
                    action={
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button onClick={handleImportClick} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors">
                                选择文件
                            </button>
                        </>
                    }
                />

                <SettingCard
                    icon="delete_sweep"
                    iconColor="bg-orange-500/10 text-orange-500"
                    title="清除数据"
                    desc="删除所有产品、模型数据（保留 PIN）"
                    action={
                        <button onClick={handleClearData} className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors">
                            清除数据
                        </button>
                    }
                />
            </div>

            {/* Security */}
            <div className="space-y-3">
                <h2 className="text-zinc-400 text-xs font-black uppercase tracking-widest">安全设置</h2>

                <SettingCard
                    icon="lock"
                    iconColor="bg-purple-500/10 text-purple-500"
                    title="立即锁定"
                    desc="锁定系统，需要 PIN 解锁"
                    action={
                        <button onClick={handleLock} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors">
                            锁定
                        </button>
                    }
                />

                <SettingCard
                    icon="password"
                    iconColor="bg-indigo-500/10 text-indigo-500"
                    title="修改 PIN"
                    desc="更换 6 位数解锁密码"
                    action={
                        <button onClick={() => setShowChangePinModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors">
                            修改
                        </button>
                    }
                />

                <SettingCard
                    icon="warning"
                    iconColor="bg-red-500/10 text-red-500"
                    title="重置全部"
                    desc="删除所有数据并重置 PIN"
                    action={
                        <button onClick={handleResetAll} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors">
                            重置
                        </button>
                    }
                />
            </div>

            {/* Change PIN Modal */}
            {showChangePinModal && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
                    <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 w-80">
                        <h3 className="text-white font-black text-lg mb-4 text-center">
                            {pinStep === 'new' ? '输入新 PIN' : '确认新 PIN'}
                        </h3>
                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={6}
                            value={pinStep === 'new' ? newPin : confirmNewPin}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (pinStep === 'new') setNewPin(val);
                                else setConfirmNewPin(val);
                            }}
                            className="w-full bg-[#0c0c0e] border border-[#27272a] rounded-lg text-center text-2xl font-mono text-white py-3 tracking-[0.5em] focus:outline-none focus:border-blue-500"
                            placeholder="······"
                            autoFocus
                        />
                        {pinError && <p className="text-red-400 text-sm mt-2 text-center">{pinError}</p>}
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setShowChangePinModal(false);
                                    setNewPin('');
                                    setConfirmNewPin('');
                                    setPinStep('new');
                                    setPinError('');
                                }}
                                className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-lg font-bold"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleChangePinSubmit}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-bold"
                            >
                                {pinStep === 'new' ? '下一步' : '确认'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {showToast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 ${toastType === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}>
                    <span className="material-symbols-outlined">
                        {toastType === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span className="font-bold">{toastMessage}</span>
                </div>
            )}
        </div>
    );
};

export default SettingsPanel;
