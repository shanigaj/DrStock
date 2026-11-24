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
