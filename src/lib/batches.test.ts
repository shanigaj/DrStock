import { describe, it, expect } from 'vitest';
import { Product } from '@/types';
import {
  addBatchLot,
  adjustProductBatches,
  availableSellableQuantity,
  deductBatchesFEFO,
  normalizeProductBatches,
  restoreBatchLots,
} from './batches';

function daysFromToday(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    sku: 'MED-001',
    name: 'Amoxicillin 500mg',
    category: 'Capsules',
    batchNumber: 'AMX-101',
    expiryDate: daysFromToday(180),
    description: 'Antibiotic capsule',
    costPrice: 40,
    sellingPrice: 65,
    quantity: 50,
    minimumStock: 10,
    unit: 'Strip',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('batch & FEFO engine', () => {
  it('adds a new batch lot without overwriting existing stock batch or expiry', () => {
    const initialExpiry = daysFromToday(120);
    const newExpiry = daysFromToday(500);
    const product = makeProduct({
      batchNumber: 'LOT-OLD',
      expiryDate: initialExpiry,
      quantity: 50,
    });

    const res = addBatchLot(product, 30, 'lot-new', newExpiry);
    expect(res.batches).toEqual([
      { batchNumber: 'LOT-OLD', expiryDate: initialExpiry, quantity: 50 },
      { batchNumber: 'LOT-NEW', expiryDate: newExpiry, quantity: 30 },
    ]);
    expect(res.batchNumber).toBe('LOT-OLD');
    expect(res.expiryDate).toBe(initialExpiry);

    // Receiving more of the same batch/expiry merges quantity cleanly
    const merged = addBatchLot({ ...product, quantity: 80, batches: res.batches }, 20, 'LOT-NEW', newExpiry);
    expect(merged.batches).toHaveLength(2);
    expect(merged.batches[1].quantity).toBe(50);
  });

  it('calculates sellable quantity excluding expired batches and deducts in FEFO order', () => {
    const expiredDate = daysFromToday(-30);
    const earlyValid = daysFromToday(45);
    const laterValid = daysFromToday(365);

    const product = makeProduct({
      quantity: 65,
      batchNumber: 'LOT-EXP',
      expiryDate: expiredDate,
      batches: [
        { batchNumber: 'LOT-EXP', expiryDate: expiredDate, quantity: 10 },
        { batchNumber: 'LOT-LATER', expiryDate: laterValid, quantity: 40 },
        { batchNumber: 'LOT-EARLY', expiryDate: earlyValid, quantity: 15 },
      ],
    });

    expect(availableSellableQuantity(product)).toBe(55);

    // Cannot sell beyond sellable non-expired quantity
    const overRequest = deductBatchesFEFO(product, 60);
    expect(overRequest.ok).toBe(false);
    if (!overRequest.ok) {
      expect(overRequest.error).toContain('expired units excluded');
    }

    // Deduct 20: takes all 15 from LOT-EARLY then 5 from LOT-LATER
    const res = deductBatchesFEFO(product, 20);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.deducted).toEqual([
        { batchNumber: 'LOT-EARLY', expiryDate: earlyValid, quantity: 15 },
        { batchNumber: 'LOT-LATER', expiryDate: laterValid, quantity: 5 },
      ]);
      expect(res.batches).toEqual([
        { batchNumber: 'LOT-EXP', expiryDate: expiredDate, quantity: 10 },
        { batchNumber: 'LOT-LATER', expiryDate: laterValid, quantity: 35 },
      ]);
      // Primary display batch should move to earliest remaining valid batch
      expect(res.batchNumber).toBe('LOT-LATER');
      expect(res.expiryDate).toBe(laterValid);
    }
  });

  it('blocks selling when all available batches are expired', () => {
    const expiredDate = daysFromToday(-10);
    const product = makeProduct({
      quantity: 20,
      batchNumber: 'LOT-EXP',
      expiryDate: expiredDate,
      batches: [{ batchNumber: 'LOT-EXP', expiryDate: expiredDate, quantity: 20 }],
    });

    const res = deductBatchesFEFO(product, 2);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('Cannot sell expired medicine');
    }
  });

  it('restores exact batch breakdown when a sale is cancelled', () => {
    const earlyValid = daysFromToday(45);
    const laterValid = daysFromToday(365);

    const product = makeProduct({
      quantity: 35,
      batchNumber: 'LOT-LATER',
      expiryDate: laterValid,
      batches: [{ batchNumber: 'LOT-LATER', expiryDate: laterValid, quantity: 35 }],
    });

    const restored = restoreBatchLots(
      product,
      [
        { batchNumber: 'LOT-EARLY', expiryDate: earlyValid, quantity: 15 },
        { batchNumber: 'LOT-LATER', expiryDate: laterValid, quantity: 5 },
      ],
      20
    );

    expect(restored.batches).toEqual([
      { batchNumber: 'LOT-LATER', expiryDate: laterValid, quantity: 40 },
      { batchNumber: 'LOT-EARLY', expiryDate: earlyValid, quantity: 15 },
    ]);
    expect(restored.batchNumber).toBe('LOT-EARLY');
    expect(restored.expiryDate).toBe(earlyValid);
  });

  it('normalizes legacy single-batch products and adjusts earliest expiry first on negative audit', () => {
    const d1 = daysFromToday(30);
    const d2 = daysFromToday(200);
    const legacy = makeProduct({ quantity: 25, batches: undefined });
    expect(normalizeProductBatches(legacy)).toEqual([
      { batchNumber: 'AMX-101', expiryDate: legacy.expiryDate, quantity: 25 },
    ]);

    const multi = makeProduct({
      quantity: 30,
      batchNumber: 'B1',
      expiryDate: d1,
      batches: [
        { batchNumber: 'B1', expiryDate: d1, quantity: 10 },
        { batchNumber: 'B2', expiryDate: d2, quantity: 20 },
      ],
    });
    const adjusted = adjustProductBatches(multi, -12);
    expect(adjusted.batches).toEqual([{ batchNumber: 'B2', expiryDate: d2, quantity: 18 }]);
    expect(adjusted.batchNumber).toBe('B2');
  });
});
