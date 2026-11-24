import { BatchLot, Product, getExpiryStatus } from '@/types';

/**
 * Ensures every product has an explicit batch list aligned with `product.quantity`.
 * Preserves existing multi-batch records and initializes single-batch products smoothly.
 */
export function normalizeProductBatches(product: Product): BatchLot[] {
  if (product.batches && product.batches.length > 0) {
    const clean = product.batches
      .filter((b) => b.quantity > 0)
      .map((b) => ({
        batchNumber: b.batchNumber || product.batchNumber || 'UNASSIGNED',
        expiryDate: b.expiryDate ?? product.expiryDate,
        quantity: b.quantity,
      }));
    const total = clean.reduce((sum, b) => sum + b.quantity, 0);
    if (total === product.quantity) return clean;
  }

  if (product.quantity <= 0) return [];

  return [
    {
      batchNumber: product.batchNumber || 'UNASSIGNED',
      expiryDate: product.expiryDate,
      quantity: product.quantity,
    },
  ];
}

/**
 * Derives the primary display batch & expiry (earliest non-expired batch, or earliest batch if all expired).
 */
export function derivePrimaryBatch(
  batches: BatchLot[],
  fallbackBatch?: string,
  fallbackExpiry?: string
): { batchNumber?: string; expiryDate?: string } {
  const active = batches.filter((b) => b.quantity > 0);
  if (active.length === 0) {
    return { batchNumber: fallbackBatch, expiryDate: fallbackExpiry };
  }

  const valid = active
    .filter((b) => getExpiryStatus(b.expiryDate) !== 'expired')
    .sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'));

  if (valid.length > 0) {
    return { batchNumber: valid[0].batchNumber, expiryDate: valid[0].expiryDate };
  }

  const sorted = [...active].sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'));
  return { batchNumber: sorted[0].batchNumber, expiryDate: sorted[0].expiryDate };
}

/**
 * Total sellable (non-expired) units across all batches of a medicine.
 */
export function availableSellableQuantity(product: Product): number {
  const batches = normalizeProductBatches(product);
  return batches
    .filter((b) => getExpiryStatus(b.expiryDate) !== 'expired')
    .reduce((sum, b) => sum + b.quantity, 0);
}

/**
 * Adds a received purchase quantity to a matching (batchNumber, expiryDate) lot
 * or creates a new distinct batch lot without overwriting existing stock batches.
 */
export function addBatchLot(
  product: Product,
  quantity: number,
  batchNumber?: string,
  expiryDate?: string
): { batches: BatchLot[]; batchNumber?: string; expiryDate?: string } {
  const batches = normalizeProductBatches(product).map((b) => ({ ...b }));
  if (quantity <= 0) {
    const primary = derivePrimaryBatch(batches, product.batchNumber, product.expiryDate);
    return { batches, ...primary };
  }

  const targetBatch = (batchNumber?.trim().toUpperCase() || product.batchNumber || 'UNASSIGNED');
  const targetExpiry = expiryDate?.trim() || product.expiryDate;

  const existing = batches.find(
    (b) => b.batchNumber.toUpperCase() === targetBatch.toUpperCase() && (b.expiryDate || '') === (targetExpiry || '')
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    batches.push({
      batchNumber: targetBatch,
      expiryDate: targetExpiry,
      quantity,
    });
  }

  const primary = derivePrimaryBatch(batches, targetBatch, targetExpiry);
  return { batches, ...primary };
}

/**
 * Deducts units using First-Expired-First-Out (FEFO) strictly from valid non-expired batches.
 */
export function deductBatchesFEFO(
  product: Product,
  requested: number
): { ok: true; batches: BatchLot[]; deducted: BatchLot[]; batchNumber?: string; expiryDate?: string } | { ok: false; error: string } {
  const allBatches = normalizeProductBatches(product).map((b) => ({ ...b }));
  const validBatches = allBatches
    .filter((b) => b.quantity > 0 && getExpiryStatus(b.expiryDate) !== 'expired')
    .sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'));

  const sellable = validBatches.reduce((sum, b) => sum + b.quantity, 0);

  if (sellable === 0 && product.quantity > 0) {
    return {
      ok: false,
      error: `Cannot sell expired medicine: ${product.name} (Batch ${product.batchNumber || 'N/A'}) expired on ${product.expiryDate}.`,
    };
  }

  if (requested > sellable) {
    const expiredUnits = product.quantity - sellable;
    if (expiredUnits > 0 && requested <= product.quantity) {
      return {
        ok: false,
        error: `Only ${sellable} non-expired ${product.unit.toLowerCase()}(s) of ${product.name} available (${expiredUnits} expired units excluded).`,
      };
    }
    return {
      ok: false,
      error: `Insufficient stock for ${product.name}: ${sellable} available, ${requested} requested.`,
    };
  }

  let remaining = requested;
  const deducted: BatchLot[] = [];

  for (const lot of validBatches) {
    if (remaining <= 0) break;
    const take = Math.min(lot.quantity, remaining);
    lot.quantity -= take;
    remaining -= take;
    deducted.push({
      batchNumber: lot.batchNumber,
      expiryDate: lot.expiryDate,
      quantity: take,
    });
  }

  const nextBatches = allBatches.filter((b) => b.quantity > 0);
  const primary = derivePrimaryBatch(nextBatches, product.batchNumber, product.expiryDate);
  return { ok: true, batches: nextBatches, deducted, ...primary };
}

/**
 * Restores batch quantities when a sale is cancelled.
 */
export function restoreBatchLots(
  product: Product,
  breakdown: BatchLot[] | undefined,
  fallbackQty: number,
  fallbackBatch?: string,
  fallbackExpiry?: string
): { batches: BatchLot[]; batchNumber?: string; expiryDate?: string } {
  let current = normalizeProductBatches(product).map((b) => ({ ...b }));
  let currentQty = current.reduce((sum, b) => sum + b.quantity, 0);
  const toRestore =
    breakdown && breakdown.length > 0
      ? breakdown
      : [{ batchNumber: fallbackBatch || product.batchNumber || 'UNASSIGNED', expiryDate: fallbackExpiry || product.expiryDate, quantity: fallbackQty }];

  for (const item of toRestore) {
    if (item.quantity <= 0) continue;
    const res = addBatchLot(
      { ...product, quantity: currentQty, batches: current },
      item.quantity,
      item.batchNumber,
      item.expiryDate
    );
    current = res.batches;
    currentQty += item.quantity;
  }

  const primary = derivePrimaryBatch(current, product.batchNumber, product.expiryDate);
  return { batches: current, ...primary };
}

/**
 * Adjusts batch quantities cleanly when an inventory audit adjustment occurs.
 */
export function adjustProductBatches(
  product: Product,
  change: number
): { batches: BatchLot[]; batchNumber?: string; expiryDate?: string } {
  if (change >= 0) {
    return addBatchLot(product, change, product.batchNumber, product.expiryDate);
  }

  const allBatches = normalizeProductBatches(product)
    .map((b) => ({ ...b }))
    .sort((a, b) => (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31'));

  let toRemove = Math.abs(change);
  for (const lot of allBatches) {
    if (toRemove <= 0) break;
    const take = Math.min(lot.quantity, toRemove);
    lot.quantity -= take;
    toRemove -= take;
  }

  const nextBatches = allBatches.filter((b) => b.quantity > 0);
  const primary = derivePrimaryBatch(nextBatches, product.batchNumber, product.expiryDate);
  return { batches: nextBatches, ...primary };
}
