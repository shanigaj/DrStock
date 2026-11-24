'use client';

import { useMemo, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { useStore } from '@/store';
import { Sale } from '@/types';
import { formatCurrency, formatDate, exportToCSV, isInDateRange, DateRange } from '@/lib/utils';
import { bucketByTime } from '@/lib/reports';
import { usePagination } from '@/lib/pagination';
import { Metric, StatusBadge, EmptyState } from '@/components/ui/SharedComponents';
import { DataTable, DataTableColumn, DataTablePagination, DataTableToolbar } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/ToastProvider';
import { ReportCard, RankedBars, TimeSeriesChart } from './ReportParts';

export default function SalesReport({ range }: { range: DateRange }) {
  const { addToast } = useToast();
  const sales = useStore((s) => s.sales);
  const [search, setSearch] = useState('');

  // Full date-range analytics (never paginated)
  const data = useMemo(() => {
    const inRange = sales.filter((s) => isInDateRange(s.date, range)).sort((a, b) => b.date.localeCompare(a.date));
    const active = inRange.filter((s) => s.paymentStatus !== 'cancelled');
    const revenue = active.reduce((a, s) => a + s.grandTotal, 0);
    const gst = active.reduce((a, s) => a + s.gstAmount, 0);
    const paidAmount = active.filter((s) => s.paymentStatus === 'paid').reduce((a, s) => a + s.grandTotal, 0);
    const products = new Map<string, { name: string; sku: string; units: number; revenue: number }>();
    for (const s of active) {
      for (const i of s.items) {
        const p = products.get(i.productId) ?? { name: i.productName, sku: i.sku, units: 0, revenue: 0 };
        products.set(i.productId, { ...p, units: p.units + i.quantity, revenue: p.revenue + i.total });
      }
    }
    return {
      inRange,
      active,
      revenue,
      gst,
      paidAmount,
      outstanding: active.filter((s) => s.paymentStatus !== 'paid').reduce((a, s) => a + s.grandTotal, 0),
      cancelled: inRange.length - active.length,
      buckets: bucketByTime(active, (s) => s.date, (s) => s.grandTotal, range),
      top: [...products.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 6),
    };
  }, [sales, range]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.inRange;
    return data.inRange.filter((s) =>
      [s.orderId, s.customerName].some((v) => v.toLowerCase().includes(q))
    );
  }, [data.inRange, search]);

  const pagination = usePagination(filtered, 10);

  const exportCsv = () => {
    exportToCSV(
      filtered.map((s) => ({
        'Invoice No': s.orderId,
        Date: formatDate(s.date),
        Patient: s.customerName,
        Items: s.items.map((i) => `${i.productName} x${i.quantity}`).join('; '),
        Subtotal: s.subtotal,
        GST: s.gstAmount,
        Total: s.grandTotal,
        Status: s.paymentStatus,
        Method: s.paymentMethod ?? 'UPI',
      })),
      `drstock-sales-report-${new Date().toISOString().slice(0, 10)}`
    );
    addToast('success', 'Sales report exported', `${filtered.length} invoices exported.`);
  };

  const columns: DataTableColumn<Sale>[] = [
    { key: 'orderId', header: 'Invoice #', render: (s) => <span className="font-mono text-xs font-semibold text-foreground">{s.orderId}</span> },
    { key: 'date', header: 'Date', render: (s) => <span className="text-muted whitespace-nowrap">{formatDate(s.date)}</span> },
    { key: 'customer', header: 'Patient / Customer', render: (s) => <span className="font-medium text-foreground">{s.customerName}</span> },
    {
      key: 'items',
      header: 'Units',
      align: 'right',
      render: (s) => <span className="tabular-nums">{s.items.reduce((a, i) => a + i.quantity, 0)}</span>,
    },
    {
      key: 'gst',
      header: 'GST',
      align: 'right',
      render: (s) => <span className="tabular-nums text-secondary-text">{formatCurrency(s.gstAmount)}</span>,
    },
    {
      key: 'total',
      header: 'Grand Total',
      align: 'right',
      render: (s) => <span className="tabular-nums font-semibold text-foreground">{formatCurrency(s.grandTotal)}</span>,
    },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.paymentStatus} variant="dot" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Metric
          label="Total Revenue"
          value={formatCurrency(data.revenue)}
          hint={`incl. ${formatCurrency(data.gst)} GST`}
          accent="text-primary"
        />
        <Metric
          label="Active Invoices"
          value={String(data.active.length)}
          hint={data.cancelled ? `${data.cancelled} cancelled excluded` : 'Excludes cancelled'}
        />
        <Metric
          label="Average Bill Value"
          value={formatCurrency(data.active.length ? data.revenue / data.active.length : 0)}
          hint={`${formatCurrency(data.paidAmount)} collected`}
        />
        <Metric
          label="Pending Receivables"
          value={formatCurrency(data.outstanding)}
          hint="Pending & partial payments"
          accent="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ReportCard title="Sales Trend" subtitle="Revenue inclusive of GST, cancelled invoices excluded" className="lg:col-span-2">
          <TimeSeriesChart data={data.buckets} color="#0f766e" valueLabel="Revenue" />
        </ReportCard>
        <ReportCard title="Top-Selling Medicines" subtitle="By revenue (excl. GST)">
          <RankedBars
            color="bg-primary"
            empty="No sales in this date range."
            rows={data.top.map(([id, p]) => ({
              key: id,
              label: p.name,
              value: p.revenue,
              display: formatCurrency(p.revenue),
              sublabel: `${p.sku} · ${p.units} units sold`,
            }))}
          />
        </ReportCard>
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <DataTableToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            pagination.resetPage();
          }}
          searchPlaceholder="Filter invoices by # or patient name…"
          onResetFilters={search ? () => { setSearch(''); pagination.resetPage(); } : undefined}
          onExport={exportCsv}
          exportDisabled={filtered.length === 0}
        />
        <DataTable
          columns={columns}
          data={pagination.items}
          keyExtractor={(s) => s.id}
          emptyState={<EmptyState icon={ReceiptText} title="No sales in range" description="Adjust date range or search filter." />}
        />
        <DataTablePagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="invoices"
        />
      </div>
    </div>
  );
}
