'use client';

import { useRef, useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { useStore } from '@/store';
import { PurchaseOrder } from '@/types';
import { Modal } from '@/components/ui/SharedComponents';
import { useToast } from '@/components/ui/ToastProvider';

interface Props {
  purchaseId: string | null;
  onClose: () => void;
}

export default function ReceivePurchaseModal({ purchaseId, onClose }: Props) {
  const po = useStore((s) => s.purchaseOrders.find((p) => p.id === purchaseId) ?? null);
  return (
    <Modal open={po !== null} onClose={onClose} title={po ? `Receive Medicines — ${po.orderId}` : ''} size="xl">
      {po && <ReceiveForm key={po.id} po={po} onClose={onClose} />}
    </Modal>
  );
}

function ReceiveForm({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const { addToast } = useToast();
  const products = useStore((s) => s.products);
  const receivePurchaseOrder = useStore((s) => s.receivePurchaseOrder);

  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(po.items.map((i) => [i.productId, String(i.quantity - i.receivedQuantity)]))
  );
  const [batches, setBatches] = useState<Record<string, { batchNumber: string; expiryDate: string }>>(() =>
    Object.fromEntries(
      po.items.map((i) => {
        const prod = products.find((p) => p.id === i.productId);
        return [
          i.productId,
          {
            batchNumber: i.batchNumber || prod?.batchNumber || '',
            expiryDate: i.expiryDate || prod?.expiryDate || '',
          },
        ];
      })
    )
  );
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const parsed = Object.fromEntries(Object.entries(quantities).map(([k, v]) => [k, v.trim() === '' ? 0 : Number(v)]));
  const units = Object.values(parsed).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  const isFull = po.items.every((i) => parsed[i.productId] === i.quantity - i.receivedQuantity);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const result = receivePurchaseOrder(po.id, parsed, batches);
    if (result.success) {
      addToast(
        'success',
        isFull ? 'Stock received' : 'Partial delivery recorded',
        `${units} units added to medicine inventory from ${po.orderId}.`
      );
      onClose();
    } else {
      submitting.current = false;
      setError(result.error);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-subtle border border-primary/15 text-xs text-primary">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          Enter received quantities, batch numbers, and expiry dates. Receiving a new batch creates an independent batch lot without overwriting existing stock batches.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 text-[13px] text-danger bg-danger-bg border border-danger/20 rounded-lg" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="border border-border rounded-xl divide-y divide-border">
        {po.items.map((item) => {
          const outstanding = item.quantity - item.receivedQuantity;
          const product = products.find((p) => p.id === item.productId);
          const now = parsed[item.productId] || 0;
          const b = batches[item.productId] || { batchNumber: '', expiryDate: '' };

          return (
            <div key={item.productId} className="p-3.5 space-y-2.5 bg-surface">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{item.productName}</p>
                  <p className="text-xs text-muted">
                    Ordered {item.quantity} · Received {item.receivedQuantity} ·{' '}
                    <span className="font-semibold text-foreground">{outstanding} remaining</span>
                  </p>
                </div>
                {product && (
                  <span className="text-xs text-secondary-text tabular-nums whitespace-nowrap bg-muted-surface px-2.5 py-1 rounded-md border border-border">
                    Stock: {product.quantity} →{' '}
                    <span className="font-semibold text-primary">{product.quantity + (Number.isFinite(now) ? now : 0)}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1" htmlFor={`rcv-${item.productId}`}>
                    Receive Qty *
                  </label>
                  <input
                    id={`rcv-${item.productId}`}
                    type="number"
                    min={0}
                    max={outstanding}
                    step={1}
                    disabled={outstanding === 0}
                    value={quantities[item.productId]}
                    onChange={(e) => setQuantities({ ...quantities, [item.productId]: e.target.value })}
                    className="w-full h-9 px-2.5 text-[13px] font-semibold border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus disabled:bg-muted-surface"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1" htmlFor={`batch-${item.productId}`}>
                    Batch Number
                  </label>
                  <input
                    id={`batch-${item.productId}`}
                    type="text"
                    disabled={outstanding === 0}
                    value={b.batchNumber}
                    onChange={(e) =>
                      setBatches({ ...batches, [item.productId]: { ...b, batchNumber: e.target.value.toUpperCase() } })
                    }
                    placeholder="BATCH-24X"
                    className="w-full h-9 px-2.5 text-[13px] font-mono uppercase border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus disabled:bg-muted-surface"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1" htmlFor={`exp-${item.productId}`}>
                    Expiry Date
                  </label>
                  <input
                    id={`exp-${item.productId}`}
                    type="date"
                    disabled={outstanding === 0}
                    value={b.expiryDate}
                    onChange={(e) => setBatches({ ...batches, [item.productId]: { ...b, expiryDate: e.target.value } })}
                    className="w-full h-9 px-2.5 text-[13px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus disabled:bg-muted-surface"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={units <= 0}
          className="h-9 px-5 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFull ? 'Receive All & Update Stock' : `Receive ${units} Units`}
        </button>
      </div>
    </form>
  );
}
