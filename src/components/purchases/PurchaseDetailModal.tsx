'use client';

import { useStore } from '@/store';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';
import { Modal, StatusBadge } from '@/components/ui/SharedComponents';
import { useToast } from '@/components/ui/ToastProvider';

interface Props {
  purchaseId: string | null;
  onClose: () => void;
  onReceive: (id: string) => void;
}

export default function PurchaseDetailModal({ purchaseId, onClose, onReceive }: Props) {
  const { addToast } = useToast();
  const po = useStore((s) => s.purchaseOrders.find((p) => p.id === purchaseId) ?? null);
  const supplier = useStore((s) => (po ? s.suppliers.find((x) => x.id === po.supplierId) : undefined));
  const markPurchaseOrdered = useStore((s) => s.markPurchaseOrdered);

  const placeOrder = () => {
    if (!po) return;
    const result = markPurchaseOrdered(po.id);
    if (result.success) addToast('success', 'Order placed', `${po.orderId} is now Ordered.`);
    else addToast('error', 'Could not place order', result.error);
  };

  return (
    <Modal open={po !== null} onClose={onClose} title={po ? `Purchase Order ${po.orderId}` : ''} size="lg">
      {po && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted-surface rounded-xl border border-border">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Medical Distributor</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{po.supplierName}</p>
              {supplier && (
                <p className="text-xs text-muted mt-0.5">
                  {supplier.name} · {supplier.phone}
                </p>
              )}
            </div>
            <div className="sm:text-right space-y-1">
              <StatusBadge status={po.status} />
              <p className="text-xl font-bold text-primary tabular-nums">{formatCurrency(po.totalAmount)}</p>
              <p className="text-xs text-muted">Created {formatDateTime(po.date)}</p>
              {po.expectedDeliveryDate && po.status !== 'received' && (
                <p className="text-xs text-muted">Expected: {formatDate(po.expectedDeliveryDate)}</p>
              )}
              {po.receivedDate && <p className="text-xs font-medium text-primary">Received {formatDateTime(po.receivedDate)}</p>}
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-[13px] min-w-[520px]">
              <thead>
                <tr className="bg-muted-surface border-b border-border text-xs text-muted uppercase tracking-wider">
                  <th className="px-3 py-2.5 text-left font-medium">Medicine</th>
                  <th className="px-3 py-2.5 text-left font-medium">Batch / Exp</th>
                  <th className="px-3 py-2.5 text-right font-medium">Ordered</th>
                  <th className="px-3 py-2.5 text-right font-medium">Received</th>
                  <th className="px-3 py-2.5 text-right font-medium">Unit Cost</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {po.items.map((i) => (
                  <tr key={i.productId}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{i.productName}</p>
                      <p className="font-mono text-xs text-muted">{i.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-secondary-text">
                      <span className="font-mono">{i.batchNumber || '—'}</span>
                      {i.expiryDate && <span className="block text-[11px] text-muted">Exp {formatDate(i.expiryDate)}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{i.quantity}</td>
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums font-semibold ${
                        i.receivedQuantity >= i.quantity ? 'text-primary' : 'text-secondary-text'
                      }`}
                    >
                      {i.receivedQuantity}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-secondary-text">{formatCurrency(i.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">{formatCurrency(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {po.notes && (
            <div className="text-sm text-secondary-text p-3 rounded-lg bg-muted-surface border border-border">
              <p className="text-xs font-semibold text-foreground mb-1">Procurement Notes</p>
              <p className="text-xs">{po.notes}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface"
            >
              Close
            </button>
            <div className="flex flex-col sm:flex-row gap-2">
              {po.status === 'draft' && (
                <button
                  onClick={placeOrder}
                  className="h-9 px-4 text-[13px] font-medium text-foreground border border-border rounded-lg hover:bg-hover-surface"
                >
                  Mark as Ordered
                </button>
              )}
              {(po.status === 'ordered' || po.status === 'partial') && (
                <button
                  onClick={() => onReceive(po.id)}
                  className="h-9 px-4 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover"
                >
                  Receive Medicines
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
