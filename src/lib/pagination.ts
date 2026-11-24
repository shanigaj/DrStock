'use client';

import { useState, useMemo, useCallback } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const STORAGE_KEY = 'drstock-table-page-size';

export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: PageSize;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 1) return 1;
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), totalPages);
}

export function paginateData<T>(data: readonly T[], page: number, pageSize: number): PaginationResult<T> {
  const safeSize = (PAGE_SIZE_OPTIONS.includes(pageSize as PageSize) ? pageSize : 10) as PageSize;
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safeSize));
  const safePage = clampPage(page, totalPages);
  const startOffset = (safePage - 1) * safeSize;
  const items = data.slice(startOffset, startOffset + safeSize);

  return {
    items,
    page: safePage,
    pageSize: safeSize,
    totalItems,
    totalPages,
    startIndex: totalItems === 0 ? 0 : startOffset + 1,
    endIndex: Math.min(startOffset + safeSize, totalItems),
  };
}

function readSavedPageSize(defaultSize: PageSize): PageSize {
  if (typeof window === 'undefined') return defaultSize;
  try {
    const raw = Number(window.localStorage.getItem(STORAGE_KEY));
    if (PAGE_SIZE_OPTIONS.includes(raw as PageSize)) return raw as PageSize;
  } catch {
    // ignore storage errors
  }
  return defaultSize;
}

export function usePagination<T>(data: readonly T[], defaultPageSize: PageSize = 10) {
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(() => readSavedPageSize(defaultPageSize));

  const result = useMemo(() => paginateData(data, page, pageSize), [data, page, pageSize]);

  const setPage = useCallback(
    (next: number) => {
      setPageState(clampPage(next, result.totalPages));
    },
    [result.totalPages]
  );

  const setPageSize = useCallback((nextSize: PageSize) => {
    setPageSizeState(nextSize);
    setPageState(1);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(nextSize));
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const resetPage = useCallback(() => setPageState(1), []);

  return {
    ...result,
    setPage,
    setPageSize,
    resetPage,
  };
}
