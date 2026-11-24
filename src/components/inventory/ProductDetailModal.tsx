'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import { getStockStatus, getExpiryStatus } from '@/types';
import { normalizeProductBatches } from '@/lib/batches';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Drawer, StatusBadge } from '@/components/ui/SharedComponents';
import MovementQuantity from '@/components/inventory/MovementQuantity';

interface Props {
  productId: string | null;
  onClose: () => void;
  onAdjust: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function ProductDetailModal({ productId, onClose, onAdjust, onEdit }: Props) {
  const product = useStore((s) => s.products.find((p) => p.id === productId) ?? null);
  const profile = useStore((s) => s.businessProfile);
  const stockMovements = useStore((s) => s.stockMovements);
  const sales = useStore((s) => s.sales);

  const movements = useMemo(() => stockMovements.filter((m) => m.productId === productId), [stockMovements, productId]);
  const unitsSold = useMemo(
    () =>
      sales
        .filter((s) => s.paymentStatus !== 'cancelled')
        .flatMap((s) => s.items)
        .filter((i) => i.productId === productId)
        .reduce((sum, i) => sum + i.quantity, 0),
    [sales, productId]
  );

  const warningDays = profile.expiryWarningDays || 90;
  const expStatus = product ? getExpiryStatus(product.expiryDate, warningDays) : 'valid';
  const batches = useMemo(() => (product ? normalizeProductBatches(product) : []), [product]);

  return (
    <Drawer open={product !== null} onClose={onClose} title={product?.name ?? 'Medicine Details'} width="max-w-[540px]">
      {product && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-semibold text-primary bg-primary-subtle px-2 py-0.5 rounded-md">
                  {product.sku}
                </span>
                <span className="text-xs text-secondary-text font-medium">{product.category}</span>
                {product.potency && <span className="text-xs text-muted">· Potency {product.potency}</span>}
              </div>
              {product.genericName && (
                <p className="text-[13px] font-medium text-secondary-text mt-1.5">Generic: {product.genericName}</p>
              )}
              {product.manufacturer && (
                <p className="text-xs text-muted mt-0.5">Mfr: {product.manufacturer}</p>
              )}
              {product.description && <p className="text-[13px] text-secondary-text mt-2 leading-relaxed">{product.description}</p>}
            </div>
            <div className="flex flex-row sm:flex-col items-start sm:items-end gap-1.5 shrink-0">
              <StatusBadge status={getStockStatus(product.quantity, product.minimumStock)} />
              <StatusBadge status={expStatus} />
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['In Stock', `${product.quantity} ${product.unit}`],
              ['Min Level', `${product.minimumStock} ${product.unit}`],
              ['Primary Batch', product.batchNumber || '—'],
              ['Expiry Date', product.expiryDate ? formatDate(product.expiryDate) : '—'],
              ['Purchase Cost', formatCurrency(product.costPrice)],
              ['Selling Price', formatCurrency(product.sellingPrice)],
              ['Stock Value', formatCurrency(product.quantity * product.costPrice)],
              ['Units Sold', String(unitsSold)],
            ].map(([label, value]) => (
              <div key={label} className="p-3 rounded-lg bg-muted-surface border border-border min-w-0">
                <dt className="text-[11px] font-medium text-muted">{label}</dt>
                <dd className="text-[13px] font-semibold text-foreground mt-0.5 truncate tabular-nums" title={value}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {/* Active Batch Breakdown */}
          <div>
            <h3 className="text-[13px] font-semibold text-foreground mb-2">Active Batch Breakdown (FEFO)</h3>
            {batches.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center border border-dashed border-border rounded-lg">
                No stock units currently in inventory.
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted-surface border-b border-border text-muted uppercase tracking-wider">
                      <th className="px-3 py-2 text-left font-medium">Batch #</th>
                      <th className="px-3 py-2 text-left font-medium">Expiry</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {batches.map((b, idx) => (
                      <tr key={`${b.batchNumber}-${b.expiryDate || idx}`}>
                        <td className="px-3 py-2 font-mono font-medium text-foreground">{b.batchNumber}</td>
                        <td className="px-3 py-2 text-secondary-text">{b.expiryDate ? formatDate(b.expiryDate) : '—'}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={getExpiryStatus(b.expiryDate, warningDays)} variant="default" />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                          {b.quantity} {product.unit.toLowerCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Stock Movements */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-foreground">Recent Stock Movements</h3>
              <Link
                href={`/stock-history?product=${product.id}`}
                onClick={onClose}
                className="text-xs font-medium text-primary hover:text-primary-hover"
              >
                Full history →
              </Link>
            </div>
            {movements.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center border border-dashed border-border rounded-lg">
                No movements recorded yet.
              </p>
            ) : (
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted-surface border-b border-border text-muted uppercase tracking-wider">
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Type</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Balance</th>
                      <th className="px-3 py-2 text-left font-medium">Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {movements.slice(0, 6).map((m) => (
                      <tr key={m.id}>
                        <td className="px-3 py-2 text-muted whitespace-nowrap">{formatDate(m.date)}</td>
                        <td className="px-3 py-2 capitalize text-secondary-text font-medium">{m.movementType}</td>
                        <td className="px-3 py-2 text-right">
                          <MovementQuantity quantity={m.quantity} />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-secondary-text whitespace-nowrap">
                          {m.previousStock} → {m.newStock}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted">{m.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2.5 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface"
            >
              Close
            </button>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => onEdit(product.id)}
                className="h-9 px-4 text-[13px] font-medium text-secondary-text border border-border rounded-lg hover:bg-hover-surface"
              >
                Edit Details
              </button>
              <Link
                href={`/purchases?action=create&productId=${product.id}`}
                onClick={onClose}
                className="h-9 px-4 inline-flex items-center justify-center text-[13px] font-medium text-primary bg-primary-subtle rounded-lg hover:bg-primary/15"
              >
                Reorder Batch
              </Link>
              <button
                onClick={() => onAdjust(product.id)}
                className="h-9 px-4 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover"
              >
                Adjust Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
