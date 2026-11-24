'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReceiptText, Plus, XCircle, Printer } from 'lucide-react';
import { useStore } from '@/store';
import { Sale } from '@/types';
import { formatCurrency, formatDate, exportToCSV, isInDateRange, ALL_TIME, DateRange } from '@/lib/utils';
import { usePagination } from '@/lib/pagination';
import {
  PageHeader,
  FilterDropdown,
  DateRangeFilter,
  StatusBadge,
  ConfirmDialog,
  EmptyState,
  Metric,
} from '@/components/ui/SharedComponents';
import {
  DataTable,
  DataTableColumn,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/ToastProvider';
import SaleFormModal from '@/components/sales/SaleFormModal';
import SaleDetailModal from '@/components/sales/SaleDetailModal';

export default function SalesPage() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const sales = useStore((s) => s.sales);
  const cancelSale = useStore((s) => s.cancelSale);

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(ALL_TIME);
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showCreate, setShowCreate] = useState(() => searchParams.get('action') === 'create');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sales.filter((s) => {
      const matchesSearch =
        !q ||
        s.orderId.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.items.some((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
      return matchesSearch && (status === 'all' || s.paymentStatus === status) && isInDateRange(s.date, dateRange);
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'orderId') cmp = a.orderId.localeCompare(b.orderId);
      else if (sortKey === 'customer') cmp = a.customerName.localeCompare(b.customerName);
      else if (sortKey === 'amount') cmp = a.grandTotal - b.grandTotal;
      else cmp = a.date.localeCompare(b.date);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sales, search, status, dateRange, sortKey, sortDir]);

  const pagination = usePagination(filtered, 10);

  const handleSortChange = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
    pagination.resetPage();
  };

  const stats = useMemo(() => {
    const active = filtered.filter((s) => s.paymentStatus !== 'cancelled');
    return {
      orders: active.length,
      revenue: active.reduce((sum, s) => sum + s.grandTotal, 0),
      receivable: active.filter((s) => s.paymentStatus !== 'paid').reduce((sum, s) => sum + s.grandTotal, 0),
      cancelled: filtered.length - active.length,
    };
  }, [filtered]);

  const cancelling = sales.find((s) => s.id === cancellingId);

  const handleConfirmCancel = () => {
    if (!cancellingId) return;
    const result = cancelSale(cancellingId);
    if (result.success) addToast('info', 'Invoice cancelled', 'Stock returned to medicine inventory.');
    else addToast('error', 'Could not cancel invoice', result.error);
    setCancellingId(null);
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      addToast('warning', 'Nothing to export', 'No invoices match the current filters.');
      return;
    }
    exportToCSV(
      filtered.map((s) => ({
        'Invoice No': s.orderId,
        Patient: s.customerName,
        Date: formatDate(s.date),
        Medicines: s.items.map((i) => `${i.productName} x${i.quantity}`).join('; '),
        Subtotal: s.subtotal,
        'GST %': s.gstPercent,
        GST: s.gstAmount,
        Total: s.grandTotal,
        'Payment Status': s.paymentStatus,
        'Payment Method': s.paymentMethod ?? 'UPI',
        Notes: s.notes,
      })),
      `drstock-sales-${new Date().toISOString().slice(0, 10)}`
    );
    addToast('success', 'Export complete', `${filtered.length} invoices exported to CSV.`);
  };

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setDateRange(ALL_TIME);
    pagination.resetPage();
  };

  const activeFilterCount = (status !== 'all' ? 1 : 0) + (dateRange.preset !== 'all' ? 1 : 0);

  const columns: DataTableColumn<Sale>[] = [
    {
      key: 'orderId',
      header: 'Invoice #',
      sortValue: (s) => s.orderId,
      render: (s) => (
        <button
          onClick={() => setViewingId(s.id)}
          className="font-mono text-xs font-semibold text-foreground hover:text-primary transition-colors"
        >
          {s.orderId}
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Patient / Customer',
      sortValue: (s) => s.customerName,
      render: (s) => <span className="font-medium text-foreground block max-w-[200px] truncate">{s.customerName}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (s) => s.date,
      render: (s) => <span className="text-secondary-text whitespace-nowrap">{formatDate(s.date)}</span>,
    },
    {
      key: 'items',
      header: 'Medicines',
      hideOnMobile: true,
      render: (s) => (
        <span
          className="block max-w-[260px] truncate text-secondary-text"
          title={s.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ')}
        >
          {s.items.length} {s.items.length === 1 ? 'item' : 'items'} · {s.items.map((i) => i.productName).join(', ')}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (s) => s.grandTotal,
      render: (s) => (
        <div className="whitespace-nowrap">
          <span className="font-semibold text-foreground tabular-nums">{formatCurrency(s.grandTotal)}</span>
          <p className="text-[11px] text-muted">{s.paymentMethod || 'UPI'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusBadge status={s.paymentStatus} variant="dot" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="inline-flex items-center gap-1">
          <button
            onClick={() => setViewingId(s.id)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-primary bg-primary-subtle rounded-md hover:bg-primary/15 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Invoice
          </button>
          {s.paymentStatus !== 'cancelled' && (
            <button
              onClick={() => setCancellingId(s.id)}
              aria-label={`Cancel ${s.orderId}`}
              title="Cancel sale and return stock"
              className="p-1.5 text-muted hover:text-danger hover:bg-danger-bg rounded-md transition-colors"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales & Billing"
        description="Dispense medicines, generate patient invoices, and automatically deduct inventory stock."
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> New Sale
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Metric
          label="Active Invoices"
          value={String(stats.orders)}
          hint={stats.cancelled ? `${stats.cancelled} cancelled excluded` : 'Excludes cancelled'}
        />
        <Metric label="Sales Revenue" value={formatCurrency(stats.revenue)} hint="Inclusive of GST" accent="text-primary" />
        <Metric
          label="Receivables"
          value={formatCurrency(stats.receivable)}
          hint="Pending & partial payments"
          accent="text-warning"
        />
        <Metric
          label="Average Bill"
          value={formatCurrency(stats.orders ? stats.revenue / stats.orders : 0)}
          hint="Per active invoice"
        />
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <DataTableToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            pagination.resetPage();
          }}
          searchPlaceholder="Search invoice #, patient, medicine…"
          activeFilterCount={activeFilterCount}
          onResetFilters={resetFilters}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          filters={
            <>
              <FilterDropdown
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  pagination.resetPage();
                }}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
              <DateRangeFilter
                value={dateRange}
                onChange={(val) => {
                  setDateRange(val);
                  pagination.resetPage();
                }}
              />
            </>
          }
        />

        <DataTable
          columns={columns}
          data={pagination.items}
          keyExtractor={(s) => s.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          emptyState={
            <EmptyState
              icon={ReceiptText}
              title={search || activeFilterCount > 0 ? 'No invoices match these filters' : 'No sales recorded yet'}
              description={
                search || activeFilterCount > 0
                  ? 'Try adjusting search terms or filters.'
                  : 'Create your first medicine invoice to start tracking sales.'
              }
              action={
                search || activeFilterCount > 0 ? (
                  <button
                    onClick={resetFilters}
                    className="h-9 px-4 text-[13px] font-medium text-primary bg-primary-subtle rounded-lg hover:bg-primary/15"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="h-9 px-4 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary-hover"
                  >
                    New Sale
                  </button>
                )
              }
            />
          }
          renderMobileCard={(s) => (
            <button onClick={() => setViewingId(s.id)} className="w-full text-left p-4 hover:bg-muted-surface transition-colors">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-semibold text-foreground">{s.orderId}</span>
                <StatusBadge status={s.paymentStatus} variant="dot" />
              </div>
              <div className="flex items-center justify-between gap-3 mt-1.5">
                <span className="text-sm font-medium text-foreground truncate">{s.customerName}</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(s.grandTotal)}</span>
              </div>
              <p className="text-xs text-muted mt-1">
                {formatDate(s.date)} · {s.items.length} {s.items.length === 1 ? 'medicine' : 'medicines'} · {s.paymentMethod || 'UPI'}
              </p>
            </button>
          )}
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

      <SaleFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        initialCustomerId={searchParams.get('customer') ?? undefined}
      />
      <SaleDetailModal saleId={viewingId} onClose={() => setViewingId(null)} onCancelRequest={setCancellingId} />
      <ConfirmDialog
        open={cancellingId !== null}
        onClose={() => setCancellingId(null)}
        onConfirm={handleConfirmCancel}
        title={`Cancel ${cancelling?.orderId ?? 'invoice'}?`}
        description="The invoice will be marked as cancelled and all dispensed medicines will be returned to inventory stock via a Return ledger entry."
        confirmLabel="Cancel Invoice"
        variant="danger"
      />
    </div>
  );
}
