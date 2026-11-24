'use client';

import { Printer } from 'lucide-react';
import { useStore } from '@/store';
import { PaymentStatus } from '@/types';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils';
import { Modal, StatusBadge } from '@/components/ui/SharedComponents';
import { useToast } from '@/components/ui/ToastProvider';
import { Totals } from './SaleFormModal';
import { DrStockLogo } from '@/components/layout/Sidebar';

interface Props {
  saleId: string | null;
  onClose: () => void;
  onCancelRequest: (saleId: string) => void;
}

export default function SaleDetailModal({ saleId, onClose, onCancelRequest }: Props) {
  const { addToast } = useToast();
  const sale = useStore((s) => s.sales.find((x) => x.id === saleId) ?? null);
  const customer = useStore((s) => (sale ? s.customers.find((c) => c.id === sale.customerId) : undefined));
  const profile = useStore((s) => s.businessProfile);
  const updateSalePaymentStatus = useStore((s) => s.updateSalePaymentStatus);

  const changeStatus = (status: Exclude<PaymentStatus, 'cancelled'>) => {
    if (!sale) return;
    const result = updateSalePaymentStatus(sale.id, status);
    if (result.success) addToast('success', 'Payment status updated', `${sale.orderId} marked as ${status}.`);
    else addToast('error', 'Update failed', result.error);
  };

  return (
    <Modal open={sale !== null} onClose={onClose} title={sale ? `Tax Invoice ${sale.orderId}` : ''} size="lg">
      {sale && (
        <div className="space-y-5">
          {/* Printable Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-start gap-3">
              <DrStockLogo size={36} />
              <div>
                <h3 className="text-base font-semibold text-foreground">{profile.businessName}</h3>
                <p className="text-xs text-muted mt-0.5">{profile.address}</p>
                <p className="text-xs text-muted">
                  Phone: {profile.phone} · GSTIN: <span className="font-mono">{profile.gstin}</span>
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="font-mono text-sm font-semibold text-foreground">{sale.orderId}</p>
              <p className="text-xs text-muted mt-0.5">{formatDateTime(sale.date)}</p>
              <div className="mt-1.5 flex sm:justify-end gap-1.5 items-center">
                <StatusBadge status={sale.paymentStatus} />
                {sale.paymentMethod && (
                  <span className="text-[11px] font-medium text-secondary-text bg-muted-surface border border-border px-2 py-0.5 rounded-md">
                    {sale.paymentMethod}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-muted-surface rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Billed To Patient / Customer</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{sale.customerName}</p>
              {customer && (
                <p className="text-xs text-muted mt-0.5">
                  {customer.phone} · {customer.address}
                </p>
              )}
            </div>
            <div className="sm:text-right shrink-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Total Amount</p>
              <p className="text-xl font-bold text-primary tabular-nums">{formatCurrency(sale.grandTotal)}</p>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-muted-surface border-b border-border text-xs text-muted uppercase tracking-wider">
                  <th className="px-3 py-2.5 text-left font-medium">Medicine</th>
                  <th className="px-3 py-2.5 text-left font-medium">Batch / Exp</th>
                  <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-3 py-2.5 text-right font-medium">Unit Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {sale.items.map((i) => (
                  <tr key={i.productId}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{i.productName}</p>
                      <p className="font-mono text-[11px] text-muted">{i.sku}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-secondary-text">
                      <span className="font-mono">{i.batchNumber || '—'}</span>
                      {i.expiryDate && <span className="block text-[11px] text-muted">Exp {formatDate(i.expiryDate)}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{i.quantity}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-secondary-text">{formatCurrency(i.unitPrice)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">{formatCurrency(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="text-sm text-secondary-text p-3.5 rounded-lg bg-muted-surface border border-border">
              <p className="text-xs font-semibold text-foreground mb-1">Prescription / Notes</p>
              <p className="text-xs leading-relaxed text-muted">{sale.notes || 'Standard pharmacy dispense.'}</p>
            </div>
            <Totals
              subtotal={sale.subtotal}
              gstPercent={sale.gstPercent}
              gstAmount={sale.gstAmount}
              grandTotal={sale.grandTotal}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border no-print">
            {sale.paymentStatus !== 'cancelled' ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <label htmlFor="sale-payment" className="text-xs font-medium text-secondary-text">
                  Status:
                </label>
                <select
                  id="sale-payment"
                  value={sale.paymentStatus}
                  onChange={(e) => changeStatus(e.target.value as Exclude<PaymentStatus, 'cancelled'>)}
                  className="h-8 px-2.5 text-xs font-medium bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
                >
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="pending">Pending</option>
                </select>
                <button
                  onClick={() => onCancelRequest(sale.id)}
                  className="h-8 px-3 text-xs font-medium text-danger border border-danger/30 rounded-lg hover:bg-danger-bg transition-colors"
                >
                  Cancel &amp; Return Stock
                </button>
              </div>
            ) : (
              <p className="text-xs font-medium text-danger">
                This invoice was cancelled and all medicines were returned to inventory.
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-primary bg-primary-subtle rounded-lg hover:bg-primary/15 transition-colors"
              >
                <Printer className="w-4 h-4" /> Print Invoice
              </button>
              <button
                onClick={onClose}
                className="h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
