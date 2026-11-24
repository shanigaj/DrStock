import { OrderLineInput } from '@/types';
import { roundMoney } from './utils';

export interface OrderTotals {
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
}

export function calculateOrderTotals(lines: OrderLineInput[], gstPercent = 0): OrderTotals {
  const subtotal = roundMoney(lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0));
  const gstAmount = roundMoney((subtotal * gstPercent) / 100);
  return { subtotal, gstAmount, grandTotal: roundMoney(subtotal + gstAmount) };
}

/** Total requested quantity per product across all lines (a product may appear on several lines). */
export function quantityByProduct(lines: OrderLineInput[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.productId, (map.get(l.productId) ?? 0) + l.quantity);
  return map;
}

/** Validates line shape (not stock). Returns an error message or null. */
export function validateOrderLines(lines: OrderLineInput[]): string | null {
  if (lines.length === 0) return 'Add at least one product.';
  const seen = new Set<string>();
  for (const l of lines) {
    if (!l.productId) return 'Every line needs a product.';
    if (seen.has(l.productId)) return 'Each product can only appear once per order. Combine the quantities into one line.';
    seen.add(l.productId);
    if (!Number.isInteger(l.quantity) || l.quantity <= 0) return 'Quantities must be whole numbers greater than zero.';
    if (!Number.isFinite(l.unitPrice) || l.unitPrice < 0) return 'Unit prices cannot be negative.';
  }
  return null;
}
