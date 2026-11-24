'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Pill,
  TrendingUp,
  ClipboardList,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Boxes,
  Plus,
  Clock,
  CalendarClock,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  useStore,
  selectLowStockProducts,
  selectNearExpiryProducts,
  selectExpiredProducts,
  selectTodayAppointments,
} from '@/store';
import { formatCurrency, formatDate, formatCompactINR, getRelativeTime } from '@/lib/utils';
import { getExpiryStatus } from '@/types';
import { PageHeader, StatCard, StatusBadge } from '@/components/ui/SharedComponents';

type Period = '7d' | '30d' | '90d' | 'all';
const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const SERIES = { sales: '#0f766e', purchases: '#2563eb' };

function periodWindows(period: Period): { start: Date; prevStart: Date; prevEnd: Date } | null {
  const now = new Date();
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const start = new Date(now.getTime() - days * 86_400_000);
  return { start, prevStart: new Date(start.getTime() - days * 86_400_000), prevEnd: start };
}

function percentChange(current: number, previous: number): number | undefined {
  if (previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('30d');

  const products = useStore((s) => s.products);
  const sales = useStore((s) => s.sales);
  const purchaseOrders = useStore((s) => s.purchaseOrders);
  const activityLogs = useStore((s) => s.activityLogs);
  const appointments = useStore((s) => s.appointments);
  const profile = useStore((s) => s.businessProfile);

  const activeSales = useMemo(() => sales.filter((s) => s.paymentStatus !== 'cancelled'), [sales]);
  const committedPOs = useMemo(() => purchaseOrders.filter((p) => p.status !== 'draft'), [purchaseOrders]);

  const kpis = useMemo(() => {
    const w = periodWindows(period);
    const inCurrent = (d: string) => !w || new Date(d) >= w.start;
    const inPrevious = (d: string) => !!w && new Date(d) >= w.prevStart && new Date(d) < w.prevEnd;
    const sum = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((a, r) => a + pick(r), 0);

    const periodSales = activeSales.filter((s) => inCurrent(s.date));
    const periodPOs = committedPOs.filter((p) => inCurrent(p.date));
    const salesValue = sum(periodSales, (s) => s.grandTotal);
    const purchaseValue = sum(periodPOs, (p) => p.totalAmount);

    return {
      periodSales,
      salesValue,
      salesCount: periodSales.length,
      salesTrend: percentChange(salesValue, sum(activeSales.filter((s) => inPrevious(s.date)), (s) => s.grandTotal)),
      purchaseValue,
      purchaseCount: periodPOs.length,
      purchaseTrend: percentChange(purchaseValue, sum(committedPOs.filter((p) => inPrevious(p.date)), (p) => p.totalAmount)),
    };
  }, [activeSales, committedPOs, period]);

  const inventoryValue = useMemo(() => products.reduce((sum, p) => sum + p.quantity * p.costPrice, 0), [products]);
  const lowStock = useMemo(() => selectLowStockProducts(products), [products]);
  const nearExpiry = useMemo(
    () => selectNearExpiryProducts(products, profile.expiryWarningDays || 90),
    [products, profile.expiryWarningDays]
  );
  const expired = useMemo(() => selectExpiredProducts(products), [products]);
  const todayAppointments = useMemo(() => selectTodayAppointments(appointments), [appointments]);

  const expiryAlerts = useMemo(
    () => [...expired, ...nearExpiry].sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || '')),
    [expired, nearExpiry]
  );

  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const match = (date: string) => {
        const x = new Date(date);
        return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
      };
      return {
        month: d.toLocaleDateString('en-IN', { month: 'short' }),
        sales: Math.round(activeSales.filter((s) => match(s.date)).reduce((a, s) => a + s.grandTotal, 0)),
        purchases: Math.round(committedPOs.filter((p) => match(p.date)).reduce((a, p) => a + p.totalAmount, 0)),
      };
    });
  }, [activeSales, committedPOs]);

  const categories = useMemo(() => {
    const map = new Map<string, { value: number; units: number; products: number }>();
    for (const p of products) {
      const cur = map.get(p.category) ?? { value: 0, units: 0, products: 0 };
      map.set(p.category, {
        value: cur.value + p.quantity * p.costPrice,
        units: cur.units + p.quantity,
        products: cur.products + 1,
      });
    }
    return [...map.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.value - a.value);
  }, [products]);

  const recentTransactions = useMemo(
    () =>
      [
        ...sales.map((s) => ({
          id: s.id,
          ref: s.orderId,
          type: 'sale' as const,
          party: s.customerName,
          date: s.date,
          amount: s.grandTotal,
          status: s.paymentStatus as string,
        })),
        ...purchaseOrders.map((p) => ({
          id: p.id,
          ref: p.orderId,
          type: 'purchase' as const,
          party: p.supplierName,
          date: p.date,
          amount: p.totalAmount,
          status: p.status as string,
        })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [sales, purchaseOrders]
  );

  const periodLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();
  const trendLabel = period === 'all' ? '' : 'vs previous period';
  const maxCategory = Math.max(...categories.map((c) => c.value), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={`${profile.businessName} · ${formatDate(new Date().toISOString())}`}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <div role="tablist" aria-label="Period filter" className="inline-flex rounded-lg border border-border p-0.5 bg-surface">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  role="tab"
                  aria-selected={period === p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-2.5 sm:px-3 h-8 text-xs font-medium rounded-md transition-colors ${
                    period === p.value
                      ? 'bg-foreground text-white'
                      : 'text-secondary-text hover:text-foreground hover:bg-hover-surface'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Link
              href="/sales?action=create"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" /> New Sale
            </Link>
          </div>
        }
      />

      {/* Responsive 5-Card KPI Grid */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Medicines"
          value={products.length}
          subtitle={`${categories.length} categories`}
          icon={Pill}
          iconColor="text-primary"
          iconBg="bg-primary-subtle"
        />
        <StatCard
          title="Inventory Value"
          value={inventoryValue}
          isCurrency
          subtitle="Valuation at cost"
          icon={Boxes}
          iconColor="text-secondary-text"
          iconBg="bg-muted-surface"
        />
        <StatCard
          title={`Sales · ${periodLabel}`}
          value={kpis.salesValue}
          isCurrency
          subtitle={`${kpis.salesCount} ${kpis.salesCount === 1 ? 'invoice' : 'invoices'}`}
          trend={kpis.salesTrend !== undefined ? { value: kpis.salesTrend, label: trendLabel } : undefined}
          icon={TrendingUp}
          iconColor="text-primary"
          iconBg="bg-primary-subtle"
        />
        <StatCard
          title={`Purchases · ${periodLabel}`}
          value={kpis.purchaseValue}
          isCurrency
          subtitle={`${kpis.purchaseCount} ${kpis.purchaseCount === 1 ? 'order' : 'orders'} placed`}
          trend={kpis.purchaseTrend !== undefined ? { value: kpis.purchaseTrend, label: trendLabel } : undefined}
          icon={ClipboardList}
          iconColor="text-info"
          iconBg="bg-info-bg"
        />
        <Link
          href="/inventory?status=low-stock"
          className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-focus min-[480px]:col-span-2 lg:col-span-1 block"
        >
          <StatCard
            title="Low Stock Alerts"
            value={lowStock.length}
            subtitle={
              lowStock.length
                ? `${lowStock.filter((p) => p.quantity <= 0).length} out of stock · ${expiryAlerts.length} expiry`
                : 'All stock healthy'
            }
            icon={AlertTriangle}
            iconColor={lowStock.length ? 'text-warning' : 'text-success'}
            iconBg={lowStock.length ? 'bg-warning-bg' : 'bg-success-bg'}
          />
        </Link>
      </div>

      {/* Main Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-surface rounded-xl border border-border p-5 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Sales vs Purchases</h2>
              <p className="text-xs text-muted mt-0.5">6-month revenue &amp; procurement cashflow (excl. drafts)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium text-secondary-text" aria-hidden>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES.sales }} /> Sales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES.purchases }} /> Purchases
              </span>
            </div>
          </div>
          <div className="h-[260px] w-full min-w-0" role="img" aria-label="Monthly sales vs purchases chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} barGap={4} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#E4E7EC" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#667085" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="#667085" width={54} tickFormatter={formatCompactINR} />
                <Tooltip
                  cursor={{ fill: '#F9FAFB' }}
                  formatter={(v, name) => [formatCurrency(Number(v) || 0), name === 'sales' ? 'Sales' : 'Purchases']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E4E7EC',
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(16, 24, 40, 0.08)',
                  }}
                />
                <Bar dataKey="sales" fill={SERIES.sales} radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="purchases" fill={SERIES.purchases} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-surface rounded-xl border border-border p-5 min-w-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Stock by Category</h2>
              <p className="text-xs text-muted mt-0.5">Medicine valuation at cost</p>
            </div>
            <Link href="/reports" className="text-xs font-medium text-primary hover:text-primary-hover">
              View Report
            </Link>
          </div>
          <ul className="space-y-3.5">
            {categories.slice(0, 6).map((c) => (
              <li key={c.name}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-foreground font-medium truncate">{c.name}</span>
                  <span className="tabular-nums font-semibold text-foreground shrink-0">{formatCurrency(c.value)}</span>
                </div>
                <div className="mt-1.5 h-1.5 bg-hover-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(4, (c.value / maxCategory) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted mt-1">
                  {c.products} items · {c.units.toLocaleString('en-IN')} units
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Low Stock & Expiry Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-surface rounded-xl border border-border min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <h2 className="text-sm font-semibold text-foreground">Low-Stock Medicines</h2>
              {lowStock.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-warning-bg text-warning rounded-md">
                  {lowStock.length}
                </span>
              )}
            </div>
            <Link
              href="/inventory?status=low-stock"
              className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-0.5"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-muted text-center">All medicines are stocked above minimum levels.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lowStock.slice(0, 5).map((p) => {
                const out = p.quantity <= 0;
                const pct = Math.min(100, Math.round((p.quantity / Math.max(p.minimumStock, 1)) * 100));
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted-surface transition-colors">
                    <div className="min-w-0 flex-1">
                      <Link href={`/inventory?q=${encodeURIComponent(p.sku)}`} className="text-[13px] font-medium text-foreground hover:text-primary truncate block">
                        {p.name}
                      </Link>
                      <div className="flex items-center gap-2.5 mt-1">
                        <div className="w-16 h-1.5 bg-hover-surface rounded-full overflow-hidden shrink-0">
                          <div className={`h-full ${out ? 'bg-danger' : 'bg-warning'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted tabular-nums">
                          <span className={`font-semibold ${out ? 'text-danger' : 'text-warning'}`}>{p.quantity}</span> / {p.minimumStock} {p.unit.toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={out ? 'out-of-stock' : 'low-stock'} />
                    <Link
                      href={`/purchases?action=create&productId=${p.id}`}
                      className="h-7 px-2.5 inline-flex items-center text-xs font-medium text-primary bg-primary-subtle rounded-md hover:bg-primary/15 transition-colors shrink-0"
                    >
                      Reorder
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-surface rounded-xl border border-border min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-danger" />
              <h2 className="text-sm font-semibold text-foreground">Expiry &amp; Batch Alerts</h2>
              {expiryAlerts.length > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-danger-bg text-danger rounded-md">
                  {expiryAlerts.length}
                </span>
              )}
            </div>
            <Link
              href="/inventory?expiry=near-expiry"
              className="text-xs font-medium text-primary hover:text-primary-hover flex items-center gap-0.5"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {expiryAlerts.length === 0 ? (
            <p className="px-5 py-8 text-[13px] text-muted text-center">No expired or near-expiry medicine batches.</p>
          ) : (
            <ul className="divide-y divide-border">
              {expiryAlerts.slice(0, 5).map((p) => {
                const st = getExpiryStatus(p.expiryDate, profile.expiryWarningDays || 90);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted-surface transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        Batch <span className="font-mono">{p.batchNumber || 'N/A'}</span> · Exp {formatDate(p.expiryDate || '')}
                      </p>
                    </div>
                    <StatusBadge status={st} />
                    <Link
                      href={`/inventory?q=${encodeURIComponent(p.sku)}`}
                      className="h-7 px-2.5 inline-flex items-center text-xs font-medium text-secondary-text border border-border rounded-md hover:bg-hover-surface shrink-0"
                    >
                      Inspect
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Bottom Row: Recent Transactions, Appointments, Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="bg-surface rounded-xl border border-border min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Transactions</h2>
            <Link href="/sales" className="text-xs font-medium text-primary hover:text-primary-hover">
              View All
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recentTransactions.map((tx) => (
              <li key={tx.id}>
                <Link
                  href={tx.type === 'sale' ? `/sales?q=${tx.ref}` : `/purchases?q=${tx.ref}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-muted-surface transition-colors"
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.type === 'sale' ? 'bg-primary-subtle text-primary' : 'bg-info-bg text-info'
                    }`}
                  >
                    {tx.type === 'sale' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate">{tx.party}</p>
                    <p className="text-xs text-muted">
                      <span className="font-mono">{tx.ref}</span> · {formatDate(tx.date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold text-foreground tabular-nums">{formatCurrency(tx.amount)}</p>
                    <StatusBadge status={tx.status} variant="dot" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-surface rounded-xl border border-border min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Today&apos;s Appointments</h2>
            </div>
            <Link href="/appointments" className="text-xs font-medium text-primary hover:text-primary-hover">
              View All
            </Link>
          </div>
          {todayAppointments.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-muted">No appointments scheduled for today.</p>
              <Link
                href="/appointments?action=create"
                className="inline-block mt-2.5 text-xs font-semibold text-primary hover:underline"
              >
                + Book Appointment
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {todayAppointments.slice(0, 5).map((apt) => (
                <li key={apt.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-muted-surface transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{apt.patientName}</p>
                    <p className="text-xs text-muted truncate">
                      {apt.time} · {apt.doctorName}
                    </p>
                  </div>
                  <StatusBadge status={apt.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-surface rounded-xl border border-border min-w-0">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          </div>
          <ol className="px-5 py-4 space-y-3.5 max-h-[340px] overflow-y-auto">
            {activityLogs.slice(0, 6).map((log) => (
              <li key={log.id} className="relative pl-4">
                <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                <p className="text-[13px] font-medium text-foreground leading-snug">{log.title}</p>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{log.description}</p>
                <p className="text-[11px] text-subtle mt-0.5">{getRelativeTime(log.date)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
