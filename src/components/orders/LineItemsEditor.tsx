'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Product, OrderLineInput } from '@/types';
import { availableSellableQuantity } from '@/lib/batches';
import { formatCurrency } from '@/lib/utils';

export interface LineDraft {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}

let lineSeq = 0;
export function newLine(product?: Product, mode: 'sale' | 'purchase' = 'sale', quantity = 1): LineDraft {
  lineSeq += 1;
  return {
    key: `line-${lineSeq}`,
    productId: product?.id ?? '',
    quantity: String(quantity),
    unitPrice: product ? String(mode === 'sale' ? product.sellingPrice : product.costPrice) : '',
  };
}

export function toOrderLines(lines: LineDraft[]): OrderLineInput[] {
  return lines.map((l) => ({
    productId: l.productId,
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
  }));
}

export function lineError(line: LineDraft, product: Product | undefined, mode: 'sale' | 'purchase'): string | null {
  if (!product) return 'Select a medicine';
  const sellable = availableSellableQuantity(product);
  if (mode === 'sale' && sellable === 0) {
    return product.quantity > 0
      ? `All ${product.quantity} units are expired (${product.batchNumber || 'Batch'} exp ${product.expiryDate})`
      : 'Out of stock';
  }
  const qty = Number(line.quantity);
  if (line.quantity.trim() === '' || !Number.isInteger(qty) || qty <= 0) return 'Enter a whole number above 0';
  if (mode === 'sale' && qty > sellable) return `Only ${sellable} sellable units available`;
  const price = Number(line.unitPrice);
  if (line.unitPrice.trim() === '' || !Number.isFinite(price) || price < 0) return 'Enter a valid price';
  return null;
}

interface Props {
  mode: 'sale' | 'purchase';
  lines: LineDraft[];
  products: Product[];
  onChange: (lines: LineDraft[]) => void;
  showErrors: boolean;
}

export default function LineItemsEditor({ mode, lines, products, onChange, showErrors }: Props) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const usedIds = new Set(lines.map((l) => l.productId));
  const selectable = products.filter(
    (p) => !usedIds.has(p.id) && (mode === 'purchase' || availableSellableQuantity(p) > 0)
  );

  const update = (key: string, patch: Partial<LineDraft>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const changeProduct = (key: string, productId: string) => {
    const p = byId.get(productId);
    update(key, { productId, unitPrice: p ? String(mode === 'sale' ? p.sellingPrice : p.costPrice) : '' });
  };

  const inputBase =
    'w-full h-9 px-2.5 text-[13px] bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider">Medicine Line Items</h3>
        <button
          type="button"
          onClick={() => onChange([...lines, newLine(selectable[0], mode, mode === 'sale' ? 1 : 10)])}
          disabled={selectable.length === 0}
          className="text-xs font-semibold text-primary hover:text-primary-hover disabled:text-subtle disabled:cursor-not-allowed flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-primary-subtle transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Medicine
        </button>
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_92px_96px_120px_110px_32px] gap-2 px-3 pb-1.5 text-[11px] font-medium text-muted uppercase tracking-wider">
        <span>Medicine</span>
        <span className="text-right">{mode === 'sale' ? 'Sellable' : 'In stock'}</span>
        <span>Qty</span>
        <span>{mode === 'sale' ? 'Unit price' : 'Unit cost'}</span>
        <span className="text-right">Line total</span>
        <span />
      </div>

      <div className="space-y-2">
        {lines.length === 0 && (
          <p className="text-[13px] text-muted border border-dashed border-border rounded-lg py-6 text-center">
            No medicines added yet.
          </p>
        )}
        {lines.map((line) => {
          const product = byId.get(line.productId);
          const err = showErrors || line.quantity !== '' ? lineError(line, product, mode) : null;
          const qty = Number(line.quantity) || 0;
          const price = Number(line.unitPrice) || 0;
          const options = products.filter((p) => p.id === line.productId || !usedIds.has(p.id));
          const sellable = product ? availableSellableQuantity(product) : 0;
          const overStock = mode === 'sale' && product && qty > sellable;

          return (
            <div
              key={line.key}
              className={`rounded-lg border p-3 sm:p-2 ${
                err && (showErrors || overStock) ? 'border-danger/40 bg-danger-bg/40' : 'border-border bg-surface'
              }`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_92px_96px_120px_110px_32px] gap-2 items-center">
                <div className="col-span-2 sm:col-span-1">
                  <label className="sr-only" htmlFor={`${line.key}-product`}>
                    Medicine
                  </label>
                  <select
                    id={`${line.key}-product`}
                    value={line.productId}
                    onChange={(e) => changeProduct(line.key, e.target.value)}
                    className={`${inputBase} border-border`}
                  >
                    <option value="" disabled>
                      Select medicine…
                    </option>
                    {options.map((p) => {
                      const avail = availableSellableQuantity(p);
                      const disabled = mode === 'sale' && avail <= 0;
                      const labelNote =
                        mode === 'sale' && avail <= 0
                          ? p.quantity > 0
                            ? ' (Expired)'
                            : ' (Out of stock)'
                          : '';
                      return (
                        <option key={p.id} value={p.id} disabled={disabled}>
                          {p.name} · {p.sku}
                          {labelNote}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="text-xs sm:text-[13px] sm:text-right text-muted sm:text-secondary-text order-last sm:order-none col-span-2 sm:col-span-1">
                  <span className="sm:hidden">{mode === 'sale' ? 'Sellable: ' : 'In stock: '}</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      product && (mode === 'sale' ? sellable : product.quantity) <= product.minimumStock
                        ? 'text-warning'
                        : 'text-foreground'
                    }`}
                  >
                    {product ? `${mode === 'sale' ? sellable : product.quantity}` : '—'}
                  </span>
                  {product && <span className="text-muted"> {product.unit.toLowerCase()}</span>}
                </div>
                <div>
                  <label className="text-[11px] text-muted sm:sr-only" htmlFor={`${line.key}-qty`}>
                    Quantity
                  </label>
                  <input
                    id={`${line.key}-qty`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    max={mode === 'sale' ? sellable : undefined}
                    value={line.quantity}
                    onChange={(e) => update(line.key, { quantity: e.target.value })}
                    aria-invalid={Boolean(overStock)}
                    className={`${inputBase} font-semibold tabular-nums ${
                      overStock ? 'border-danger text-danger' : 'border-border'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted sm:sr-only" htmlFor={`${line.key}-price`}>
                    {mode === 'sale' ? 'Unit price (₹)' : 'Unit cost (₹)'}
                  </label>
                  <input
                    id={`${line.key}-price`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => update(line.key, { unitPrice: e.target.value })}
                    className={`${inputBase} border-border tabular-nums`}
                  />
                </div>
                <div className="text-[13px] sm:text-right font-semibold text-foreground tabular-nums">
                  {formatCurrency(qty * price)}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                    aria-label={`Remove ${product?.name ?? 'line'}`}
                    className="p-1.5 text-muted hover:text-danger hover:bg-danger-bg rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {err && (showErrors || overStock) && (
                <p className="text-xs text-danger mt-1.5" role="alert">
                  {err}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
