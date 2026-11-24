'use client';

import { useSyncExternalStore } from 'react';
import { useStore } from '@/store';

const subscribe = (onChange: () => void) => useStore.persist.onFinishHydration(onChange);
const getSnapshot = () => useStore.persist.hasHydrated();
const getServerSnapshot = () => false;

/**
 * Renders a light shell skeleton until localStorage hydration completes
 * so server and initial client markup always match cleanly.
 */
export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!hydrated) {
    return (
      <div className="flex h-dvh w-full bg-background overflow-hidden" role="status" aria-label="Loading workspace">
        <div className="hidden lg:flex w-[240px] bg-sidebar border-r border-border flex-col p-4 gap-4 shrink-0">
          <div className="h-8 w-36 bg-hover-surface rounded-lg animate-pulse" />
          <div className="space-y-2 mt-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-8 bg-hover-surface rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 bg-header border-b border-border px-6 flex items-center justify-between">
            <div className="h-5 w-40 bg-hover-surface rounded animate-pulse" />
            <div className="h-9 w-56 bg-hover-surface rounded-lg animate-pulse" />
          </div>
          <div className="p-6 space-y-6">
            <div className="h-8 w-56 bg-hover-surface rounded animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-surface border border-border rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
