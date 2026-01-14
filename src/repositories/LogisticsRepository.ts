/**
 * Logistics Repository
 * 物流渠道数据访问层
 */

import { LogisticsChannel } from '../types';
import { IStorage, defaultStorage } from './Storage';
import { STORAGE_KEYS } from './StorageKeys';

export interface ILogisticsRepository {
    getAll(): LogisticsChannel[];
    getById(id: string): LogisticsChannel | undefined;
    add(channel: Omit<LogisticsChannel, 'id'>): LogisticsChannel;
    update(id: string, updates: Partial<LogisticsChannel>): LogisticsChannel | undefined;
    delete(id: string): boolean;
    clear(): void;
}

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

export class LogisticsRepository implements ILogisticsRepository {
    private storage: IStorage;

    constructor(storage: IStorage = defaultStorage) {
        this.storage = storage;
        this.initDefaults();
    }

    private initDefaults(): void {
        const existing = this.storage.get<LogisticsChannel[]>(STORAGE_KEYS.LOGISTICS_CHANNELS);
        if (!existing || existing.length === 0) {
            this.storage.set(STORAGE_KEYS.LOGISTICS_CHANNELS, DEFAULT_CHANNELS);
        }
    }

    private generateId(): string {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }

    getAll(): LogisticsChannel[] {
        return this.storage.get<LogisticsChannel[]>(STORAGE_KEYS.LOGISTICS_CHANNELS) || DEFAULT_CHANNELS;
    }

    getById(id: string): LogisticsChannel | undefined {
        return this.getAll().find(c => c.id === id);
    }

    add(channel: Omit<LogisticsChannel, 'id'>): LogisticsChannel {
        const channels = this.getAll();
        const newChannel: LogisticsChannel = {
            ...channel,
            id: this.generateId(),
        };
        channels.push(newChannel);
        this.storage.set(STORAGE_KEYS.LOGISTICS_CHANNELS, channels);
        return newChannel;
    }

    update(id: string, updates: Partial<LogisticsChannel>): LogisticsChannel | undefined {
        const channels = this.getAll();
        const index = channels.findIndex(c => c.id === id);
        if (index === -1) return undefined;

        channels[index] = { ...channels[index], ...updates };
        this.storage.set(STORAGE_KEYS.LOGISTICS_CHANNELS, channels);
        return channels[index];
    }

    delete(id: string): boolean {
        const channels = this.getAll();
        const filtered = channels.filter(c => c.id !== id);
        if (filtered.length === channels.length) return false;

        this.storage.set(STORAGE_KEYS.LOGISTICS_CHANNELS, filtered);
        return true;
    }

    clear(): void {
        this.storage.set(STORAGE_KEYS.LOGISTICS_CHANNELS, []);
    }
}

// 默认实例
export const logisticsRepository = new LogisticsRepository();
