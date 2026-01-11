import React, { useState, useRef, useEffect } from 'react';
import { useAuth, hashPin } from '../contexts/AuthContext';

const PinLockScreen: React.FC = () => {
    const { hasPin, setPin, isLocked, clearPin } = useAuth();
    const [pin, setInputPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [mode, setMode] = useState<'unlock' | 'setup' | 'confirm'>('unlock');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!hasPin) {
            setMode('setup');
        } else {
            setMode('unlock');
        }
    }, [hasPin]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [mode]);

    const handlePinChange = (value: string) => {
        if (!/^\d*$/.test(value) || value.length > 6) return;
        setError('');

        if (mode === 'unlock') {
            setInputPin(value);
            if (value.length === 6) {
                verifyPin(value);
            }
        } else if (mode === 'setup') {
            setInputPin(value);
            if (value.length === 6) {
                setMode('confirm');
                setInputPin('');
                setConfirmPin(value);
            }
        } else if (mode === 'confirm') {
            setInputPin(value);
            if (value.length === 6) {
                if (value === confirmPin) {
                    setPin(value);
                } else {
                    setError('两次输入不一致，请重新设置');
                    setShake(true);
                    setTimeout(() => setShake(false), 500);
                    setMode('setup');
                    setInputPin('');
                    setConfirmPin('');
                }
            }
        }
    };

    const verifyPin = async (inputValue: string) => {
        const storedHash = localStorage.getItem('amz123_auth_pin_hash');
        if (!storedHash) return;

        const hash = await hashPin(inputValue);
        if (hash === storedHash) {
            // Auth context will handle unlock
            localStorage.setItem('amz123_lock_state', 'unlocked');
            localStorage.setItem('amz123_last_activity', Date.now().toString());
            window.location.reload(); // Simple reload to trigger context re-init
        } else {
            setError('PIN 错误');
            setShake(true);
            setTimeout(() => setShake(false), 500);
            setInputPin('');
        }
    };

    const handleClearData = () => {
        if (confirm('⚠️ 警告：这将清除所有数据，包括产品库、利润模型和 PIN 设置。\n\n确定要继续吗？')) {
            localStorage.clear();
            clearPin();
            window.location.reload();
        }
    };

    const handleNumpadClick = (num: string) => {
        if (pin.length < 6) {
            handlePinChange(pin + num);
        }
    };

    const handleBackspace = () => {
        setInputPin(pin.slice(0, -1));
        setError('');
    };

    if (!isLocked) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#09090b] flex flex-col items-center justify-center">
            {/* Logo */}
            <div className="mb-8 flex flex-col items-center">
                <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20 mb-4">
                    <span className="material-symbols-outlined text-5xl text-blue-500">lock</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">AmazonOps</h1>
                <p className="text-zinc-500 text-sm mt-1">
                    {mode === 'setup' ? '请设置 6 位数 PIN 码' :
                        mode === 'confirm' ? '请再次输入确认' :
                            '请输入 PIN 解锁'}
                </p>
            </div>

            {/* PIN Dots */}
            <div className={`flex gap-3 mb-6 ${shake ? 'animate-shake' : ''}`}>
                {[0, 1, 2, 3, 4, 5].map(i => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${i < pin.length
                            ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/30'
                            : 'border-zinc-600'
                            }`}
                    />
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-red-400 text-sm font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {error}
                </div>
            )}

            {/* Hidden Input for Mobile Keyboard */}
            <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className="sr-only"
                autoFocus
            />

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (key === 'del') handleBackspace();
                            else if (key) handleNumpadClick(key);
                        }}
                        disabled={!key}
                        className={`w-16 h-16 rounded-2xl text-2xl font-black transition-all ${key === ''
                            ? 'invisible'
                            : key === 'del'
                                ? 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 flex items-center justify-center'
                                : 'bg-zinc-800 text-white hover:bg-zinc-700 hover:scale-105 active:scale-95'
                            }`}
                    >
                        {key === 'del' ? (
                            <span className="material-symbols-outlined text-xl">backspace</span>
                        ) : (
                            key
                        )}
                    </button>
                ))}
            </div>

            {/* Forgot PIN */}
            {hasPin && (
                <button
                    onClick={handleClearData}
                    className="text-zinc-600 text-xs hover:text-red-400 transition-colors"
                >
                    忘记 PIN？重置所有数据
                </button>
            )}

            {/* Shake Animation */}
            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
        </div>
    );
};

export default PinLockScreen;
