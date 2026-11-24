import { DateRange } from './utils';

export interface TimeBucket {
  key: string;
  label: string;
  value: number;
  count: number;
}

function rangeStart(range: DateRange, dates: Date[]): Date {
  const now = new Date();
  switch (range.preset) {
    case '7d':
      return new Date(now.getTime() - 7 * 86_400_000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case '30d':
      return new Date(now.getTime() - 30 * 86_400_000);
    case '90d':
      return new Date(now.getTime() - 90 * 86_400_000);
    case 'custom':
      if (range.from) return new Date(`${range.from}T00:00:00`);
      break;
  }
  return dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : now;
}

function rangeEnd(range: DateRange): Date {
  if (range.preset === 'custom' && range.to) return new Date(`${range.to}T23:59:59`);
  return new Date();
}

export function bucketByTime<T>(rows: T[], getDate: (r: T) => string, getValue: (r: T) => number, range: DateRange): TimeBucket[] {
  const dates = rows.map((r) => new Date(getDate(r)));
  const start = rangeStart(range, dates);
  const end = rangeEnd(range);
  const spanDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const unit: 'day' | 'week' | 'month' = spanDays <= 31 ? 'day' : spanDays <= 120 ? 'week' : 'month';

  const floor = (d: Date): Date => {
    if (unit === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (unit === 'week') day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    return day;
  };
  const next = (d: Date): Date => {
    const n = new Date(d);
    if (unit === 'month') n.setMonth(n.getMonth() + 1);
    else n.setDate(n.getDate() + (unit === 'week' ? 7 : 1));
    return n;
  };
  const label = (d: Date) =>
    unit === 'month'
      ? d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const buckets = new Map<string, TimeBucket>();
  for (let d = floor(start); d <= end; d = next(d)) {
    const key = d.toISOString();
    buckets.set(key, { key, label: unit === 'week' ? `w/c ${label(d)}` : label(d), value: 0, count: 0 });
  }
  rows.forEach((r, i) => {
    const b = buckets.get(floor(dates[i]).toISOString());
    if (b) {
      b.value += getValue(r);
      b.count += 1;
    }
  });
  return [...buckets.values()];
}

export type DashboardPeriod = '7d' | '30d' | '90d' | 'all';

export interface CashflowBucket {
  label: string;
  sales: number;
  purchases: number;
}

export function buildCashflowBuckets<S, P>(
  sales: readonly S[],
  getSaleDate: (s: S) => string,
  getSaleTotal: (s: S) => number,
  purchases: readonly P[],
  getPurchaseDate: (p: P) => string,
  getPurchaseTotal: (p: P) => number,
  period: DashboardPeriod,
  now = new Date()
): { buckets: CashflowBucket[]; subtitle: string } {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : null;
  const startCutoff = days !== null ? new Date(now.getTime() - days * 86_400_000) : null;
  const inPeriod = (iso: string) => !startCutoff || new Date(iso) >= startCutoff;

  const filteredSales = sales.filter((s) => inPeriod(getSaleDate(s)));
  const filteredPurchases = purchases.filter((p) => inPeriod(getPurchaseDate(p)));

  const unit: 'day' | 'week' | 'month' =
    period === '7d' ? 'day' : period === '30d' || period === '90d' ? 'week' : 'month';

  const floorDate = (d: Date): Date => {
    if (unit === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (unit === 'week') day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    return day;
  };

  const nextDate = (d: Date): Date => {
    const n = new Date(d);
    if (unit === 'month') n.setMonth(n.getMonth() + 1);
    else n.setDate(n.getDate() + (unit === 'week' ? 7 : 1));
    return n;
  };

  let rangeStart: Date;
  if (unit === 'month') {
    const allDates = [
      ...filteredSales.map((s) => new Date(getSaleDate(s)).getTime()),
      ...filteredPurchases.map((p) => new Date(getPurchaseDate(p)).getTime()),
    ].filter((t) => Number.isFinite(t));
    const minSixMonths = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const earliest = allDates.length ? new Date(Math.min(...allDates)) : minSixMonths;
    rangeStart = earliest < minSixMonths ? new Date(earliest.getFullYear(), earliest.getMonth(), 1) : minSixMonths;
  } else {
    rangeStart = floorDate(startCutoff ?? now);
  }

  const endFloor = floorDate(now);
  const formatBucketLabel = (d: Date): string => {
    if (unit === 'month') {
      return d.getFullYear() === now.getFullYear()
        ? d.toLocaleDateString('en-IN', { month: 'short' })
        : d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }
    const dayStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return unit === 'week' ? `w/c ${dayStr}` : dayStr;
  };

  const map = new Map<string, CashflowBucket>();
  for (let d = new Date(rangeStart); d <= endFloor; d = nextDate(d)) {
    const key = d.toISOString();
    map.set(key, { label: formatBucketLabel(d), sales: 0, purchases: 0 });
  }

  for (const s of filteredSales) {
    const key = floorDate(new Date(getSaleDate(s))).toISOString();
    const bucket = map.get(key);
    if (bucket) bucket.sales += getSaleTotal(s);
  }

  for (const p of filteredPurchases) {
    const key = floorDate(new Date(getPurchaseDate(p))).toISOString();
    const bucket = map.get(key);
    if (bucket) bucket.purchases += getPurchaseTotal(p);
  }

  const buckets = [...map.values()].map((b) => ({
    ...b,
    sales: Math.round(b.sales),
    purchases: Math.round(b.purchases),
  }));

  const subtitle =
    period === '7d'
      ? 'Daily revenue & procurement over the last 7 days'
      : period === '30d'
        ? 'Weekly revenue & procurement over the last 30 days'
        : period === '90d'
          ? 'Weekly revenue & procurement over the last 90 days'
          : 'Monthly revenue & procurement across all time';

  return { buckets, subtitle };
}
