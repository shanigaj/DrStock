'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pill, Plus, SlidersHorizontal, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '@/store';
import { Product, getStockStatus, getExpiryStatus } from '@/types';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import { usePagination } from '@/lib/pagination';
import {
  PageHeader,
  FilterDropdown,
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
import ProductFormModal from '@/components/inventory/ProductFormModal';
import StockAdjustmentModal from '@/components/inventory/StockAdjustmentModal';
import ProductDetailModal from '@/components/inventory/ProductDetailModal';

const STATUS_FILTERS = ['all', 'in-stock', 'low-stock', 'out-of-stock'];
const EXPIRY_FILTERS = ['all', 'valid', 'near-expiry', 'expired'];

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const products = useStore((s) => s.products);
  const profile = useStore((s) => s.businessProfile);
  const deleteProduct = useStore((s) => s.deleteProduct);

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState(() => {
    const s = searchParams.get('status') ?? 'all';
    return STATUS_FILTERS.includes(s) ? s : 'all';
  });
  const [expiry, setExpiry] = useState(() => {
    const e = searchParams.get('expiry') ?? 'all';
    return EXPIRY_FILTERS.includes(e) ? e : 'all';
  });
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [formState, setFormState] = useState<{ open: boolean; productId: string | null }>(() => ({
    open: searchParams.get('action') === 'create',
    productId: null,
  }));
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const warningDays = profile.expiryWarningDays || 90;
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).sort(), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesSearch =
        !q ||
        [p.name, p.sku, p.category, p.genericName, p.manufacturer, p.batchNumber, p.description]
          .some((v) => v && v.toLowerCase().includes(q));
      const st = getStockStatus(p.quantity, p.minimumStock);
      const matchesStatus = status === 'all' || st === status || (status === 'low-stock' && st === 'out-of-stock');
      const expSt = getExpiryStatus(p.expiryDate, warningDays);
      const matchesExpiry = expiry === 'all' || expSt === expiry;
      return matchesSearch && (category === 'all' || p.category === category) && matchesStatus && matchesExpiry;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'stock') cmp = a.quantity - b.quantity;
      else if (sortKey === 'price') cmp = a.sellingPrice - b.sellingPrice;
      else if (sortKey === 'expiry') cmp = (a.expiryDate || '9999-12-31').localeCompare(b.expiryDate || '9999-12-31');
      else cmp = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [products, search, category, status, expiry, sortKey, sortDir, warningDays]);

  const pagination = usePagination(filtered, 10);

  const handleSortChange = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
    pagination.resetPage();
  };

  const stats = useMemo(() => {
    let units = 0;
    let value = 0;
    let low = 0;
    let out = 0;
    let expiryCount = 0;
    for (const p of products) {
      units += p.quantity;
      value += p.quantity * p.costPrice;
      const st = getStockStatus(p.quantity, p.minimumStock);
      if (st === 'low-stock') low++;
      if (st === 'out-of-stock') out++;
      const exp = getExpiryStatus(p.expiryDate, warningDays);
      if (exp === 'near-expiry' || exp === 'expired') expiryCount++;
    }
    return { units, value, low, out, expiryCount };
  }, [products, warningDays]);

  const editingProduct = products.find((p) => p.id === formState.productId) ?? null;
  const deleting = products.find((p) => p.id === deletingId);

  const handleDelete = () => {
    if (!deletingId) return;
    const result = deleteProduct(deletingId);
    if (result.success) addToast('info', 'Medicine deleted', `${deleting?.name} was removed.`);
    else addToast('error', 'Cannot delete medicine', result.error);
    setDeletingId(null);
  };

  const handleExport = () => {
    exportToCSV(
      filtered.map((p) => ({
        SKU: p.sku,
        Medicine: p.name,
        Generic: p.genericName ?? '',
        Category: p.category,
        Manufacturer: p.manufacturer ?? '',
        Batch: p.batchNumber ?? '',
        Expiry: p.expiryDate ?? '',
        Unit: p.unit,
        Quantity: p.quantity,
        'Minimum Level': p.minimumStock,
        'Purchase Price': p.costPrice,
        'Selling Price': p.sellingPrice,
        'Stock Value': p.quantity * p.costPrice,
        'Stock Status': getStockStatus(p.quantity, p.minimumStock),
        'Expiry Status': getExpiryStatus(p.expiryDate, warningDays),
      })),
      `drstock-medicine-inventory-${new Date().toISOString().slice(0, 10)}`
    );
    addToast('success', 'Export complete', `${filtered.length} medicines exported to CSV.`);
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setStatus('all');
    setExpiry('all');
    pagination.resetPage();
  };

  const activeFilterCount = (category !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0) + (expiry !== 'all' ? 1 : 0);

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Medicine',
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="max-w-[260px]">
          <button
            onClick={() => setViewingId(p.id)}
            className="font-semibold text-foreground hover:text-primary text-left truncate block max-w-full transition-colors"
          >
            {p.name}
          </button>
          <p className="text-xs text-muted mt-0.5 truncate">
            <span className="font-mono text-secondary-text">{p.sku}</span>
            {p.genericName ? ` · ${p.genericName}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (p) => (
        <span className="inline-flex px-2 py-0.5 rounded-md bg-muted-surface border border-border text-secondary-text text-xs font-medium">
          {p.category}
        </span>
      ),
    },
    {
      key: 'expiry',
      header: 'Batch & Expiry',
      sortValue: (p) => p.expiryDate || '9999-12-31',
      render: (p) => {
        const expSt = getExpiryStatus(p.expiryDate, warningDays);
        const batchCount = p.batches?.filter((b) => b.quantity > 0).length ?? 0;
        return (
          <div className="whitespace-nowrap">
            <p className="font-mono text-xs font-medium text-foreground">
              {p.batchNumber || '—'}
              {batchCount > 1 && <span className="ml-1.5 text-[11px] font-sans text-primary">+{batchCount - 1} lots</span>}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted">{p.expiryDate ? formatDate(p.expiryDate) : 'No expiry'}</span>
              {expSt !== 'valid' && <StatusBadge status={expSt} variant="default" />}
            </div>
          </div>
        );
      },
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      sortValue: (p) => p.quantity,
      render: (p) => {
        const st = getStockStatus(p.quantity, p.minimumStock);
        return (
          <div className="whitespace-nowrap">
            <span
              className={`font-semibold tabular-nums ${
                st === 'out-of-stock' ? 'text-danger' : st === 'low-stock' ? 'text-warning' : 'text-foreground'
              }`}
            >
              {p.quantity}
            </span>{' '}
            <span className="text-xs text-muted">{p.unit.toLowerCase()}</span>
            <p className="text-[11px] text-subtle tabular-nums">min {p.minimumStock}</p>
          </div>
        );
      },
    },
    {
      key: 'price',
      header: 'Selling Price',
      align: 'right',
      sortValue: (p) => p.sellingPrice,
      render: (p) => (
        <div className="whitespace-nowrap">
          <span className="font-semibold text-foreground tabular-nums">{formatCurrency(p.sellingPrice)}</span>
          <p className="text-[11px] text-subtle tabular-nums">cost {formatCurrency(p.costPrice)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge status={getStockStatus(p.quantity, p.minimumStock)} variant="dot" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="inline-flex items-center gap-0.5">
          <button
            onClick={() => setAdjustingId(p.id)}
            aria-label={`Adjust stock for ${p.name}`}
            title="Adjust stock"
            className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary-subtle transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setViewingId(null);
              setFormState({ open: true, productId: p.id });
            }}
            aria-label={`Edit ${p.name}`}
            title="Edit medicine"
            className="p-1.5 rounded-md text-muted hover:text-primary hover:bg-primary-subtle transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingId(p.id)}
            aria-label={`Delete ${p.name}`}
            title="Delete medicine"
            className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger-bg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Medicine Inventory"
        description="Manage medicines, batch numbers, expiry dates, and minimum stock alerts."
        action={
          <button
            onClick={() => setFormState({ open: true, productId: null })}
            className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Medicine
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Metric label="Total Medicines" value={String(products.length)} hint={`${categories.length} categories`} />
        <Metric label="Total Units" value={stats.units.toLocaleString('en-IN')} hint="Available across batches" />
        <Metric label="Inventory Value" value={formatCurrency(stats.value)} hint="Valuation at cost" accent="text-primary" />
        <Metric
          label="Alerts"
          value={String(stats.low + stats.out + stats.expiryCount)}
          hint={`${stats.low} low · ${stats.out} out · ${stats.expiryCount} expiry`}
          accent={stats.low + stats.out + stats.expiryCount ? 'text-warning' : 'text-foreground'}
        />
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <DataTableToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            pagination.resetPage();
          }}
          searchPlaceholder="Search medicine, generic, SKU, batch…"
          activeFilterCount={activeFilterCount}
          onResetFilters={resetFilters}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          filters={
            <>
              <FilterDropdown
                value={category}
                onChange={(val) => {
                  setCategory(val);
                  pagination.resetPage();
                }}
                options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
              />
              <FilterDropdown
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  pagination.resetPage();
                }}
                options={[
                  { value: 'all', label: 'All stock statuses' },
                  { value: 'in-stock', label: 'In stock' },
                  { value: 'low-stock', label: 'Low & out of stock' },
                  { value: 'out-of-stock', label: 'Out of stock' },
                ]}
              />
              <FilterDropdown
                value={expiry}
                onChange={(val) => {
                  setExpiry(val);
                  pagination.resetPage();
                }}
                options={[
                  { value: 'all', label: 'All expiries' },
                  { value: 'valid', label: 'Valid batch' },
                  { value: 'near-expiry', label: 'Near expiry' },
                  { value: 'expired', label: 'Expired' },
                ]}
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
              icon={Pill}
              title={search || activeFilterCount > 0 ? 'No medicines match these filters' : 'No medicines in catalog'}
              description={
                search || activeFilterCount > 0
                  ? 'Try clearing your search or adjusting filter selections.'
                  : 'Add your first medicine to begin tracking stock and batches.'
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
          renderMobileCard={(p) => {
            const st = getStockStatus(p.quantity, p.minimumStock);
            const expSt = getExpiryStatus(p.expiryDate, warningDays);
            return (
              <div className="p-4">
                <button onClick={() => setViewingId(p.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        <span className="font-mono">{p.sku}</span> · {p.category} · {p.batchNumber || '—'}
                      </p>
                    </div>
                    <StatusBadge status={st} variant="dot" />
                  </div>
                  <div className="flex items-center justify-between mt-2.5 text-[13px]">
                    <span className="tabular-nums">
                      <span
                        className={`font-semibold ${
                          st === 'out-of-stock' ? 'text-danger' : st === 'low-stock' ? 'text-warning' : 'text-foreground'
                        }`}
                      >
                        {p.quantity}
                      </span>
                      <span className="text-muted"> / min {p.minimumStock} {p.unit.toLowerCase()}</span>
                    </span>
                    <span className="tabular-nums font-semibold text-foreground">{formatCurrency(p.sellingPrice)}</span>
                  </div>
                  {expSt !== 'valid' && (
                    <div className="mt-2">
                      <StatusBadge status={expSt} variant="dot" />
                    </div>
                  )}
                </button>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setAdjustingId(p.id)}
                    className="flex-1 h-9 text-xs font-medium text-secondary-text border border-border rounded-lg hover:bg-hover-surface"
                  >
                    Adjust Stock
                  </button>
                  <button
                    onClick={() => {
                      setViewingId(null);
                      setFormState({ open: true, productId: p.id });
                    }}
                    className="flex-1 h-9 text-xs font-medium text-secondary-text border border-border rounded-lg hover:bg-hover-surface"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          }}
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
          itemLabel="medicines"
        />
      </div>

      <ProductFormModal
        open={formState.open}
        product={editingProduct}
        onClose={() => setFormState({ open: false, productId: null })}
      />
      <ProductDetailModal
        productId={viewingId}
        onClose={() => setViewingId(null)}
        onAdjust={(id) => setAdjustingId(id)}
        onEdit={(id) => {
          setViewingId(null);
          setFormState({ open: true, productId: id });
        }}
      />
      <StockAdjustmentModal productId={adjustingId} onClose={() => setAdjustingId(null)} />
      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleting?.name ?? 'medicine'}?`}
        description="The medicine will be removed from the catalog. Items referenced by sales or purchase orders cannot be deleted."
        confirmLabel="Delete Medicine"
        variant="danger"
      />
    </div>
  );
}
