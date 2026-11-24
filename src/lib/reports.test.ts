import { describe, it, expect } from 'vitest';
import { buildCashflowBuckets } from './reports';

describe('dashboard cashflow bucketing by period', () => {
  const fixedNow = new Date('2026-11-25T12:00:00.000Z');
  const daysAgoIso = (days: number) => new Date(fixedNow.getTime() - days * 86_400_000).toISOString();

  const sales = [
    { date: daysAgoIso(1), total: 100 },
    { date: daysAgoIso(5), total: 200 },
    { date: daysAgoIso(20), total: 500 },
    { date: daysAgoIso(75), total: 1000 },
    { date: daysAgoIso(140), total: 2500 },
  ];

  const purchases = [
    { date: daysAgoIso(3), total: 400 },
    { date: daysAgoIso(22), total: 900 },
    { date: daysAgoIso(110), total: 3000 },
  ];

  it('returns daily buckets and totals matching last 7 days', () => {
    const res = buildCashflowBuckets(
      sales,
      (s) => s.date,
      (s) => s.total,
      purchases,
      (p) => p.date,
      (p) => p.total,
      '7d',
      fixedNow
    );
    expect(res.subtitle).toContain('Daily');
    expect(res.buckets.length).toBeGreaterThanOrEqual(7);
    expect(res.buckets.reduce((a, b) => a + b.sales, 0)).toBe(300);
    expect(res.buckets.reduce((a, b) => a + b.purchases, 0)).toBe(400);
  });

  it('returns weekly buckets matching last 30 days and 90 days independently', () => {
    const r30 = buildCashflowBuckets(
      sales,
      (s) => s.date,
      (s) => s.total,
      purchases,
      (p) => p.date,
      (p) => p.total,
      '30d',
      fixedNow
    );
    expect(r30.subtitle).toContain('30 days');
    expect(r30.buckets.reduce((a, b) => a + b.sales, 0)).toBe(800);
    expect(r30.buckets.reduce((a, b) => a + b.purchases, 0)).toBe(1300);

    const r90 = buildCashflowBuckets(
      sales,
      (s) => s.date,
      (s) => s.total,
      purchases,
      (p) => p.date,
      (p) => p.total,
      '90d',
      fixedNow
    );
    expect(r90.subtitle).toContain('90 days');
    expect(r90.buckets.reduce((a, b) => a + b.sales, 0)).toBe(1800);
    expect(r90.buckets.reduce((a, b) => a + b.purchases, 0)).toBe(1300);
  });

  it('returns monthly buckets including all historical records for all time', () => {
    const rAll = buildCashflowBuckets(
      sales,
      (s) => s.date,
      (s) => s.total,
      purchases,
      (p) => p.date,
      (p) => p.total,
      'all',
      fixedNow
    );
    expect(rAll.subtitle).toContain('all time');
    expect(rAll.buckets.length).toBeGreaterThanOrEqual(6);
    expect(rAll.buckets.reduce((a, b) => a + b.sales, 0)).toBe(4300);
    expect(rAll.buckets.reduce((a, b) => a + b.purchases, 0)).toBe(4300);
  });
});
