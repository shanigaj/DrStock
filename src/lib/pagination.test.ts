import { describe, it, expect } from 'vitest';
import { clampPage, paginateData, PAGE_SIZE_OPTIONS } from './pagination';

describe('pagination utilities', () => {
  const sample = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Medicine ${i + 1}` }));

  it('exposes standard enterprise page size options starting at 10', () => {
    expect([...PAGE_SIZE_OPTIONS]).toEqual([10, 20, 50, 100]);
  });

  it('paginates data cleanly with accurate 1-based start/end indices', () => {
    const p1 = paginateData(sample, 1, 10);
    expect(p1.page).toBe(1);
    expect(p1.pageSize).toBe(10);
    expect(p1.totalItems).toBe(25);
    expect(p1.totalPages).toBe(3);
    expect(p1.startIndex).toBe(1);
    expect(p1.endIndex).toBe(10);
    expect(p1.items.map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const p3 = paginateData(sample, 3, 10);
    expect(p3.page).toBe(3);
    expect(p3.startIndex).toBe(21);
    expect(p3.endIndex).toBe(25);
    expect(p3.items.map((x) => x.id)).toEqual([21, 22, 23, 24, 25]);
  });

  it('clamps out-of-range page numbers safely when dataset shrinks', () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(-4, 3)).toBe(1);
    expect(clampPage(9, 3)).toBe(3);
    expect(clampPage(3.8, 5)).toBe(3);

    const shrunk = paginateData(sample.slice(0, 5), 4, 10);
    expect(shrunk.page).toBe(1);
    expect(shrunk.totalPages).toBe(1);
    expect(shrunk.items).toHaveLength(5);
  });

  it('handles empty datasets without invalid page numbers or negative indices', () => {
    const empty = paginateData([], 2, 20);
    expect(empty.page).toBe(1);
    expect(empty.totalPages).toBe(1);
    expect(empty.totalItems).toBe(0);
    expect(empty.startIndex).toBe(0);
    expect(empty.endIndex).toBe(0);
    expect(empty.items).toEqual([]);
  });

  it('falls back to page size 10 if an unsupported page size is passed', () => {
    const fallback = paginateData(sample, 1, 17);
    expect(fallback.pageSize).toBe(10);
    expect(fallback.items).toHaveLength(10);
  });
});
