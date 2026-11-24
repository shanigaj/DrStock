'use client';

import { useMemo, useState } from 'react';
import { Pill } from 'lucide-react';
import { useStore } from '@/store';
import { Product, getStockStatus, getExpiryStatus } from '@/types';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import { usePagination } from '@/lib/pagination';
import { Metric, StatusBadge, EmptyState } from '@/components/ui/SharedComponents';
import { DataTable, DataTableColumn, DataTablePagination, DataTableToolbar } from '@/components/ui/DataTable';
import { useToast } from '@/components/ui/ToastProvider';
import { ReportCard, RankedBars } from './ReportParts';

export default function StockReport() {
  const { addToast } = useToast();
  const products = useStore((s) => s.products);
  const warningDays = useStore((s) => s.businessProfile.expiryWarningDays || 90);
  const [search, setSearch] = useState('');

  // Full dataset analytics (never derived from paginated rows)
  const analytics = useMemo(() => {
    const rows = [...products].sort((a, b) => b.quantity * b.costPrice - a.quantity * a.costPrice);
    const units = rows.reduce((a, p) => a + p.quantity, 0);
    const value = rows.reduce((a, p) => a + p.quantity * p.costPrice, 0);
    const retail = rows.reduce((a, p) => a + p.quantity * p.sellingPrice, 0);
    const low = rows.filter((p) => getStockStatus(p.quantity, p.minimumStock) === 'low-stock');
    const out = rows.filter((p) => getStockStatus(p.quantity, p.minimumStock) === 'out-of-stock');
    const nearExpiry = rows.filter((p) => getExpiryStatus(p.expiryDate, warningDays) === 'near-expiry');
    const expired = rows.filter((p) => getExpiryStatus(p.expiryDate, warningDays) === 'expired');

    const categories = new Map<string, { value: number; units: number; count: number }>();
    for (const p of rows) {
      const c = categories.get(p.category) ?? { value: 0, units: 0, count: 0 };
      categories.set(p.category, {
        value: c.value + p.quantity * p.costPrice,
        units: c.units + p.quantity,
        count: c.count + 1,
      });
    }
    return {
      rows,
      units,
      value,
      retail,
      low,
      out,
      nearExpiry,
      expired,
      categories: [...categories.entries()].sort((a, b) => b[1].value - a[1].value),
    };
  }, [products, warningDays]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return analytics.rows;
    return analytics.rows.filter((p) =>
      [p.name, p.sku, p.category, p.batchNumber].some((v) => v && v.toLowerCase().includes(q))
    );
  }, [analytics.rows, search]);

  const pagination = usePagination(filtered, 10);

  const exportCsv = () => {
    exportToCSV(
      filtered.map((p) => ({
        SKU: p.sku,
        Medicine: p.name,
        Category: p.category,
        Batch: p.batchNumber ?? '',
        Expiry: p.expiryDate ?? '',
        Stock: p.quantity,
        Unit: p.unit,
        'Minimum Stock': p.minimumStock,
        'Purchase Price': p.costPrice,
        'Selling Price': p.sellingPrice,
        'Cost Valuation': p.quantity * p.costPrice,
        'Retail Valuation': p.quantity * p.sellingPrice,
        'Stock Status': getStockStatus(p.quantity, p.minimumStock),
        'Expiry Status': getExpiryStatus(p.expiryDate, warningDays),
      })),
      `drstock-stock-report-${new Date().toISOString().slice(0, 10)}`
    );
    addToast('success', 'Stock report exported', `${filtered.length} medicines exported.`);
  };

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Medicine',
      render: (p) => (
        <div>
          <p className="font-medium text-foreground">{p.name}</p>
          <p className="font-mono text-xs text-muted">{p.sku}</p>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Batch & Expiry',
      render: (p) => {
        const expSt = getExpiryStatus(p.expiryDate, warningDays);
        return (
          <div className="text-xs">
            <span className="font-mono text-secondary-text">{p.batchNumber || '—'}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-muted">{p.expiryDate ? formatDate(p.expiryDate) : '—'}</span>
              {expSt !== 'valid' && <StatusBadge status={expSt} variant="default" />}
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (p) => <span className="text-secondary-text">{p.category}</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (p) => (
        <span className="tabular-nums">
          <span className="font-semibold text-foreground">{p.quantity}</span>
          <span className="text-xs text-muted"> / {p.minimumStock}</span>
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Unit Cost',
      align: 'right',
      render: (p) => <span className="tabular-nums text-secondary-text">{formatCurrency(p.costPrice)}</span>,
    },
    {
      key: 'value',
      header: 'Valuation',
      align: 'right',
      render: (p) => <span className="tabular-nums font-semibold text-foreground">{formatCurrency(p.quantity * p.costPrice)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge status={getStockStatus(p.quantity, p.minimumStock)} variant="dot" />,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Metric label="Total Medicines" value={String(products.length)} hint={`${analytics.units.toLocaleString('en-IN')} total units`} />
        <Metric label="Stock Valuation" value={formatCurrency(analytics.value)} hint="At purchase cost" accent="text-primary" />
        <Metric
          label="Retail Value"
          value={formatCurrency(analytics.retail)}
          hint={`${formatCurrency(analytics.retail - analytics.value)} margin potential`}
        />
        <Metric
          label="Low Stock / Expiry"
          value={`${analytics.low.length + analytics.out.length} / ${analytics.nearExpiry.length + analytics.expired.length}`}
          hint={`${analytics.out.length} out of stock · ${analytics.expired.length} expired`}
          accent={analytics.low.length + analytics.out.length + analytics.expired.length ? 'text-warning' : 'text-foreground'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ReportCard title="Category Valuation Distribution" subtitle="Inventory value at cost price">
          <RankedBars
            empty="No medicines"
            color="bg-primary"
            rows={analytics.categories.map(([name, c]) => ({
              key: name,
              label: name,
              value: c.value,
              display: formatCurrency(c.value),
              sublabel: `${c.count} items · ${c.units.toLocaleString('en-IN')} units · ${
                analytics.value ? Math.round((c.value / analytics.value) * 100) : 0
              }%`,
            }))}
          />
        </ReportCard>
        <ReportCard title="Replenishment & Expiry Alerts" subtitle="Low stock, out of stock, and near-expiry batches">
          {analytics.low.length + analytics.out.length + analytics.nearExpiry.length + analytics.expired.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-muted">All medicines are well-stocked and within valid expiry ranges.</p>
          ) : (
            <ul className="divide-y divide-border max-h-[340px] overflow-y-auto">
              {[...analytics.out, ...analytics.low].map((p) => (
                <li key={`low-${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.quantity} left · Min {p.minimumStock} · Suggested order:{' '}
                      <span className="font-semibold text-foreground">{Math.max(p.minimumStock * 2 - p.quantity, 5)}</span>
                    </p>
                  </div>
                  <StatusBadge status={getStockStatus(p.quantity, p.minimumStock)} />
                </li>
              ))}
              {[...analytics.expired, ...analytics.nearExpiry].map((p) => (
                <li key={`exp-${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 bg-danger-bg/30">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted">
                      Batch <span className="font-mono">{p.batchNumber || '—'}</span> · Exp {formatDate(p.expiryDate || '')}
                    </p>
                  </div>
                  <StatusBadge status={getExpiryStatus(p.expiryDate, warningDays)} />
                </li>
              ))}
            </ul>
          )}
        </ReportCard>
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <DataTableToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            pagination.resetPage();
          }}
          searchPlaceholder="Filter stock report by medicine, SKU, batch…"
          onResetFilters={search ? () => { setSearch(''); pagination.resetPage(); } : undefined}
          onExport={exportCsv}
          exportDisabled={filtered.length === 0}
        />
        <DataTable
          columns={columns}
          data={pagination.items}
          keyExtractor={(p) => p.id}
          emptyState={<EmptyState icon={Pill} title="No matching medicines" description="Try another search query." />}
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
    </div>
  );
}
