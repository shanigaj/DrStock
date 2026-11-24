'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import { SidebarProvider } from './SidebarContext';
import StoreProvider from '@/components/StoreProvider';
import { ToastProvider } from '@/components/ui/ToastProvider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageKey = `${pathname}?${searchParams.toString()}`;

  return (
    <StoreProvider>
      <ToastProvider>
        <SidebarProvider>
          <div className="flex h-dvh w-full bg-background overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
              <TopHeader />
              <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-5 lg:p-6 xl:p-8">
                <div key={pageKey} className="max-w-[1440px] mx-auto w-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </ToastProvider>
    </StoreProvider>
  );
}
