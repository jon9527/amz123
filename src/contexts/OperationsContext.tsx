import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RestockSetting, PromotionPlan } from '../types';

// ============ Context Types ============
interface OperationsContextType {
    // Restock Settings
    restockSettings: RestockSetting[];
    addRestockSetting: (setting: Omit<RestockSetting, 'id' | 'createdAt' | 'updatedAt'>) => RestockSetting;
    updateRestockSetting: (id: string, updates: Partial<RestockSetting>) => void;
    deleteRestockSetting: (id: string) => void;
    getRestockSettingByProductId: (productId: string) => RestockSetting | undefined;

    // Promotion Plans
    promotionPlans: PromotionPlan[];
    addPromotionPlan: (plan: Omit<PromotionPlan, 'id' | 'createdAt' | 'updatedAt'>) => PromotionPlan;
    updatePromotionPlan: (id: string, updates: Partial<PromotionPlan>) => void;
    deletePromotionPlan: (id: string) => void;
    getPromotionPlansByProductId: (productId: string) => PromotionPlan[];
}

const OperationsContext = createContext<OperationsContextType | undefined>(undefined);

// ============ Storage Keys ============
const RESTOCK_STORAGE_KEY = 'amazon_restock_settings';
const PROMOTION_STORAGE_KEY = 'amazon_promotion_plans';

// ============ Helpers ============
const generateId = () => `ops_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============ Provider ============
export const OperationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [restockSettings, setRestockSettings] = useState<RestockSetting[]>([]);
    const [promotionPlans, setPromotionPlans] = useState<PromotionPlan[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from localStorage
    useEffect(() => {
        try {
            const savedRestock = localStorage.getItem(RESTOCK_STORAGE_KEY);
            if (savedRestock) setRestockSettings(JSON.parse(savedRestock));

            const savedPromotion = localStorage.getItem(PROMOTION_STORAGE_KEY);
            if (savedPromotion) setPromotionPlans(JSON.parse(savedPromotion));
        } catch { }
        setIsInitialized(true);
    }, []);

    // Save to localStorage
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(RESTOCK_STORAGE_KEY, JSON.stringify(restockSettings));
        }
    }, [restockSettings, isInitialized]);

    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(PROMOTION_STORAGE_KEY, JSON.stringify(promotionPlans));
        }
    }, [promotionPlans, isInitialized]);

    // ============ Restock Settings CRUD ============
    const addRestockSetting = (setting: Omit<RestockSetting, 'id' | 'createdAt' | 'updatedAt'>): RestockSetting => {
        const now = Date.now();
        const newSetting: RestockSetting = {
            ...setting,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
        };
        setRestockSettings((prev) => [...prev, newSetting]);
        return newSetting;
    };

    const updateRestockSetting = (id: string, updates: Partial<RestockSetting>) => {
        setRestockSettings((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s))
        );
    };

    const deleteRestockSetting = (id: string) => {
        setRestockSettings((prev) => prev.filter((s) => s.id !== id));
    };

    const getRestockSettingByProductId = (productId: string) =>
        restockSettings.find((s) => s.productId === productId);

    // ============ Promotion Plans CRUD ============
    const addPromotionPlan = (plan: Omit<PromotionPlan, 'id' | 'createdAt' | 'updatedAt'>): PromotionPlan => {
        const now = Date.now();
        const newPlan: PromotionPlan = {
            ...plan,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
        };
        setPromotionPlans((prev) => [...prev, newPlan]);
        return newPlan;
    };

    const updatePromotionPlan = (id: string, updates: Partial<PromotionPlan>) => {
        setPromotionPlans((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p))
        );
    };

    const deletePromotionPlan = (id: string) => {
        setPromotionPlans((prev) => prev.filter((p) => p.id !== id));
    };

    const getPromotionPlansByProductId = (productId: string) =>
        promotionPlans.filter((p) => p.productId === productId);

    return (
        <OperationsContext.Provider
            value={{
                restockSettings,
                addRestockSetting,
                updateRestockSetting,
                deleteRestockSetting,
                getRestockSettingByProductId,
                promotionPlans,
                addPromotionPlan,
                updatePromotionPlan,
                deletePromotionPlan,
                getPromotionPlansByProductId,
            }}
        >
            {children}
        </OperationsContext.Provider>
    );
};

// ============ Hook ============
export const useOperations = (): OperationsContextType => {
    const context = useContext(OperationsContext);
    if (!context) {
        throw new Error('useOperations must be used within an OperationsProvider');
    }
    return context;
};
