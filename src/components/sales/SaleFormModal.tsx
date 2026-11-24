'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';
import { PaymentStatus, PaymentMethod } from '@/types';
import { availableSellableQuantity } from '@/lib/batches';
import { calculateOrderTotals } from '@/lib/orders';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/SharedComponents';
import { useToast } from '@/components/ui/ToastProvider';
import LineItemsEditor, { LineDraft, lineError, newLine, toOrderLines } from '@/components/orders/LineItemsEditor';

const GST_RATES = [0, 5, 12, 18];
const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Cash', 'Card'];
type NewSaleStatus = Exclude<PaymentStatus, 'cancelled'>;

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (orderId: string) => void;
  initialCustomerId?: string;
}

export default function SaleFormModal({ open, onClose, onCreated, initialCustomerId }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="New Medicine Sale / Invoice" size="xl">
      {open && <SaleForm onClose={onClose} onCreated={onCreated} initialCustomerId={initialCustomerId} />}
    </Modal>
  );
}

function SaleForm({ onClose, onCreated, initialCustomerId }: Omit<Props, 'open'>) {
  const { addToast } = useToast();
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const defaultGst = useStore((s) => s.businessProfile.defaultGstPercent);
  const createSale = useStore((s) => s.createSale);

  const [customerId, setCustomerId] = useState(() =>
    customers.some((c) => c.id === initialCustomerId) ? initialCustomerId! : customers[0]?.id ?? ''
  );
  const [paymentStatus, setPaymentStatus] = useState<NewSaleStatus>('paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [gstPercent, setGstPercent] = useState(defaultGst);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>(() => {
    const first = products.find((p) => availableSellableQuantity(p) > 0);
    return first ? [newLine(first, 'sale')] : [];
  });
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitting = useRef(false);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const orderLines = toOrderLines(lines);
  const totals = calculateOrderTotals(
    orderLines.map((l) => ({ ...l, quantity: l.quantity || 0, unitPrice: l.unitPrice || 0 })),
    gstPercent
  );
  const customer = customers.find((c) => c.id === customerId);

  const validate = (): string | null => {
    if (!customer) return 'Select a patient or customer.';
    if (lines.length === 0) return 'Add at least one medicine.';
    const bad = lines.find((l) => lineError(l, productById.get(l.productId), 'sale'));
    if (bad) return 'Resolve line item issues before proceeding.';
    return null;
  };

  const goToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    const error = validate();
    setFormError(error);
    if (!error) setStep('review');
  };

  const confirm = () => {
    if (submitting.current) return;
    submitting.current = true;
    const result = createSale({
      customerId,
      items: orderLines,
      gstPercent,
      paymentStatus,
      paymentMethod,
      notes,
    });
    if (result.success) {
      addToast('success', 'Invoice completed', `Medicine stock deducted for ${formatCurrency(totals.grandTotal)}.`);
      onCreated?.(result.id ?? '');
      onClose();
    } else {
      submitting.current = false;
      setFormError(result.error);
      setStep('edit');
      addToast('error', 'Sale blocked', result.error);
    }
  };

  const fieldClass =
    'w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent';

  if (step === 'review' && customer) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 bg-muted-surface rounded-xl border border-border">
          <div>
            <p className="text-xs font-medium text-muted">Patient / Customer</p>
            <p className="text-sm font-semibold text-foreground">{customer.name}</p>
            <p className="text-xs text-muted mt-0.5">
              {customer.phone} · {customer.age ? `${customer.age} yrs` : ''} {customer.gender || ''}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-medium text-muted">Grand Total</p>
            <p className="text-xl font-bold text-primary tabular-nums">{formatCurrency(totals.grandTotal)}</p>
            <p className="text-xs text-muted capitalize">
              {paymentStatus} via {paymentMethod}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
            Medicine Stock Impact Preview (FEFO)
          </h3>
          <div className="border border-border rounded-lg divide-y divide-border">
            {orderLines.map((l) => {
              const p = productById.get(l.productId)!;
              const after = p.quantity - l.quantity;
              const low = after <= p.minimumStock;
              return (
                <div key={l.productId} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted">
                      {l.quantity} {p.unit.toLowerCase()} × {formatCurrency(l.unitPrice)} · Batch {p.batchNumber || '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="tabular-nums text-secondary-text">
                      {p.quantity} → <span className={`font-semibold ${low ? 'text-warning' : 'text-foreground'}`}>{after}</span>
                    </p>
                    {low && (
                      <p className="text-[11px] text-warning">
                        {after <= 0 ? 'Will be out of stock' : 'Will trigger low-stock alert'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Totals
          subtotal={totals.subtotal}
          gstPercent={gstPercent}
          gstAmount={totals.gstAmount}
          grandTotal={totals.grandTotal}
        />

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2.5 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setStep('edit')}
            className="flex items-center justify-center gap-1.5 h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Edit
          </button>
          <button
            type="button"
            onClick={confirm}
            autoFocus
            className="h-9 px-5 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Complete Sale &amp; Deduct Stock
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={goToReview} className="space-y-5" noValidate>
      {formError && (
        <div className="flex items-start gap-2 p-3 text-[13px] text-danger bg-danger-bg border border-danger/20 rounded-lg" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="sale-customer" className="block text-[13px] font-medium text-secondary-text mb-1">
            Patient / Customer *
          </label>
          <select
            id="sale-customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className={`${fieldClass} ${showErrors && !customer ? 'border-danger' : ''}`}
          >
            <option value="">Select patient…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sale-status" className="block text-[13px] font-medium text-secondary-text mb-1">
            Payment Status *
          </label>
          <select
            id="sale-status"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as NewSaleStatus)}
            className={fieldClass}
          >
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <label htmlFor="sale-method" className="block text-[13px] font-medium text-secondary-text mb-1">
            Payment Method *
          </label>
          <select
            id="sale-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className={fieldClass}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <LineItemsEditor mode="sale" lines={lines} products={products} onChange={setLines} showErrors={showErrors} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <div>
          <label htmlFor="sale-notes" className="block text-[13px] font-medium text-secondary-text mb-1">
            Prescription / Billing Notes
          </label>
          <textarea
            id="sale-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Dosage instructions, doctor ref, or billing notes…"
            className="w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="sale-gst" className="text-[13px] font-medium text-secondary-text">
              GST Rate
            </label>
            <select
              id="sale-gst"
              value={gstPercent}
              onChange={(e) => setGstPercent(Number(e.target.value))}
              className="h-9 px-2.5 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
            >
              {GST_RATES.map((r) => (
                <option key={r} value={r}>
                  {r === 0 ? 'No GST (0%)' : `${r}% GST`}
                </option>
              ))}
            </select>
          </div>
          <Totals
            subtotal={totals.subtotal}
            gstPercent={gstPercent}
            gstAmount={totals.gstAmount}
            grandTotal={totals.grandTotal}
          />
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
          className="flex items-center justify-center gap-1.5 h-9 px-5 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Review &amp; Confirm <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}

export function Totals({
  subtotal,
  gstPercent,
  gstAmount,
  grandTotal,
}: {
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
}) {
  return (
    <div className="bg-muted-surface p-4 rounded-xl border border-border space-y-1.5 text-[13px]">
      <div className="flex justify-between text-secondary-text">
        <span>Subtotal</span>
        <span className="font-medium text-foreground tabular-nums">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex justify-between text-secondary-text">
        <span>GST ({gstPercent}%)</span>
        <span className="font-medium text-foreground tabular-nums">{formatCurrency(gstAmount)}</span>
      </div>
      <div className="flex justify-between pt-2 border-t border-border font-semibold text-foreground text-sm">
        <span>Grand Total</span>
        <span className="tabular-nums text-primary">{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  );
}
