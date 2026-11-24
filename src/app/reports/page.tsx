'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { ALL_TIME, DateRange } from '@/lib/utils';
import { PageHeader, DateRangeFilter } from '@/components/ui/SharedComponents';
import StockReport from '@/components/reports/StockReport';
import SalesReport from '@/components/reports/SalesReport';
import PurchaseReport from '@/components/reports/PurchaseReport';

const TABS = [
  { id: 'stock', label: 'Medicine Stock' },
  { id: 'sales', label: 'Sales & Revenue' },
  { id: 'purchases', label: 'Purchase Procurement' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return TABS.some((x) => x.id === t) ? (t as Tab) : 'stock';
  });
  const [range, setRange] = useState<DateRange>(ALL_TIME);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clinical & Inventory Reports"
        description="Stock valuation, revenue analytics, and procurement reports built from live workspace transactions."
        action={
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-9 px-3.5 bg-surface text-secondary-text border border-border text-[13px] font-medium rounded-lg hover:bg-hover-surface transition-colors no-print"
          >
            <Printer className="w-4 h-4 text-muted" /> Print Report
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border no-print">
        <div role="tablist" aria-label="Report type" className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2.5 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab !== 'stock' ? (
          <DateRangeFilter value={range} onChange={setRange} className="pb-2" />
        ) : (
          <p className="text-xs font-medium text-muted pb-2">Current medicine valuation snapshot</p>
        )}
      </div>

      <div role="tabpanel">
        {tab === 'stock' && <StockReport />}
        {tab === 'sales' && <SalesReport range={range} />}
        {tab === 'purchases' && <PurchaseReport range={range} />}
      </div>
    </div>
  );
}
