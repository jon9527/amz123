import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService } from '../services/DataService';
import { Logger, LogLevel, LogEntry } from '../services/Logger';

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

    // Log state
    const [logSettings, setLogSettings] = useState(Logger.getSettings());
    const [logStats, setLogStats] = useState(Logger.getStats());
    const [showLogViewer, setShowLogViewer] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logFilter, setLogFilter] = useState<LogLevel | 'ALL'>('ALL');

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

            {/* Log Management */}
            <div className="space-y-3">
                <h2 className="text-zinc-400 text-xs font-black uppercase tracking-widest">日志管理</h2>

                <div className="bg-[#111111] border border-[#27272a] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500">
                                <span className="material-symbols-outlined text-2xl">terminal</span>
                            </div>
                            <div>
                                <h3 className="text-white font-bold">系统日志</h3>
                                <p className="text-zinc-500 text-sm">记录应用运行状态，方便排查问题</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={logSettings.enabled}
                                onChange={(e) => {
                                    const newSettings = { ...logSettings, enabled: e.target.checked };
                                    Logger.saveSettings(newSettings);
                                    setLogSettings(newSettings);
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                    </div>

                    {/* Log Stats */}
                    <div className="grid grid-cols-5 gap-2 mb-4">
                        <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                            <div className="text-lg font-black text-white font-mono">{logStats.total}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">总计</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                            <div className="text-lg font-black text-zinc-400 font-mono">{logStats.byLevel[LogLevel.DEBUG]}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Debug</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                            <div className="text-lg font-black text-blue-400 font-mono">{logStats.byLevel[LogLevel.INFO]}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Info</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                            <div className="text-lg font-black text-yellow-400 font-mono">{logStats.byLevel[LogLevel.WARN]}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Warn</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                            <div className="text-lg font-black text-red-400 font-mono">{logStats.byLevel[LogLevel.ERROR]}</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold">Error</div>
                        </div>
                    </div>

                    {/* Log Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setLogs(Logger.getAll());
                                setShowLogViewer(true);
                            }}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                            查看日志
                        </button>
                        <button
                            onClick={() => {
                                Logger.downloadExport();
                                showMessage('日志已导出', 'success');
                            }}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            导出
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('确定要清除所有日志吗？')) {
                                    Logger.clear();
                                    setLogStats(Logger.getStats());
                                    showMessage('日志已清除', 'success');
                                }
                            }}
                            className="bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Log Viewer Modal */}
            {showLogViewer && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowLogViewer(false)}>
                    <div className="bg-[#18181b] border border-[#27272a] rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-[#27272a] flex justify-between items-center shrink-0">
                            <h2 className="text-lg font-black text-white">系统日志</h2>
                            <div className="flex items-center gap-2">
                                <select
                                    value={logFilter}
                                    onChange={(e) => setLogFilter(e.target.value as LogLevel | 'ALL')}
                                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
                                >
                                    <option value="ALL">全部</option>
                                    <option value={LogLevel.DEBUG}>Debug</option>
                                    <option value={LogLevel.INFO}>Info</option>
                                    <option value={LogLevel.WARN}>Warn</option>
                                    <option value={LogLevel.ERROR}>Error</option>
                                </select>
                                <button onClick={() => setShowLogViewer(false)} className="text-zinc-500 hover:text-white p-1">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4 font-mono text-xs">
                            {logs
                                .filter(l => logFilter === 'ALL' || l.level === logFilter)
                                .reverse()
                                .map(log => (
                                    <div key={log.id} className="py-1.5 border-b border-zinc-800 flex gap-3 hover:bg-zinc-800/50">
                                        <span className="text-zinc-600 shrink-0">{new Date(log.timestamp).toLocaleString('zh-CN', { hour12: false })}</span>
                                        <span className={`shrink-0 w-12 font-bold ${log.level === LogLevel.ERROR ? 'text-red-400' :
                                                log.level === LogLevel.WARN ? 'text-yellow-400' :
                                                    log.level === LogLevel.INFO ? 'text-blue-400' : 'text-zinc-500'
                                            }`}>{log.level}</span>
                                        <span className="text-cyan-400 shrink-0">[{log.category}]</span>
                                        <span className="text-zinc-300 flex-1">{log.message}</span>
                                        {log.data && <span className="text-zinc-500 truncate max-w-[200px]">{JSON.stringify(log.data)}</span>}
                                    </div>
                                ))}
                            {logs.length === 0 && <div className="text-zinc-500 text-center py-8">暂无日志</div>}
                        </div>
                    </div>
                </div>
            )}

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
