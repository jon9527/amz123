import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LogisticsChannel } from './types';

interface LogisticsContextType {
    channels: LogisticsChannel[];
    addChannel: (channel: Omit<LogisticsChannel, 'id'>) => void;
    updateChannel: (id: string, updates: Partial<LogisticsChannel>) => void;
    deleteChannel: (id: string) => void;
    getChannel: (id: string) => LogisticsChannel | undefined;
}

const LogisticsContext = createContext<LogisticsContextType | undefined>(undefined);

const STORAGE_KEY = 'amazon_logistics_channels_v1';

// Default preset channels if none exist
const DEFAULT_CHANNELS: LogisticsChannel[] = [
    {
        id: '1',
        name: '美森限时达 (Matson)',
        type: 'sea',
        carrier: 'Matson',
        status: 'active',
        pricePerCbm: 1200,
        volDivisor: 6000,
        minWeight: 21,
        deliveryDays: 14,
        slowDays: 18
    },
    {
        id: '2',
        name: '快船海派 (Sea Express)',
        type: 'sea',
        carrier: 'ZIM/EMC',
        status: 'active',
        pricePerCbm: 850,
        volDivisor: 6000,
        minWeight: 21,
        deliveryDays: 20,
        slowDays: 25
    },
    {
        id: '3',
        name: '普船海卡 (Sea Truck)',
        type: 'sea',
        carrier: 'COSCO',
        status: 'active',
        pricePerCbm: 450,
        volDivisor: 6000,
        minWeight: 100,
        deliveryDays: 35,
        slowDays: 50
    },
    {
        id: '4',
        name: '空派专线 (Air DDP)',
        type: 'air',
        carrier: 'Air Cargo',
        status: 'active',
        pricePerKg: 42,
        volDivisor: 6000,
        minWeight: 21,
        deliveryDays: 10,
        slowDays: 15
    },
    {
        id: '5',
        name: '红单快递 (UPS/DHL)',
        type: 'exp',
        carrier: 'UPS',
        status: 'active',
        pricePerKg: 38,
        volDivisor: 5000,
        deliveryDays: 5,
        slowDays: 7
    }
];

export const LogisticsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [channels, setChannels] = useState<LogisticsChannel[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setChannels(JSON.parse(saved));
            } catch { }
        } else {
            // Load defaults
            setChannels(DEFAULT_CHANNELS);
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
        }
    }, [channels, isInitialized]);

    const addChannel = (channel: Omit<LogisticsChannel, 'id'>) => {
        const newChannel: LogisticsChannel = {
            ...channel,
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };
        setChannels(prev => [...prev, newChannel]);
    };

    const updateChannel = (id: string, updates: Partial<LogisticsChannel>) => {
        setChannels(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const deleteChannel = (id: string) => {
        setChannels(prev => prev.filter(c => c.id !== id));
    };

    const getChannel = (id: string) => channels.find(c => c.id === id);

    return (
        <LogisticsContext.Provider value={{ channels, addChannel, updateChannel, deleteChannel, getChannel }}>
            {children}
        </LogisticsContext.Provider>
    );
};

export const useLogistics = (): LogisticsContextType => {
    const context = useContext(LogisticsContext);
    if (!context) {
        throw new Error('useLogistics must be used within a LogisticsProvider');
    }
    return context;
};
