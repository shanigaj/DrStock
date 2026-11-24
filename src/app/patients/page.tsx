'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { useStore } from '@/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/SharedComponents';
import ContactDirectory, { ContactStats } from '@/components/contacts/ContactDirectory';

export default function PatientsPage() {
  const searchParams = useSearchParams();
  const customers = useStore((s) => s.customers);
  const sales = useStore((s) => s.sales);
  const appointments = useStore((s) => s.appointments);
  const deleteCustomer = useStore((s) => s.deleteCustomer);

  const stats = useMemo(() => {
    const map = new Map<string, ContactStats>();
    for (const s of sales) {
      if (s.paymentStatus === 'cancelled') continue;
      const cur = map.get(s.customerId) ?? { orders: 0, value: 0, lastOrder: null };
      map.set(s.customerId, {
        orders: cur.orders + 1,
        value: cur.value + s.grandTotal,
        lastOrder: !cur.lastOrder || s.date > cur.lastOrder ? s.date : cur.lastOrder,
      });
    }
    return map;
  }, [sales]);

  return (
    <ContactDirectory
      kind="customer"
      icon={Users}
      title="Patients Directory"
      description="Lightweight clinic patient directory linked to pharmacy billing and scheduled visits. Contains fictional demo data only."
      contacts={customers}
      stats={stats}
      valueLabel="Total Medicine Spend"
      initialSearch={searchParams.get('q') ?? ''}
      initialCreate={searchParams.get('action') === 'create'}
      onDelete={deleteCustomer}
      renderHistory={(patient) => {
        const history = sales.filter((s) => s.customerId === patient.id).sort((a, b) => b.date.localeCompare(a.date));
        const apts = appointments.filter((a) => a.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date));

        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-foreground">Dispensed Medicines / Invoices</h3>
                <Link
                  href={`/sales?action=create&customer=${patient.id}`}
                  className="text-xs font-semibold text-primary hover:text-primary-hover"
                >
                  + New Sale
                </Link>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center border border-dashed border-border rounded-lg">
                  No medicine sales recorded yet.
                </p>
              ) : (
                <div className="border border-border rounded-lg divide-y divide-border max-h-52 overflow-y-auto">
                  {history.map((s) => (
                    <Link
                      key={s.id}
                      href={`/sales?q=${s.orderId}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-hover-surface transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-mono font-semibold text-foreground">{s.orderId}</p>
                        <p className="text-xs text-muted truncate">
                          {formatDate(s.date)} · {s.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(s.grandTotal)}</p>
                        <StatusBadge status={s.paymentStatus} variant="dot" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-foreground">Linked Appointments</h3>
                <Link
                  href={`/appointments?action=create&patient=${patient.id}`}
                  className="text-xs font-semibold text-primary hover:text-primary-hover"
                >
                  + Book Visit
                </Link>
              </div>
              {apts.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center border border-dashed border-border rounded-lg">
                  No clinic appointments recorded.
                </p>
              ) : (
                <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                  {apts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {a.date} · {a.time} — {a.doctorName}
                        </p>
                        <p className="text-[11px] text-muted">{a.visitType}</p>
                      </div>
                      <StatusBadge status={a.status} variant="dot" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}
