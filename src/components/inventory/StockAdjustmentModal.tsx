'use client';

import { useRef, useState } from 'react';
import { Plus, Minus, AlertCircle } from 'lucide-react';
import { useStore } from '@/store';
import { Product } from '@/types';
import { Modal } from '@/components/ui/SharedComponents';
import { useToast } from '@/components/ui/ToastProvider';

const COMMON_REASONS = {
  increase: ['Physical audit surplus', 'Patient return', 'Found in cold storage'],
  decrease: ['Expired batch quarantine', 'Damaged / broken seal', 'Clinic internal use', 'Audit correction'],
};

interface Props {
  productId: string | null;
  onClose: () => void;
}

export default function StockAdjustmentModal({ productId, onClose }: Props) {
  const product = useStore((s) => s.products.find((p) => p.id === productId) ?? null);
  return (
    <Modal open={product !== null} onClose={onClose} title="Adjust Medicine Stock" size="md">
      {product && <AdjustmentForm key={product.id} product={product} onClose={onClose} />}
    </Modal>
  );
}

function AdjustmentForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addToast } = useToast();
  const adjustStock = useStore((s) => s.adjustStock);
  const [direction, setDirection] = useState<'increase' | 'decrease'>('decrease');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  const amount = Number(qty);
  const valid = qty.trim() !== '' && Number.isInteger(amount) && amount > 0;
  const change = direction === 'increase' ? amount : -amount;
  const after = product.quantity + (valid ? change : 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    if (!valid) return setError('Enter a whole number greater than zero.');
    if (!reason.trim()) return setError('A reason is required for audit compliance.');
    submitting.current = true;
    const result = adjustStock(product.id, change, reason);
    if (result.success) {
      addToast('success', 'Stock adjusted', `${product.name}: ${product.quantity} → ${after} (${result.id}).`);
      onClose();
    } else {
      submitting.current = false;
      setError(result.error);
    }
  };

  const toggle = (d: 'increase' | 'decrease', Icon: typeof Plus, label: string) => (
    <button
      type="button"
      onClick={() => setDirection(d)}
      aria-pressed={direction === d}
      className={`flex items-center justify-center gap-1.5 h-9 text-[13px] font-medium rounded-lg border transition-colors ${
        direction === d
          ? d === 'increase'
            ? 'bg-primary-subtle border-primary text-primary'
            : 'bg-danger-bg border-danger text-danger'
          : 'bg-surface border-border text-secondary-text hover:bg-hover-surface'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex items-center justify-between gap-3 p-3.5 bg-muted-surface rounded-lg border border-border">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
          <p className="text-xs font-mono text-muted">
            {product.sku} · Batch {product.batchNumber || '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted">Current → New</p>
          <p className="text-base font-semibold tabular-nums text-foreground">
            {product.quantity} →{' '}
            <span className={after < 0 ? 'text-danger' : after <= product.minimumStock ? 'text-warning' : 'text-foreground'}>
              {after}
            </span>
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 text-[13px] text-danger bg-danger-bg border border-danger/20 rounded-lg" role="alert">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {toggle('increase', Plus, 'Increase Stock')}
        {toggle('decrease', Minus, 'Decrease Stock')}
      </div>

      <div>
        <label htmlFor="adj-qty" className="block text-[13px] font-medium text-secondary-text mb-1">
          Quantity ({product.unit}) *
        </label>
        <input
          id="adj-qty"
          type="number"
          min={1}
          step={1}
          max={direction === 'decrease' ? product.quantity : undefined}
          inputMode="numeric"
          autoFocus
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
        />
        {after < 0 && <p className="text-xs text-danger mt-1">Only {product.quantity} in stock.</p>}
        {after >= 0 && after <= product.minimumStock && valid && (
          <p className="text-xs text-warning mt-1">Stock will be at or below minimum threshold ({product.minimumStock}).</p>
        )}
      </div>

      <div>
        <label htmlFor="adj-reason" className="block text-[13px] font-medium text-secondary-text mb-1">
          Audit Reason *
        </label>
        <input
          id="adj-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Specify reason for stock adjustment"
          className="w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {COMMON_REASONS[direction].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className="px-2.5 py-1 text-xs text-secondary-text bg-muted-surface border border-border rounded-md hover:bg-hover-surface transition-colors"
            >
              {r}
            </button>
          ))}
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
          className="h-9 px-5 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover"
        >
          Save Adjustment
        </button>
      </div>
    </form>
  );
}
