'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import { useStore } from '@/store';
import { calculateOrderTotals } from '@/lib/orders';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/SharedComponents';
import { useToast } from '@/components/ui/ToastProvider';
import LineItemsEditor, { LineDraft, lineError, newLine, toOrderLines } from '@/components/orders/LineItemsEditor';

interface Props {
  open: boolean;
  onClose: () => void;
  initialProductId?: string;
  initialSupplierId?: string;
}

export default function PurchaseFormModal({ open, onClose, initialProductId, initialSupplierId }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="New Medicine Purchase Order" size="xl">
      {open && <PurchaseForm onClose={onClose} initialProductId={initialProductId} initialSupplierId={initialSupplierId} />}
    </Modal>
  );
}

function PurchaseForm({ onClose, initialProductId, initialSupplierId }: Omit<Props, 'open'>) {
  const { addToast } = useToast();
  const products = useStore((s) => s.products);
  const suppliers = useStore((s) => s.suppliers);
  const createPurchaseOrder = useStore((s) => s.createPurchaseOrder);

  const defaultDue = () => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  };

  const [supplierId, setSupplierId] = useState(() =>
    suppliers.some((x) => x.id === initialSupplierId) ? initialSupplierId! : suppliers[0]?.id ?? ''
  );
  const [status, setStatus] = useState<'ordered' | 'draft'>('ordered');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(defaultDue);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>(() => {
    const initial = products.find((p) => p.id === initialProductId);
    if (initial) return [newLine(initial, 'purchase', Math.max(initial.minimumStock * 2 - initial.quantity, 10))];
    return products[0] ? [newLine(products[0], 'purchase', 10)] : [];
  });
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitting = useRef(false);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const orderLines = toOrderLines(lines);
  const total = calculateOrderTotals(
    orderLines.map((l) => ({ ...l, quantity: l.quantity || 0, unitPrice: l.unitPrice || 0 }))
  ).subtotal;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setShowErrors(true);

    let error: string | null = null;
    if (!supplierId) error = 'Select a medical distributor.';
    else if (lines.length === 0) error = 'Add at least one medicine.';
    else if (lines.some((l) => lineError(l, productById.get(l.productId), 'purchase')))
      error = 'Resolve highlighted line item issues.';
    setFormError(error);
    if (error) return;

    submitting.current = true;
    const result = createPurchaseOrder({
      supplierId,
      items: orderLines,
      status,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      notes,
    });
    if (result.success) {
      addToast(
        'success',
        status === 'draft' ? 'PO draft saved' : 'Purchase order placed',
        `Order ${formatCurrency(total)} recorded. Stock increases when received.`
      );
      onClose();
    } else {
      submitting.current = false;
      setFormError(result.error);
    }
  };

  const fieldClass =
    'w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent';

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {formError && (
        <div className="flex items-start gap-2 p-3 text-[13px] text-danger bg-danger-bg border border-danger/20 rounded-lg" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="po-supplier" className="block text-[13px] font-medium text-secondary-text mb-1">
            Medical Supplier *
          </label>
          <select
            id="po-supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={`${fieldClass} ${showErrors && !supplierId ? 'border-danger' : ''}`}
          >
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.company || s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="po-status" className="block text-[13px] font-medium text-secondary-text mb-1">
            Order Status
          </label>
          <select
            id="po-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'ordered' | 'draft')}
            className={fieldClass}
          >
            <option value="ordered">Ordered — Sent to distributor</option>
            <option value="draft">Draft — Internal review</option>
          </select>
        </div>
        <div>
          <label htmlFor="po-due" className="block text-[13px] font-medium text-secondary-text mb-1">
            Expected Delivery
          </label>
          <input
            id="po-due"
            type="date"
            value={expectedDeliveryDate}
            onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <LineItemsEditor mode="purchase" lines={lines} products={products} onChange={setLines} showErrors={showErrors} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <div>
          <label htmlFor="po-notes" className="block text-[13px] font-medium text-secondary-text mb-1">
            Procurement Notes
          </label>
          <textarea
            id="po-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cold chain instructions, payment terms…"
            className="w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
          />
        </div>
        <div className="space-y-3">
          <div className="bg-muted-surface p-4 rounded-xl border border-border flex items-center justify-between text-sm font-semibold text-foreground">
            <span>Order Total</span>
            <span className="tabular-nums text-primary">{formatCurrency(total)}</span>
          </div>
          <p className="flex items-start gap-2 text-xs text-muted">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            Placing a purchase order does not alter stock. Inventory increases only when medicines are marked as received.
          </p>
        </div>
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
          className="h-9 px-5 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {status === 'draft' ? 'Save Draft PO' : 'Place Purchase Order'}
        </button>
      </div>
    </form>
  );
}
