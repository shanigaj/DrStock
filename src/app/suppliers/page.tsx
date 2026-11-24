'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { useStore } from '@/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/SharedComponents';
import ContactDirectory, { ContactStats } from '@/components/contacts/ContactDirectory';

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const suppliers = useStore((s) => s.suppliers);
  const purchaseOrders = useStore((s) => s.purchaseOrders);
  const deleteSupplier = useStore((s) => s.deleteSupplier);

  const stats = useMemo(() => {
    const map = new Map<string, ContactStats>();
    for (const po of purchaseOrders) {
      if (po.status === 'draft') continue;
      const cur = map.get(po.supplierId) ?? { orders: 0, value: 0, lastOrder: null };
      map.set(po.supplierId, {
        orders: cur.orders + 1,
        value: cur.value + po.totalAmount,
        lastOrder: !cur.lastOrder || po.date > cur.lastOrder ? po.date : cur.lastOrder,
      });
    }
    return map;
  }, [purchaseOrders]);

  return (
    <ContactDirectory
      kind="supplier"
      icon={Building2}
      title="Medical Suppliers & Distributors"
      description="Pharmaceutical wholesalers and medical device suppliers connected to purchase orders."
      contacts={suppliers}
      stats={stats}
      valueLabel="Total Purchase Value"
      initialSearch={searchParams.get('q') ?? ''}
      initialCreate={searchParams.get('action') === 'create'}
      onDelete={deleteSupplier}
      renderHistory={(supplier) => {
        const history = purchaseOrders.filter((p) => p.supplierId === supplier.id).sort((a, b) => b.date.localeCompare(a.date));
        return (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-foreground">Purchase Order History</h3>
              <Link
                href={`/purchases?action=create&supplier=${supplier.id}`}
                className="text-xs font-semibold text-primary hover:text-primary-hover"
              >
                + New Purchase Order
              </Link>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center border border-dashed border-border rounded-lg">
                No purchase orders yet.
              </p>
            ) : (
              <div className="border border-border rounded-lg divide-y divide-border max-h-72 overflow-y-auto">
                {history.map((p) => (
                  <Link
                    key={p.id}
                    href={`/purchases?q=${p.orderId}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-hover-surface transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-semibold text-foreground">{p.orderId}</p>
                      <p className="text-xs text-muted truncate">
                        {formatDate(p.date)} · {p.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(p.totalAmount)}</p>
                      <StatusBadge status={p.status} variant="dot" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
