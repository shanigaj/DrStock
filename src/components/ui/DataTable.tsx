'use client';

import { ReactNode, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Download,
  X,
} from 'lucide-react';
import { PAGE_SIZE_OPTIONS, PageSize } from '@/lib/pagination';
import { SearchInput } from './SharedComponents';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
  sortValue?: (row: T) => string | number;
  hideOnMobile?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  sortKey?: string | null;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string) => void;
  renderMobileCard?: (row: T) => ReactNode;
  stickyHeader?: boolean;
  maxHeightClass?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  onRowClick,
  sortKey,
  sortDir,
  onSortChange,
  renderMobileCard,
  stickyHeader = true,
  maxHeightClass,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop / Horizontal Scrollable Table */}
      <div
        className={`${renderMobileCard ? 'hidden md:block' : 'block'} overflow-x-auto ${
          maxHeightClass ? `${maxHeightClass} overflow-y-auto` : ''
        }`}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted-surface">
              {columns.map((col) => {
                const isSortable = Boolean(col.sortValue && onSortChange);
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap ${
                      stickyHeader ? 'sticky top-0 z-10 bg-muted-surface shadow-[0_1px_0_0_var(--border)]' : ''
                    } ${col.align === 'right' ? 'text-right' : 'text-left'} ${
                      col.hideOnMobile ? 'hidden lg:table-cell' : ''
                    } ${col.className || ''}`}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange?.(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
                          col.align === 'right' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {isActive ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-subtle" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={`min-h-[52px] ${
                  onRowClick ? 'cursor-pointer hover:bg-hover-surface/70' : 'hover:bg-muted-surface/60'
                } transition-colors`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[13px] sm:text-sm ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.hideOnMobile ? 'hidden lg:table-cell' : ''} ${col.className || ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optional Mobile Card View */}
      {renderMobileCard && (
        <ul className="md:hidden divide-y divide-border bg-surface">
          {data.map((row) => (
            <li key={keyExtractor(row)}>{renderMobileCard(row)}</li>
          ))}
        </ul>
      )}
    </>
  );
}

interface DataTablePaginationProps {
  page: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  itemLabel?: string;
}

export function DataTablePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'results',
}: DataTablePaginationProps) {
  const [jumpValue, setJumpValue] = useState('');

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(jumpValue);
    if (Number.isInteger(target) && target >= 1) {
      onPageChange(Math.min(target, totalPages));
    }
    setJumpValue('');
  };

  const navBtn =
    'h-8 w-8 inline-flex items-center justify-center rounded-md border border-border bg-surface text-secondary-text hover:bg-hover-surface hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus';

  return (
    <div className="px-4 py-3 border-t border-border bg-muted-surface/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-b-xl">
      {/* Result Count */}
      <div className="flex items-center justify-between sm:justify-start gap-3 text-xs text-muted tabular-nums">
        <span>
          {totalItems === 0 ? (
            `0 ${itemLabel}`
          ) : (
            <>
              Showing <span className="font-semibold text-foreground">{startIndex}–{endIndex}</span> of{' '}
              <span className="font-semibold text-foreground">{totalItems}</span> {itemLabel}
            </>
          )}
        </span>

        {/* Mobile Page Size Selector */}
        <div className="flex sm:hidden items-center gap-1.5">
          <label htmlFor="mobile-page-size" className="text-xs text-muted">
            Rows:
          </label>
          <select
            id="mobile-page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            className="h-7 px-2 text-xs bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-focus"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop & Mobile Navigation Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
        {/* Desktop Page Size */}
        <div className="hidden sm:flex items-center gap-2">
          <label htmlFor="desktop-page-size" className="text-xs text-muted whitespace-nowrap">
            Rows per page
          </label>
          <select
            id="desktop-page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            className="h-8 px-2 text-xs font-medium bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-focus cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Optional Quick Page Jump for large datasets */}
        {totalPages > 4 && (
          <form onSubmit={handleJump} className="hidden lg:flex items-center gap-1.5">
            <label htmlFor="jump-page" className="text-xs text-muted">
              Go to
            </label>
            <input
              id="jump-page"
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              placeholder={String(page)}
              className="w-12 h-8 px-2 text-xs text-center bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-focus tabular-nums"
            />
          </form>
        )}

        <span className="text-xs font-medium text-secondary-text tabular-nums whitespace-nowrap">
          Page <span className="text-foreground font-semibold">{page}</span> of {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First page"
            title="First page"
            className={`hidden sm:inline-flex ${navBtn}`}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            title="Previous page"
            className={navBtn}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            title="Next page"
            className={navBtn}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
            title="Last page"
            className={`hidden sm:inline-flex ${navBtn}`}
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface DataTableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  onExport?: () => void;
  exportDisabled?: boolean;
}

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  activeFilterCount = 0,
  onResetFilters,
  onExport,
  exportDisabled = false,
}: DataTableToolbarProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="p-3.5 sm:p-4 border-b border-border bg-surface rounded-t-xl">
      <div className="flex flex-col md:flex-row gap-2.5 md:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="flex-1 md:max-w-sm"
          />

          {/* Mobile Filters Trigger */}
          {filters && (
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden relative h-9 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Desktop Filters & Actions */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
          {filters}
          {(activeFilterCount > 0 || search) && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="h-9 px-2.5 text-[13px] font-medium text-muted hover:text-foreground transition-colors"
            >
              Reset
            </button>
          )}
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              disabled={exportDisabled}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-muted" /> Export CSV
            </button>
          )}
        </div>

        {/* Mobile Export Button when applicable */}
        {onExport && (
          <div className="flex md:hidden items-center justify-between gap-2">
            {(activeFilterCount > 0 || search) && onResetFilters ? (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-xs font-medium text-primary hover:underline"
              >
                Reset filters ({activeFilterCount + (search ? 1 : 0)})
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onExport}
              disabled={exportDisabled}
              className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-muted" /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filter Drawer Modal */}
      {mobileFiltersOpen && filters && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center no-print" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-[1px]" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative w-full bg-surface rounded-t-2xl border-t border-border shadow-xl p-5 space-y-4 animate-in">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Filter Records</h3>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-1 text-muted hover:text-foreground rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">{filters}</div>
            <div className="flex gap-2 pt-2 border-t border-border">
              {onResetFilters && (
                <button
                  type="button"
                  onClick={() => {
                    onResetFilters();
                    setMobileFiltersOpen(false);
                  }}
                  className="flex-1 h-10 text-sm font-medium text-secondary-text border border-border rounded-lg hover:bg-hover-surface"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 h-10 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
