'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { History, ArrowDownLeft, ArrowUpRight, SlidersHorizontal, RotateCcw, LucideIcon } from 'lucide-react';
import { useStore } from '@/store';
import { MovementType, StockMovement } from '@/types';
import { formatDateTime, exportToCSV, isInDateRange, ALL_TIME, DateRange } from '@/lib/utils';
import { usePagination } from '@/lib/pagination';
import { PageHeader, FilterDropdown, DateRangeFilter, EmptyState, Metric } from '@/components/ui/SharedComponents';
import {
  DataTable,
  DataTableColumn,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/ToastProvider';
import MovementQuantity from '@/components/inventory/MovementQuantity';

const MOVEMENT_STYLES: Record<MovementType, { label: string; icon: LucideIcon; className: string }> = {
  purchase: { label: 'Purchase', icon: ArrowDownLeft, className: 'bg-info-bg text-info border-info/20' },
  sale: { label: 'Sale', icon: ArrowUpRight, className: 'bg-primary-subtle text-primary border-primary/20' },
  adjustment: { label: 'Adjustment', icon: SlidersHorizontal, className: 'bg-muted-surface text-secondary-text border-border' },
  return: { label: 'Return', icon: RotateCcw, className: 'bg-warning-bg text-warning border-warning/20' },
};

function MovementBadge({ type }: { type: MovementType }) {
  const { label, icon: Icon, className } = MOVEMENT_STYLES[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function StockHistoryPage() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const stockMovements = useStore((s) => s.stockMovements);
  const products = useStore((s) => s.products);

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [type, setType] = useState('all');
  const [productId, setProductId] = useState(() => searchParams.get('product') ?? 'all');
  const [dateRange, setDateRange] = useState<DateRange>(ALL_TIME);
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = stockMovements.filter((m) => {
      const matchesSearch =
        !q || [m.productName, m.sku, m.reference, m.notes].some((v) => v.toLowerCase().includes(q));
      return (
        matchesSearch &&
        (type === 'all' || m.movementType === type) &&
        (productId === 'all' || m.productId === productId) &&
        isInDateRange(m.date, dateRange)
      );
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'product') cmp = a.productName.localeCompare(b.productName);
      else if (sortKey === 'qty') cmp = a.quantity - b.quantity;
      else cmp = a.date.localeCompare(b.date);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [stockMovements, search, type, productId, dateRange, sortKey, sortDir]);

  const pagination = usePagination(filtered, 10);

  const handleSortChange = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
    pagination.resetPage();
  };

  const totals = useMemo(() => {
    let inward = 0;
    let outward = 0;
    for (const m of filtered) {
      if (m.quantity > 0) inward += m.quantity;
      else outward += -m.quantity;
    }
    return { inward, outward, net: inward - outward };
  }, [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) {
      addToast('warning', 'Nothing to export', 'No stock movements match the current filters.');
      return;
    }
    exportToCSV(
      filtered.map((m) => ({
        Date: formatDateTime(m.date),
        Medicine: m.productName,
        SKU: m.sku,
        Type: m.movementType,
        Change: m.quantity,
        'Previous Stock': m.previousStock,
        'New Stock': m.newStock,
        Reference: m.reference,
        Notes: m.notes,
      })),
      `drstock-stock-history-${new Date().toISOString().slice(0, 10)}`
    );
    addToast('success', 'Export complete', `${filtered.length} ledger records exported to CSV.`);
  };

  const resetFilters = () => {
    setSearch('');
    setType('all');
    setProductId('all');
    setDateRange(ALL_TIME);
    pagination.resetPage();
  };

  const activeFilterCount =
    (type !== 'all' ? 1 : 0) + (productId !== 'all' ? 1 : 0) + (dateRange.preset !== 'all' ? 1 : 0);

  const columns: DataTableColumn<StockMovement>[] = [
    {
      key: 'date',
      header: 'Date & Time',
      sortValue: (m) => m.date,
      render: (m) => <span className="text-muted whitespace-nowrap text-xs">{formatDateTime(m.date)}</span>,
    },
    {
      key: 'product',
      header: 'Medicine',
      sortValue: (m) => m.productName,
      render: (m) => (
        <div className="max-w-[220px]">
          <p className="font-medium text-foreground truncate">{m.productName}</p>
          <p className="font-mono text-[11px] text-muted">{m.sku}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Movement',
      render: (m) => <MovementBadge type={m.movementType} />,
    },
    {
      key: 'qty',
      header: 'Change',
      align: 'right',
      sortValue: (m) => m.quantity,
      render: (m) => <MovementQuantity quantity={m.quantity} />,
    },
    {
      key: 'prev',
      header: 'Prev',
      align: 'right',
      render: (m) => <span className="tabular-nums text-muted">{m.previousStock}</span>,
    },
    {
      key: 'new',
      header: 'New',
      align: 'right',
      render: (m) => <span className="tabular-nums font-semibold text-foreground">{m.newStock}</span>,
    },
    {
      key: 'ref',
      header: 'Reference',
      render: (m) => <span className="font-mono text-xs font-medium text-secondary-text whitespace-nowrap">{m.reference}</span>,
    },
    {
      key: 'notes',
      header: 'Reason / Notes',
      hideOnMobile: true,
      render: (m) => (
        <span className="text-muted max-w-[240px] truncate block" title={m.notes}>
          {m.notes || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock History & Audit Ledger"
        description="Immutable ledger of every medicine intake, sale dispense, return, and stock adjustment."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Metric label="Ledger Entries" value={String(filtered.length)} hint="Matching active filters" />
        <Metric label="Stock Inward" value={`+${totals.inward}`} hint="Purchases, returns, surpluses" accent="text-info" />
        <Metric label="Stock Outward" value={`−${totals.outward}`} hint="Dispensed sales & deductions" accent="text-danger" />
        <Metric
          label="Net Balance Change"
          value={`${totals.net >= 0 ? '+' : '−'}${Math.abs(totals.net)}`}
          hint="Units across filtered ledger"
          accent={totals.net >= 0 ? 'text-primary' : 'text-danger'}
        />
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <DataTableToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            pagination.resetPage();
          }}
          searchPlaceholder="Search medicine, SKU, reference #, notes…"
          activeFilterCount={activeFilterCount}
          onResetFilters={resetFilters}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          filters={
            <>
              <FilterDropdown
                value={type}
                onChange={(val) => {
                  setType(val);
                  pagination.resetPage();
                }}
                options={[
                  { value: 'all', label: 'All movement types' },
                  ...Object.entries(MOVEMENT_STYLES).map(([value, s]) => ({ value, label: s.label })),
                ]}
              />
              <FilterDropdown
                value={productId}
                onChange={(val) => {
                  setProductId(val);
                  pagination.resetPage();
                }}
                className="md:max-w-[220px]"
                options={[
                  { value: 'all', label: 'All medicines' },
                  ...products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` })),
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
          keyExtractor={(m) => m.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          emptyState={
            <EmptyState
              icon={History}
              title="No ledger movements found"
              description="No stock movements match your current filter criteria."
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
          renderMobileCard={(m) => (
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground truncate">{m.productName}</p>
                <MovementQuantity quantity={m.quantity} />
              </div>
              <div className="flex items-center justify-between gap-3 mt-1.5">
                <MovementBadge type={m.movementType} />
                <span className="text-xs text-muted tabular-nums">
                  {m.previousStock} → <strong className="text-foreground">{m.newStock}</strong>
                </span>
              </div>
              <p className="text-xs text-muted mt-1.5 truncate">
                {formatDateTime(m.date)} · <span className="font-mono">{m.reference}</span>
                {m.notes ? ` · ${m.notes}` : ''}
              </p>
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
          itemLabel="movements"
        />
      </div>
    </div>
  );
}
