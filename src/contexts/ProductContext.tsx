import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProductSpec } from '../types';

// ============ Context Types ============
interface ProductContextType {
    products: ProductSpec[];
    selectedProductId: string | null;
    selectedProduct: ProductSpec | null;
    addProduct: (product: Omit<ProductSpec, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateProduct: (id: string, updates: Partial<ProductSpec>) => void;
    deleteProduct: (id: string) => void;
    selectProduct: (id: string | null) => void;
    getProductById: (id: string) => ProductSpec | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// ============ Storage Key ============
const STORAGE_KEY = 'amazon_product_library';

// ============ Provider ============
export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<ProductSpec[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setProducts(JSON.parse(saved));
            } catch { }
        }
        setIsInitialized(true);
    }, []);

    // Save to localStorage (only after initial load)
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        }
    }, [products, isInitialized]);

    const addProduct = (product: Omit<ProductSpec, 'id' | 'createdAt' | 'updatedAt'>) => {
        const now = Date.now();

        // Generate robust Display ID: P + YYMMDD + 4 Random Alphanumeric (Upper)
        // Example: P241228X9A2
        const date = new Date();
        const yymmdd = `${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const displayId = product.displayId || `P${yymmdd}${randomSuffix}`;

        const newProduct: ProductSpec = {
            ...product,
            id: `prod_${now}_${Math.random().toString(36).substr(2, 9)}`,
            displayId,
            createdAt: now,
            updatedAt: now,
        };
        setProducts((prev) => [...prev, newProduct]);
    };

    const updateProduct = (id: string, updates: Partial<ProductSpec>) => {
        setProducts((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
            )
        );
    };

    const deleteProduct = (id: string) => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        if (selectedProductId === id) {
            setSelectedProductId(null);
        }
    };

    const selectProduct = (id: string | null) => {
        setSelectedProductId(id);
    };

    const getProductById = (id: string) => products.find((p) => p.id === id);

    const selectedProduct = selectedProductId
        ? products.find((p) => p.id === selectedProductId) || null
        : null;

    return (
        <ProductContext.Provider
            value={{
                products,
                selectedProductId,
                selectedProduct,
                addProduct,
                updateProduct,
                deleteProduct,
                selectProduct,
                getProductById,
            }}
        >
            {children}
        </ProductContext.Provider>
    );
};

// ============ Hook ============
export const useProducts = (): ProductContextType => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error('useProducts must be used within a ProductProvider');
    }
    return context;
};
