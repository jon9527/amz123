
import {
    calculateFBAFee,
    getInboundPlacementFee,
    getMonthlyStorageFee,
    getRemovalDisposalFee,
    getReturnsProcessingFee,
    getProductTier,
    cmToInch,
    kgToLb
} from './src/utils/fbaCalculator.utils.ts';

const runVerification = () => {
    console.log("=== Verifying Comprehensive FBA Fees (2026) ===\n");

    // Test Case: Standard T-Shirt (Apparel)
    // Dims: 35 x 25 x 2 cm
    // Weight: 0.25 kg
    const product = {
        length: 35, // 13.8"
        width: 25,  // 9.8"
        height: 2,  // 0.8"
        weight: 0.25 // 0.55 lb
    };

    const lengthIn = cmToInch(product.length);
    const widthIn = cmToInch(product.width);
    const heightIn = cmToInch(product.height);
    const weightLb = kgToLb(product.weight);

    console.log(`Product: T-Shirt`);
    console.log(`Dims (cm): ${product.length}x${product.width}x${product.height}, ${product.weight}kg`);
    console.log(`Dims (in): ${lengthIn.toFixed(1)}x${widthIn.toFixed(1)}x${heightIn.toFixed(1)}, ${weightLb.toFixed(2)}lb`);

    const tier = getProductTier(product);
    console.log(`Tier: ${tier}`); // Expect Large Standard (mainly due to dims/weight)

    // 1. FBA Fee (Apparel)
    const fbaFee = calculateFBAFee(product, 'apparel', 29.99);
    console.log(`1. FBA Fee (Apparel): $${fbaFee} (Expected: ~$4.30 for Large Std 0.5-0.75lb?)`);
    // Check Table: Large Std 0.5-0.75lb -> 4.56? weightLb is 0.55.
    // Wait, 0.55 lb is > 0.5. Range 0.5-0.75?
    // Table: { maxWeight: 0.75, fee: 4.56 }
    // Let's see result.

    // 2. Monthly Storage (Oct-Dec)
    const storageFee = getMonthlyStorageFee(tier, lengthIn, widthIn, heightIn, 'oct_dec');
    console.log(`2. Monthly Storage (Peak): $${storageFee}`);

    // 3. Inbound Placement (Minimal Split)
    const placementFee = getInboundPlacementFee(tier, weightLb, 'minimal');
    console.log(`3. Placement Fee (Minimal): $${placementFee}`);

    // 4. Returns Processing (Apparel)
    const retFee = getReturnsProcessingFee(tier, weightLb, 'apparel');
    console.log(`4. Returns Processing (Apparel): $${retFee}`);

    // 5. Removal Fee
    const remFee = getRemovalDisposalFee(tier, weightLb);
    console.log(`5. Removal Fee: $${remFee}`);

    console.log("\n=== specific check: Non-Apparel Small Item ===");
    // Case 2: Phone Case
    // 15 x 8 x 1.5 cm, 0.05 kg (0.11 lb)
    const p2 = { length: 15, width: 8, height: 1.5, weight: 0.05 };
    const t2 = getProductTier(p2);
    const w2 = kgToLb(p2.weight);
    console.log(`Phone Case Tier: ${t2}, Weight: ${w2.toFixed(3)} lb`);

    // FBA Low Price (<$10)
    const fbaLow = calculateFBAFee(p2, 'standard', 8.99);
    console.log(`FBA Low Price (<$10): $${fbaLow}`);

    // Placement Optimized (Free)
    const placeOpt = getInboundPlacementFee(t2, w2, 'optimized');
    console.log(`Placement (Optimized): $${placeOpt}`);

};

runVerification();
