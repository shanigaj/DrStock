'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Search,
  Plus,
  ChevronRight,
  Building2,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  ReceiptText,
  ClipboardList,
  Pill,
  CalendarPlus,
  Clock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useStore, selectLowStockProducts, selectNearExpiryProducts, selectExpiredProducts } from '@/store';
import { getRelativeTime } from '@/lib/utils';
import GlobalSearch from './GlobalSearch';
import { useSidebar } from './SidebarContext';

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Medicine Inventory',
  '/sales': 'Sales & Billing',
  '/purchases': 'Purchase Orders',
  '/stock-history': 'Stock History',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/suppliers': 'Suppliers',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/help': 'Help & Guide',
};

const quickActions = [
  { label: 'New Sale / Invoice', href: '/sales?action=create', icon: ReceiptText },
  { label: 'New Purchase Order', href: '/purchases?action=create', icon: ClipboardList },
  { label: 'Add Medicine', href: '/inventory?action=create', icon: Pill },
  { label: 'New Appointment', href: '/appointments?action=create', icon: CalendarPlus },
];

type MenuState = 'quick' | 'profile' | 'notifications' | null;

export default function TopHeader() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, openMobile } = useSidebar();
  const [menu, setMenu] = useState<MenuState>(null);
  const [mobileSearch, setMobileSearch] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const products = useStore((s) => s.products);
  const activityLogs = useStore((s) => s.activityLogs);
  const profile = useStore((s) => s.businessProfile);
  const lowStock = useMemo(() => selectLowStockProducts(products), [products]);
  const nearExpiry = useMemo(
    () => selectNearExpiryProducts(products, profile.expiryWarningDays || 90),
    [products, profile.expiryWarningDays]
  );
  const expired = useMemo(() => selectExpiredProducts(products), [products]);
  const totalAlerts = lowStock.length + nearExpiry.length + expired.length;
  const recentActivity = activityLogs.slice(0, 3);

  const pageTitle = breadcrumbMap[pathname] || 'Dashboard';
  const toggle = (m: MenuState) => setMenu((cur) => (cur === m ? null : m));
  const close = () => setMenu(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setMenu(null);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenu(null);
        setMobileSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const iconBtn =
    'relative h-9 w-9 flex items-center justify-center text-secondary-text hover:text-foreground hover:bg-hover-surface rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus';
  const panel = 'absolute right-0 mt-2 bg-surface rounded-lg shadow-lg border border-border z-50';

  return (
    <header className="relative h-16 bg-header border-b border-border flex items-center justify-between gap-3 px-4 md:px-5 lg:px-6 shrink-0 no-print">
      {/* Left: Sidebar Toggle (Mobile Drawer / Desktop Rail) + Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={openMobile}
          aria-label="Open navigation"
          className="lg:hidden h-9 w-9 flex items-center justify-center text-secondary-text hover:text-foreground hover:bg-hover-surface rounded-lg transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex h-8 w-8 items-center justify-center text-muted hover:text-foreground hover:bg-hover-surface rounded-lg transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {collapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
        </button>

        <span className="hidden lg:block h-4 w-px bg-border shrink-0" aria-hidden="true" />

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
          <Link href="/dashboard" className="hidden sm:inline text-[13px] font-medium text-muted hover:text-foreground transition-colors">
            DrStock
          </Link>
          <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-subtle shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">{pageTitle}</span>
        </nav>

        <span className="hidden xl:inline-flex items-center px-2 py-0.5 ml-1.5 rounded-md text-[11px] font-medium bg-primary-subtle text-primary">
          Demo Workspace
        </span>
      </div>

      {/* Right Controls */}
      <div ref={containerRef} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="hidden md:block w-64 lg:w-76">
          <GlobalSearch />
        </div>
        <button className={`${iconBtn} md:hidden`} aria-label="Search" onClick={() => setMobileSearch(true)}>
          <Search className="w-[18px] h-[18px]" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => toggle('notifications')}
            className={iconBtn}
            aria-label={`Notifications${totalAlerts ? `, ${totalAlerts} alerts` : ''}`}
            aria-expanded={menu === 'notifications'}
          >
            <Bell className="w-[18px] h-[18px]" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-danger text-white text-[10px] font-semibold rounded-full flex items-center justify-center tabular-nums">
                {totalAlerts}
              </span>
            )}
          </button>
          {menu === 'notifications' && (
            <div className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:top-auto sm:right-0 sm:w-88 mt-2 bg-surface rounded-lg shadow-lg border border-border z-50">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-[13px] font-semibold text-foreground">Inventory &amp; Expiry Alerts</p>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted-surface text-secondary-text border border-border">
                  {totalAlerts} active
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {lowStock.slice(0, 4).map((p) => (
                  <Link
                    key={`low-${p.id}`}
                    href={`/inventory?q=${encodeURIComponent(p.sku)}`}
                    onClick={close}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-hover-surface transition-colors"
                  >
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${p.quantity <= 0 ? 'text-danger' : 'text-warning'}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-foreground truncate">{p.name}</span>
                      <span className="block text-xs text-muted">
                        {p.quantity <= 0 ? 'Out of stock' : `${p.quantity} ${p.unit.toLowerCase()} left`} · Min {p.minimumStock}
                      </span>
                    </span>
                  </Link>
                ))}
                {expired.slice(0, 2).map((p) => (
                  <Link
                    key={`exp-${p.id}`}
                    href={`/inventory?q=${encodeURIComponent(p.sku)}`}
                    onClick={close}
                    className="flex items-start gap-3 px-4 py-2.5 bg-danger-bg/40 hover:bg-danger-bg transition-colors"
                  >
                    <Clock className="w-4 h-4 mt-0.5 shrink-0 text-danger" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-danger truncate">{p.name} (Expired)</span>
                      <span className="block text-xs text-danger/80">
                        Batch {p.batchNumber || '—'} expired {p.expiryDate}
                      </span>
                    </span>
                  </Link>
                ))}
                {nearExpiry.slice(0, 2).map((p) => (
                  <Link
                    key={`near-${p.id}`}
                    href={`/inventory?q=${encodeURIComponent(p.sku)}`}
                    onClick={close}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-hover-surface transition-colors"
                  >
                    <Clock className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-foreground truncate">{p.name} (Near Expiry)</span>
                      <span className="block text-xs text-muted">Expires {p.expiryDate}</span>
                    </span>
                  </Link>
                ))}
                {totalAlerts === 0 && (
                  <p className="px-4 py-6 text-[13px] text-muted text-center">All medicines are healthy &amp; valid.</p>
                )}
                {recentActivity.length > 0 && (
                  <div className="bg-muted-surface">
                    <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-subtle uppercase tracking-wider">
                      Recent Activity
                    </p>
                    {recentActivity.map((a) => (
                      <div key={a.id} className="px-4 py-1.5">
                        <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                        <p className="text-[11px] text-muted truncate">
                          {a.description} · {getRelativeTime(a.date)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Link
                href="/inventory?status=low-stock"
                onClick={close}
                className="block px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary-subtle border-t border-border rounded-b-lg transition-colors"
              >
                View all alerts in inventory →
              </Link>
            </div>
          )}
        </div>

        {/* Quick Create */}
        <div className="relative">
          <button
            onClick={() => toggle('quick')}
            aria-expanded={menu === 'quick'}
            aria-label="Quick create"
            className="flex items-center gap-1.5 h-9 px-3 bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary-hover active:bg-primary-pressed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Create</span>
          </button>
          {menu === 'quick' && (
            <div className={`${panel} w-56 py-1.5`}>
              {quickActions.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-secondary-text hover:bg-primary-subtle hover:text-primary transition-colors"
                >
                  <Icon className="w-4 h-4 text-muted" />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Workspace Profile */}
        <div className="relative">
          <button
            onClick={() => toggle('profile')}
            aria-expanded={menu === 'profile'}
            aria-label="Clinic workspace menu"
            className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-hover-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span className="w-7 h-7 bg-primary-subtle border border-primary/20 rounded-full flex items-center justify-center text-xs font-semibold text-primary">
              {profile.businessName.charAt(0).toUpperCase()}
            </span>
          </button>
          {menu === 'profile' && (
            <div className={`${panel} w-64 py-1.5`}>
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[13px] font-semibold text-foreground truncate">{profile.businessName}</p>
                <p className="text-xs text-muted truncate mt-0.5">GSTIN {profile.gstin || '—'}</p>
              </div>
              <Link href="/settings" onClick={close} className="flex items-center gap-3 px-4 py-2 text-[13px] text-secondary-text hover:bg-hover-surface">
                <Building2 className="w-4 h-4 text-muted" />
                Clinic Settings
              </Link>
              <Link href="/settings#demo-data" onClick={close} className="flex items-center gap-3 px-4 py-2 text-[13px] text-secondary-text hover:bg-hover-surface">
                <RotateCcw className="w-4 h-4 text-muted" />
                Reset Demo Data
              </Link>
              <Link href="/help" onClick={close} className="flex items-center gap-3 px-4 py-2 text-[13px] text-secondary-text hover:bg-hover-surface">
                <HelpCircle className="w-4 h-4 text-muted" />
                Help &amp; Reviewer Guide
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Full-Bar Search Overlay */}
      {mobileSearch && (
        <div className="md:hidden absolute inset-0 bg-header flex items-center gap-2 px-4 z-50 border-b border-border">
          <GlobalSearch autoFocus onNavigate={() => setMobileSearch(false)} />
          <button className={iconBtn} aria-label="Close search" onClick={() => setMobileSearch(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </header>
  );
}
