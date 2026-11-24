'use client';

import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useStore } from '@/store';
import { PurchaseOrder } from '@/types';
import { formatCurrency, formatDate, exportToCSV, isInDateRange, DateRange } from '@/lib/utils';
import { bucketByTime } from '@/lib/reports';
import { usePagination } from '@/lib/pagination';
import { Metric, StatusBadge, EmptyState } from '@/components/ui/SharedComponents';
import { DataTable, DataTableColumn, DataTablePagination, DataTableToolbar } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/ToastProvider';
import { ReportCard, RankedBars, TimeSeriesChart } from './ReportParts';

export default function PurchaseReport({ range }: { range: DateRange }) {
  const { addToast } = useToast();
  const purchaseOrders = useStore((s) => s.purchaseOrders);
  const [search, setSearch] = useState('');

  // Full date-range analytics (never paginated)
  const data = useMemo(() => {
    const inRange = purchaseOrders.filter((p) => isInDateRange(p.date, range)).sort((a, b) => b.date.localeCompare(a.date));
    const committed = inRange.filter((p) => p.status !== 'draft');
    const suppliers = new Map<string, { name: string; orders: number; value: number }>();
    for (const p of committed) {
      const s = suppliers.get(p.supplierId) ?? { name: p.supplierName, orders: 0, value: 0 };
      suppliers.set(p.supplierId, { ...s, orders: s.orders + 1, value: s.value + p.totalAmount });
    }
    const receivedValue = committed.reduce((a, p) => a + p.items.reduce((s, i) => s + i.receivedQuantity * i.unitPrice, 0), 0);
    return {
      inRange,
      committed,
      total: committed.reduce((a, p) => a + p.totalAmount, 0),
      receivedValue,
      received: inRange.filter((p) => p.status === 'received').length,
      pending: inRange.filter((p) => p.status === 'ordered' || p.status === 'partial').length,
      drafts: inRange.filter((p) => p.status === 'draft').length,
      buckets: bucketByTime(committed, (p) => p.date, (p) => p.totalAmount, range),
      suppliers: [...suppliers.entries()].sort((a, b) => b[1].value - a[1].value),
    };
  }, [purchaseOrders, range]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.inRange;
    return data.inRange.filter((p) =>
      [p.orderId, p.supplierName].some((v) => v.toLowerCase().includes(q))
    );
  }, [data.inRange, search]);

  const pagination = usePagination(filtered, 10);

  const exportCsv = () => {
    exportToCSV(
      filtered.map((p) => ({
        'PO ID': p.orderId,
        Date: formatDate(p.date),
        Supplier: p.supplierName,
        Items: p.items.map((i) => `${i.productName} ${i.receivedQuantity}/${i.quantity}`).join('; '),
        Total: p.totalAmount,
        Status: p.status,
        'Received Date': p.receivedDate ? formatDate(p.receivedDate) : '',
      })),
      `drstock-purchase-report-${new Date().toISOString().slice(0, 10)}`
    );
    addToast('success', 'Purchase report exported', `${filtered.length} purchase orders exported.`);
  };

  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'orderId', header: 'PO #', render: (p) => <span className="font-mono text-xs font-semibold text-foreground">{p.orderId}</span> },
    { key: 'date', header: 'Order Date', render: (p) => <span className="text-muted whitespace-nowrap">{formatDate(p.date)}</span> },
    { key: 'supplier', header: 'Distributor', render: (p) => <span className="font-medium text-foreground">{p.supplierName}</span> },
    {
      key: 'units',
      header: 'Units Received',
      align: 'right',
      render: (p) => (
        <span className="tabular-nums">
          {p.items.reduce((a, i) => a + i.receivedQuantity, 0)} / {p.items.reduce((a, i) => a + i.quantity, 0)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total Amount',
      align: 'right',
      render: (p) => <span className="tabular-nums font-semibold text-foreground">{formatCurrency(p.totalAmount)}</span>,
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} variant="dot" /> },
    {
      key: 'receivedDate',
      header: 'Received Date',
      render: (p) => <span className="text-muted whitespace-nowrap">{p.receivedDate ? formatDate(p.receivedDate) : '—'}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Metric
          label="Committed Purchase Value"
          value={formatCurrency(data.total)}
          hint={`${formatCurrency(data.receivedValue)} received into stock`}
          accent="text-info"
        />
        <Metric
          label="Purchase Orders"
          value={String(data.committed.length)}
          hint={data.drafts ? `+ ${data.drafts} drafts excluded` : 'Excludes drafts'}
        />
        <Metric label="Fully Received" value={String(data.received)} hint="Completed deliveries" accent="text-primary" />
        <Metric
          label="Pending / Partial"
          value={String(data.pending)}
          hint="Awaiting full stock intake"
          accent="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ReportCard title="Procurement Trend" subtitle="Committed purchase value over time" className="lg:col-span-2">
          <TimeSeriesChart data={data.buckets} color="#1d4ed8" valueLabel="Purchases" />
        </ReportCard>
        <ReportCard title="Supplier Spend Breakdown" subtitle="Ordered value in selected range">
          <RankedBars
            color="bg-info"
            empty="No purchase orders in this range."
            rows={data.suppliers.map(([id, s]) => ({
              key: id,
              label: s.name,
              value: s.value,
              display: formatCurrency(s.value),
              sublabel: `${s.orders} ${s.orders === 1 ? 'order' : 'orders'}`,
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
          searchPlaceholder="Filter purchase orders by PO # or supplier…"
          onResetFilters={search ? () => { setSearch(''); pagination.resetPage(); } : undefined}
          onExport={exportCsv}
          exportDisabled={filtered.length === 0}
        />
        <DataTable
          columns={columns}
          data={pagination.items}
          keyExtractor={(p) => p.id}
          emptyState={<EmptyState icon={ClipboardList} title="No purchase orders in range" description="Adjust date range or search filter." />}
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
          itemLabel="purchase orders"
        />
      </div>
    </div>
  );
}
