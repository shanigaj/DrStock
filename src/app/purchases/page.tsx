'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardList, Plus, PackageCheck } from 'lucide-react';
import { useStore } from '@/store';
import { PurchaseOrder } from '@/types';
import { formatCurrency, formatDate, exportToCSV, isInDateRange, ALL_TIME, DateRange } from '@/lib/utils';
import { usePagination } from '@/lib/pagination';
import {
  PageHeader,
  FilterDropdown,
  DateRangeFilter,
  StatusBadge,
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
import PurchaseFormModal from '@/components/purchases/PurchaseFormModal';
import PurchaseDetailModal from '@/components/purchases/PurchaseDetailModal';
import ReceivePurchaseModal from '@/components/purchases/ReceivePurchaseModal';

export default function PurchasesPage() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const purchaseOrders = useStore((s) => s.purchaseOrders);
  const suppliers = useStore((s) => s.suppliers);

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [supplierId, setSupplierId] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>(ALL_TIME);
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showCreate, setShowCreate] = useState(() => searchParams.get('action') === 'create');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const initialProductId = searchParams.get('productId') ?? undefined;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = purchaseOrders.filter((p) => {
      const matchesSearch =
        !q ||
        p.orderId.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        p.items.some((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
      return (
        matchesSearch &&
        (supplierId === 'all' || p.supplierId === supplierId) &&
        (status === 'all' || p.status === status) &&
        isInDateRange(p.date, dateRange)
      );
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'orderId') cmp = a.orderId.localeCompare(b.orderId);
      else if (sortKey === 'supplier') cmp = a.supplierName.localeCompare(b.supplierName);
      else if (sortKey === 'total') cmp = a.totalAmount - b.totalAmount;
      else cmp = a.date.localeCompare(b.date);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [purchaseOrders, search, supplierId, status, dateRange, sortKey, sortDir]);

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
    const committed = filtered.filter((p) => p.status !== 'draft');
    const open = filtered.filter((p) => p.status === 'ordered' || p.status === 'partial');
    return {
      committedValue: committed.reduce((sum, p) => sum + p.totalAmount, 0),
      received: filtered.filter((p) => p.status === 'received').length,
      open: open.length,
      openValue: open.reduce(
        (sum, p) => sum + p.items.reduce((s, i) => s + (i.quantity - i.receivedQuantity) * i.unitPrice, 0),
        0
      ),
      drafts: filtered.filter((p) => p.status === 'draft').length,
    };
  }, [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) {
      addToast('warning', 'Nothing to export', 'No purchase orders match the current filters.');
      return;
    }
    exportToCSV(
      filtered.map((p) => ({
        'PO ID': p.orderId,
        Supplier: p.supplierName,
        'Order Date': formatDate(p.date),
        'Expected Delivery': p.expectedDeliveryDate ? formatDate(p.expectedDeliveryDate) : '',
        'Received Date': p.receivedDate ? formatDate(p.receivedDate) : '',
        Items: p.items.map((i) => `${i.productName} ${i.receivedQuantity}/${i.quantity}`).join('; '),
        Total: p.totalAmount,
        Status: p.status,
        Notes: p.notes,
      })),
      `drstock-purchases-${new Date().toISOString().slice(0, 10)}`
    );
    addToast('success', 'Export complete', `${filtered.length} purchase orders exported to CSV.`);
  };

  const resetFilters = () => {
    setSearch('');
    setSupplierId('all');
    setStatus('all');
    setDateRange(ALL_TIME);
    pagination.resetPage();
  };

  const activeFilterCount =
    (supplierId !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0) + (dateRange.preset !== 'all' ? 1 : 0);
  const canReceive = (s: string) => s === 'ordered' || s === 'partial';

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'orderId',
      header: 'PO #',
      sortValue: (p) => p.orderId,
      render: (p) => (
        <button
          onClick={() => setViewingId(p.id)}
          className="font-mono text-xs font-semibold text-foreground hover:text-primary transition-colors"
        >
          {p.orderId}
        </button>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      sortValue: (p) => p.supplierName,
      render: (p) => <span className="font-medium text-foreground block max-w-[200px] truncate">{p.supplierName}</span>,
    },
    {
      key: 'date',
      header: 'Order Date',
      sortValue: (p) => p.date,
      render: (p) => (
        <div className="whitespace-nowrap">
          <span className="text-secondary-text">{formatDate(p.date)}</span>
          {p.expectedDeliveryDate && p.status !== 'received' && (
            <p className="text-[11px] text-muted">Due {formatDate(p.expectedDeliveryDate)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Medicines',
      hideOnMobile: true,
      render: (p) => {
        const ordered = p.items.reduce((s, i) => s + i.quantity, 0);
        const received = p.items.reduce((s, i) => s + i.receivedQuantity, 0);
        return (
          <div className="max-w-[250px]">
            <span className="block truncate text-secondary-text">
              {p.items.length} {p.items.length === 1 ? 'item' : 'items'} · {p.items.map((i) => i.productName).join(', ')}
            </span>
            {p.status === 'partial' && (
              <span className="text-xs font-medium text-info">
                {received} of {ordered} units received
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: (p) => p.totalAmount,
      render: (p) => <span className="font-semibold text-foreground tabular-nums whitespace-nowrap">{formatCurrency(p.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge status={p.status} variant="dot" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => setViewingId(p.id)}
            className="h-7 px-2.5 text-xs font-medium text-secondary-text border border-border rounded-md hover:bg-hover-surface transition-colors"
          >
            Details
          </button>
          {canReceive(p.status) && (
            <button
              onClick={() => setReceivingId(p.id)}
              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-primary bg-primary-subtle rounded-md hover:bg-primary/15 transition-colors"
            >
              <PackageCheck className="w-3.5 h-3.5" /> Receive
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        description="Procure medicines from wholesale distributors and receive batches into inventory stock."
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> New Purchase Order
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Metric label="Committed Spend" value={formatCurrency(stats.committedValue)} hint="Ordered, partial & received" />
        <Metric
          label="Pending Delivery"
          value={String(stats.open)}
          hint={`${formatCurrency(stats.openValue)} awaiting receipt`}
          accent="text-info"
        />
        <Metric label="Received Orders" value={String(stats.received)} hint="Completed deliveries" accent="text-primary" />
        <Metric label="Draft POs" value={String(stats.drafts)} hint="Pending confirmation" />
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <DataTableToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            pagination.resetPage();
          }}
          searchPlaceholder="Search PO #, supplier, medicine…"
          activeFilterCount={activeFilterCount}
          onResetFilters={resetFilters}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          filters={
            <>
              <FilterDropdown
                value={supplierId}
                onChange={(val) => {
                  setSupplierId(val);
                  pagination.resetPage();
                }}
                options={[
                  { value: 'all', label: 'All suppliers' },
                  ...suppliers.map((s) => ({ value: s.id, label: s.company || s.name })),
                ]}
              />
              <FilterDropdown
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  pagination.resetPage();
                }}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'ordered', label: 'Ordered' },
                  { value: 'partial', label: 'Partially Received' },
                  { value: 'received', label: 'Received' },
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
          keyExtractor={(p) => p.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          emptyState={
            <EmptyState
              icon={ClipboardList}
              title={search || activeFilterCount > 0 ? 'No purchase orders match these filters' : 'No purchase orders yet'}
              description={
                search || activeFilterCount > 0
                  ? 'Try adjusting search terms or filter selections.'
                  : 'Create a purchase order to replenish medical supplies from a distributor.'
              }
              action={
                (search || activeFilterCount > 0) && (
                  <button
                    onClick={resetFilters}
                    className="h-9 px-4 text-[13px] font-medium text-primary bg-primary-subtle rounded-lg hover:bg-primary/15"
                  >
                    Reset Filters
                  </button>
                )
              }
            />
          }
          renderMobileCard={(p) => (
            <div className="p-4">
              <button onClick={() => setViewingId(p.id)} className="w-full text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-semibold text-foreground">{p.orderId}</span>
                  <StatusBadge status={p.status} variant="dot" />
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{p.supplierName}</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(p.totalAmount)}</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  {formatDate(p.date)} · {p.items.length} {p.items.length === 1 ? 'medicine' : 'medicines'}
                </p>
              </button>
              {canReceive(p.status) && (
                <button
                  onClick={() => setReceivingId(p.id)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 text-xs font-medium text-primary bg-primary-subtle rounded-lg hover:bg-primary/15"
                >
                  <PackageCheck className="w-4 h-4" /> Receive Stock
                </button>
              )}
            </div>
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
          itemLabel="purchase orders"
        />
      </div>

      <PurchaseFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        initialProductId={initialProductId}
        initialSupplierId={searchParams.get('supplier') ?? undefined}
      />
      <PurchaseDetailModal purchaseId={viewingId} onClose={() => setViewingId(null)} onReceive={setReceivingId} />
      <ReceivePurchaseModal purchaseId={receivingId} onClose={() => setReceivingId(null)} />
    </div>
  );
}
