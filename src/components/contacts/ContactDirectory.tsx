'use client';

import { ReactNode, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, LucideIcon } from 'lucide-react';
import { Customer } from '@/types';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils';
import { usePagination } from '@/lib/pagination';
import {
  PageHeader,
  FilterDropdown,
  Modal,
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
import ContactFormModal from './ContactFormModal';

export interface ContactStats {
  orders: number;
  value: number;
  lastOrder: string | null;
}

interface Props {
  kind: 'customer' | 'supplier';
  icon: LucideIcon;
  title: string;
  description: string;
  contacts: Customer[];
  stats: Map<string, ContactStats>;
  valueLabel: string;
  initialSearch: string;
  initialCreate: boolean;
  onDelete: (id: string) => { success: boolean; error?: string };
  renderHistory: (contact: Customer) => ReactNode;
}

const EMPTY: ContactStats = { orders: 0, value: 0, lastOrder: null };

export default function ContactDirectory({
  kind,
  icon,
  title,
  description,
  contacts,
  stats,
  valueLabel,
  initialSearch,
  initialCreate,
  onDelete,
  renderHistory,
}: Props) {
  const { addToast } = useToast();
  const [search, setSearch] = useState(initialSearch);
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortKey, setSortKey] = useState<string>('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [form, setForm] = useState<{ open: boolean; id: string | null }>({ open: initialCreate, id: null });
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const noun = kind === 'customer' ? 'Patient' : 'Supplier';
  const plural = kind === 'customer' ? 'patients' : 'suppliers';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = contacts.filter((c) => {
      const s = stats.get(c.id) ?? EMPTY;
      const matchesSearch =
        !q ||
        [c.name, c.company, c.phone, c.email, c.address, c.bloodGroup]
          .some((v) => v && v.toLowerCase().includes(q));
      const matchesActivity =
        activityFilter === 'all' ||
        (activityFilter === 'active' && s.orders > 0) ||
        (activityFilter === 'inactive' && s.orders === 0);
      return matchesSearch && matchesActivity;
    });

    return list.sort((a, b) => {
      const sa = stats.get(a.id) ?? EMPTY;
      const sb = stats.get(b.id) ?? EMPTY;
      let cmp = 0;
      if (sortKey === 'name') {
        const na = kind === 'supplier' ? a.company || a.name : a.name;
        const nb = kind === 'supplier' ? b.company || b.name : b.name;
        cmp = na.localeCompare(nb);
      } else if (sortKey === 'orders') {
        cmp = sa.orders - sb.orders;
      } else {
        cmp = sa.value - sb.value;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [contacts, search, activityFilter, stats, sortKey, sortDir, kind]);

  const pagination = usePagination(filtered, 10);

  const handleSortChange = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
    pagination.resetPage();
  };

  const totals = useMemo(() => {
    let value = 0;
    let orders = 0;
    for (const s of stats.values()) {
      value += s.value;
      orders += s.orders;
    }
    return { value, orders, active: [...stats.values()].filter((s) => s.orders > 0).length };
  }, [stats]);

  const viewing = contacts.find((c) => c.id === viewingId) ?? null;
  const editing = contacts.find((c) => c.id === form.id) ?? null;
  const deleting = contacts.find((c) => c.id === deletingId);

  const handleDelete = () => {
    if (!deletingId) return;
    const result = onDelete(deletingId);
    if (result.success) addToast('info', `${noun} deleted`, deleting?.name);
    else addToast('error', `Cannot delete ${noun.toLowerCase()}`, result.error);
    setDeletingId(null);
  };

  const openEdit = (id: string) => {
    setViewingId(null);
    setForm({ open: true, id });
  };

  const resetFilters = () => {
    setSearch('');
    setActivityFilter('all');
    pagination.resetPage();
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    exportToCSV(
      filtered.map((c) => {
        const s = stats.get(c.id) ?? EMPTY;
        return {
          Name: kind === 'supplier' ? c.company || c.name : c.name,
          Contact: kind === 'supplier' ? c.name : c.phone,
          Phone: c.phone,
          Email: c.email,
          Address: c.address,
          ...(kind === 'customer'
            ? { Age: c.age ?? '', Gender: c.gender ?? '', 'Blood Group': c.bloodGroup ?? '' }
            : {}),
          [kind === 'customer' ? 'Invoices' : 'Purchase Orders']: s.orders,
          [valueLabel]: s.value,
          'Last Transaction': s.lastOrder ? formatDate(s.lastOrder) : '',
        };
      }),
      `drstock-${plural}-${new Date().toISOString().slice(0, 10)}`
    );
    addToast('success', 'Export complete', `${filtered.length} ${plural} exported to CSV.`);
  };

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name',
      header: noun,
      sortValue: (c) => (kind === 'supplier' ? c.company || c.name : c.name),
      render: (c) => (
        <div className="max-w-[240px]">
          <button
            onClick={() => setViewingId(c.id)}
            className="font-semibold text-foreground hover:text-primary text-left truncate block max-w-full transition-colors"
          >
            {kind === 'supplier' ? c.company || c.name : c.name}
          </button>
          {kind === 'supplier' && c.company && <p className="text-xs text-muted truncate">{c.name}</p>}
          {kind === 'customer' && c.lastVisit && (
            <p className="text-xs text-subtle mt-0.5">Last visit {formatDate(c.lastVisit)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      render: (c) => (
        <div>
          <p className="whitespace-nowrap font-medium text-secondary-text">{c.phone}</p>
          {c.email && <p className="text-xs text-muted truncate max-w-[200px]">{c.email}</p>}
        </div>
      ),
    },
    ...(kind === 'customer'
      ? [
          {
            key: 'demographics',
            header: 'Demographics',
            hideOnMobile: true,
            render: (c: Customer) => (
              <div className="text-xs text-secondary-text">
                {c.age ? `${c.age} yrs` : '—'} · {c.gender || '—'}
                {c.bloodGroup && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-danger-bg text-danger font-semibold border border-danger/20">
                    {c.bloodGroup}
                  </span>
                )}
              </div>
            ),
          },
        ]
      : [
          {
            key: 'address',
            header: 'Address',
            hideOnMobile: true,
            render: (c: Customer) => (
              <span className="text-xs text-muted max-w-[220px] truncate block" title={c.address}>
                {c.address || '—'}
              </span>
            ),
          },
        ]),
    {
      key: 'orders',
      header: kind === 'customer' ? 'Bills' : 'POs',
      align: 'right',
      sortValue: (c) => (stats.get(c.id) ?? EMPTY).orders,
      render: (c) => <span className="tabular-nums text-secondary-text">{(stats.get(c.id) ?? EMPTY).orders}</span>,
    },
    {
      key: 'value',
      header: valueLabel,
      align: 'right',
      sortValue: (c) => (stats.get(c.id) ?? EMPTY).value,
      render: (c) => (
        <span className="tabular-nums font-semibold text-foreground whitespace-nowrap">
          {formatCurrency((stats.get(c.id) ?? EMPTY).value)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="inline-flex items-center gap-1 whitespace-nowrap">
          <button
            onClick={() => setViewingId(c.id)}
            className="h-7 px-2.5 text-xs font-medium text-secondary-text border border-border rounded-md hover:bg-hover-surface transition-colors"
          >
            View
          </button>
          <button
            onClick={() => openEdit(c.id)}
            aria-label={`Edit ${c.name}`}
            title="Edit"
            className="p-1.5 text-muted hover:text-primary hover:bg-primary-subtle rounded-md transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingId(c.id)}
            aria-label={`Delete ${c.name}`}
            title="Delete"
            className="p-1.5 text-muted hover:text-danger hover:bg-danger-bg rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const activeFilterCount = activityFilter !== 'all' ? 1 : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        action={
          <button
            onClick={() => setForm({ open: true, id: null })}
            className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" /> Add {noun}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Metric
          label={kind === 'customer' ? 'Registered Patients' : 'Medical Suppliers'}
          value={String(contacts.length)}
          hint={`${totals.active} with transactions`}
        />
        <Metric
          label={kind === 'customer' ? 'Total Bills' : 'Purchase Orders'}
          value={String(totals.orders)}
          hint={kind === 'customer' ? 'Excludes cancelled' : 'Excludes drafts'}
        />
        <Metric label={valueLabel} value={formatCurrency(totals.value)} hint="All time" accent="text-primary" />
        <Metric
          label={`Avg per ${noun}`}
          value={formatCurrency(totals.active ? totals.value / totals.active : 0)}
          hint={`Across active ${plural}`}
        />
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <DataTableToolbar
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            pagination.resetPage();
          }}
          searchPlaceholder={`Search ${plural} by name, phone, email…`}
          activeFilterCount={activeFilterCount}
          onResetFilters={resetFilters}
          onExport={handleExport}
          exportDisabled={filtered.length === 0}
          filters={
            <FilterDropdown
              value={activityFilter}
              onChange={(val) => {
                setActivityFilter(val as 'all' | 'active' | 'inactive');
                pagination.resetPage();
              }}
              options={[
                { value: 'all', label: `All ${plural}` },
                { value: 'active', label: 'With transactions' },
                { value: 'inactive', label: 'No transactions yet' },
              ]}
            />
          }
        />

        <DataTable
          columns={columns}
          data={pagination.items}
          keyExtractor={(c) => c.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          emptyState={
            <EmptyState
              icon={icon}
              title={search || activeFilterCount > 0 ? `No ${plural} match these filters` : `No ${plural} yet`}
              description={
                search || activeFilterCount > 0
                  ? 'Try adjusting your search or filter selections.'
                  : `Add your first ${noun.toLowerCase()} to get started.`
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
          renderMobileCard={(c) => {
            const s = stats.get(c.id) ?? EMPTY;
            return (
              <div className="p-4">
                <button onClick={() => setViewingId(c.id)} className="w-full text-left">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {kind === 'supplier' ? c.company || c.name : c.name}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-primary shrink-0">
                      {formatCurrency(s.value)}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {c.phone} · {s.orders} {s.orders === 1 ? 'order' : 'orders'}
                    {kind === 'customer' && c.bloodGroup ? ` · ${c.bloodGroup}` : ''}
                  </p>
                </button>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEdit(c.id)}
                    className="flex-1 h-9 text-xs font-medium text-secondary-text border border-border rounded-lg hover:bg-hover-surface"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(c.id)}
                    className="flex-1 h-9 text-xs font-medium text-danger border border-danger/25 rounded-lg hover:bg-danger-bg"
                  >
                    Delete
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
          itemLabel={plural}
        />
      </div>

      <ContactFormModal kind={kind} open={form.open} contact={editing} onClose={() => setForm({ open: false, id: null })} />

      <Modal
        open={viewing !== null}
        onClose={() => setViewingId(null)}
        title={viewing ? (kind === 'supplier' ? viewing.company || viewing.name : viewing.name) : ''}
        size="lg"
      >
        {viewing && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[13px] text-secondary-text p-4 bg-muted-surface rounded-xl border border-border">
              <div className="sm:col-span-2 flex items-center justify-between gap-2">
                <p className="font-semibold text-foreground">{viewing.name}</p>
                {kind === 'customer' && (viewing.age || viewing.bloodGroup) && (
                  <span className="text-xs text-muted">
                    {viewing.age ? `${viewing.age} yrs` : ''} {viewing.gender ? `· ${viewing.gender}` : ''}{' '}
                    {viewing.bloodGroup ? `· ${viewing.bloodGroup}` : ''}
                  </span>
                )}
              </div>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-subtle" /> {viewing.phone}
              </p>
              {viewing.email && (
                <p className="flex items-center gap-2 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-subtle shrink-0" /> <span className="truncate">{viewing.email}</span>
                </p>
              )}
              {viewing.address && (
                <p className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-subtle mt-0.5 shrink-0" /> {viewing.address}
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Metric label={kind === 'customer' ? 'Invoices' : 'Orders'} value={String((stats.get(viewing.id) ?? EMPTY).orders)} />
              <Metric label={valueLabel} value={formatCurrency((stats.get(viewing.id) ?? EMPTY).value)} />
              <Metric
                label="Last Transaction"
                value={(stats.get(viewing.id) ?? EMPTY).lastOrder ? formatDate((stats.get(viewing.id) ?? EMPTY).lastOrder!) : '—'}
              />
            </div>
            {renderHistory(viewing)}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setViewingId(null)}
                className="h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface"
              >
                Close
              </button>
              <button
                onClick={() => openEdit(viewing.id)}
                className="h-9 px-4 text-[13px] font-semibold text-primary bg-primary-subtle border border-primary/20 rounded-lg hover:bg-primary/15"
              >
                Edit {noun}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleting?.name || noun}?`}
        description={`${
          kind === 'customer' ? 'Patients with billing or appointment records' : 'Suppliers with purchase orders'
        } cannot be deleted to preserve audit integrity.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
