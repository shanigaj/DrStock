'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Pill, Users, Building2, ReceiptText, ClipboardList, LucideIcon } from 'lucide-react';
import { useStore } from '@/store';
import { formatCurrency } from '@/lib/utils';

interface Result {
  key: string;
  group: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href: string;
}

const MAX_PER_GROUP = 4;

export default function GlobalSearch({
  autoFocus = false,
  onNavigate,
}: {
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const suppliers = useStore((s) => s.suppliers);
  const sales = useStore((s) => s.sales);
  const purchaseOrders = useStore((s) => s.purchaseOrders);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const has = (...values: (string | undefined)[]) => values.some((v) => v && v.toLowerCase().includes(q));
    const enc = encodeURIComponent;

    return [
      ...products
        .filter((p) => has(p.name, p.sku, p.genericName, p.category, p.batchNumber))
        .slice(0, MAX_PER_GROUP)
        .map((p) => ({
          key: p.id,
          group: 'Medicines',
          icon: Pill,
          title: p.name,
          subtitle: `${p.sku} · ${p.quantity} ${p.unit.toLowerCase()}(s) · Batch ${p.batchNumber || '—'}`,
          href: `/inventory?q=${enc(p.sku)}`,
        })),
      ...sales
        .filter((s) => has(s.orderId, s.customerName))
        .slice(0, MAX_PER_GROUP)
        .map((s) => ({
          key: s.id,
          group: 'Sales & Invoices',
          icon: ReceiptText,
          title: s.orderId,
          subtitle: `${s.customerName} · ${formatCurrency(s.grandTotal)}`,
          href: `/sales?q=${enc(s.orderId)}`,
        })),
      ...purchaseOrders
        .filter((p) => has(p.orderId, p.supplierName))
        .slice(0, MAX_PER_GROUP)
        .map((p) => ({
          key: p.id,
          group: 'Purchase Orders',
          icon: ClipboardList,
          title: p.orderId,
          subtitle: `${p.supplierName} · ${formatCurrency(p.totalAmount)}`,
          href: `/purchases?q=${enc(p.orderId)}`,
        })),
      ...customers
        .filter((c) => has(c.name, c.phone, c.email))
        .slice(0, MAX_PER_GROUP)
        .map((c) => ({
          key: c.id,
          group: 'Patients',
          icon: Users,
          title: c.name,
          subtitle: c.phone,
          href: `/patients?q=${enc(c.name)}`,
        })),
      ...suppliers
        .filter((s) => has(s.name, s.company, s.phone, s.email))
        .slice(0, MAX_PER_GROUP)
        .map((s) => ({
          key: s.id,
          group: 'Suppliers',
          icon: Building2,
          title: s.company || s.name,
          subtitle: s.name,
          href: `/suppliers?q=${enc(s.company || s.name)}`,
        })),
    ];
  }, [query, products, sales, purchaseOrders, customers, suppliers]);

  const go = (r: Result) => {
    router.push(r.href);
    setOpen(false);
    setQuery('');
    onNavigate?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault();
      go(results[highlight]);
    }
  };

  let lastGroup = '';

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search medicines, invoices…"
        aria-label="Global search"
        role="combobox"
        aria-expanded={open && query.length > 0}
        aria-controls="global-search-results"
        className="w-full h-9 pl-9 pr-16 text-[13px] bg-muted-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent focus:bg-surface placeholder:text-subtle transition-colors"
      />
      {!query && (
        <kbd className="pointer-events-none hidden md:inline-flex items-center gap-0.5 absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted border border-border rounded px-1.5 py-0.5 bg-surface">
          Ctrl K
        </kbd>
      )}

      {open && query.trim().length > 0 && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-surface rounded-lg shadow-lg border border-border py-1.5 z-50 max-h-[60vh] overflow-y-auto"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-muted text-center">No matches found for “{query.trim()}”</p>
          ) : (
            results.map((r, i) => {
              const showGroup = r.group !== lastGroup;
              lastGroup = r.group;
              const Icon = r.icon;
              return (
                <div key={`${r.group}-${r.key}`}>
                  {showGroup && (
                    <p className="px-3.5 pt-2 pb-1 text-[11px] font-semibold text-subtle uppercase tracking-wider">
                      {r.group}
                    </p>
                  )}
                  <button
                    role="option"
                    aria-selected={i === highlight}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => go(r)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors ${
                      i === highlight ? 'bg-primary-subtle text-primary' : 'hover:bg-hover-surface'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${i === highlight ? 'text-primary' : 'text-muted'}`} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-foreground truncate">{r.title}</span>
                      <span className="block text-xs text-muted truncate">{r.subtitle}</span>
                    </span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
