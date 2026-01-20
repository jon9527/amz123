import { useMemo } from 'react';
import { useProducts } from '../contexts/ProductContext';
import { ProductSpec } from '../types';
import { SkuParentGroup } from '../types/skuTypes';
import { STORAGE_KEYS } from '../repositories/StorageKeys';

/**
 * Hook to get all products including manually created ones (from Context)
 * and imported SKU groups (from localStorage).
 */
export const useCombinedProducts = () => {
    const { products: contextProducts } = useProducts();

    const skuProducts = useMemo<ProductSpec[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.SKU_GROUPS) || localStorage.getItem('sku_groups_data');
            if (!saved) return [];
            const groups: SkuParentGroup[] = JSON.parse(saved);

            return groups.map(g => ({
                id: g.parentAsin, // Use parentAsin as ID for imported groups
                name: g.品名 || g.parentAsin,
                sku: g.款号,
                asin: g.parentAsin,
                length: g.length || 0,
                width: g.width || 0,
                height: g.height || 0,
                weight: g.weight || 0,
                boxLength: g.boxLength || 0,
                boxWidth: g.boxWidth || 0,
                boxHeight: g.boxHeight || 0,
                boxWeight: g.boxWeight || 0,
                pcsPerBox: g.pcsPerBox || 1,
                unitCost: g.unitCost || 0,
                defaultPrice: g.defaultPrice || 0,
                tags: [],
                notes: g.notes,
                imageUrl: '',
                // Use a stable timestamp or 0 since these persist in local storage but don't track updated/created normally
                createdAt: 0,
                updatedAt: 0,
                fbaFeeManual: g.fbaFeeManual || 0,
                category: g.category || (g.productType === 'apparel' ? 'apparel' : 'standard'),
                inboundPlacementMode: g.inboundPlacementMode || 'optimized',
                defaultStorageMonth: g.defaultStorageMonth || 'jan_sep',
                displayType: g.displayType || 'standard',
                defaultShippingRate: 0,
            }));
        } catch (e) {
            console.error('Failed to load sku groups', e);
            return [];
        }
    }, []);

    return useMemo(() => {
        // Simple merge: Context products first, then imported SKUs
        // Check for ID collision just in case
        const contextIds = new Set(contextProducts.map(p => p.id));
        const nonDuplicateSkus = skuProducts.filter(p => !contextIds.has(p.id));

        return [...contextProducts, ...nonDuplicateSkus];
    }, [contextProducts, skuProducts]);
};
