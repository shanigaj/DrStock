'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Pill,
  ReceiptText,
  ClipboardList,
  History,
  BarChart3,
  Users,
  CalendarClock,
  Building2,
  Settings,
  HelpCircle,
  X,
  LucideIcon,
} from 'lucide-react';
import { useStore } from '@/store';
import { useSidebar } from './SidebarContext';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Inventory',
    items: [
      { href: '/inventory', label: 'Medicine Inventory', icon: Pill },
      { href: '/sales', label: 'Sales & Billing', icon: ReceiptText },
      { href: '/purchases', label: 'Purchase Orders', icon: ClipboardList },
      { href: '/stock-history', label: 'Stock History', icon: History },
    ],
  },
  {
    title: 'Clinic',
    items: [
      { href: '/patients', label: 'Patients', icon: Users },
      { href: '/appointments', label: 'Appointments', icon: CalendarClock },
    ],
  },
  {
    title: 'Management',
    items: [
      { href: '/suppliers', label: 'Suppliers', icon: Building2 },
      { href: '/reports', label: 'Reports', icon: BarChart3 },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    title: 'Support',
    items: [{ href: '/help', label: 'Help & Guide', icon: HelpCircle }],
  },
];

export function DrStockLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-xs"
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 2L4 6.5V17.5L12 22L20 17.5V6.5L12 2Z"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 12H9.5L11 9L13 15L14.5 12H17.5"
          stroke="#99F6E4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function NavLink({
  item,
  collapsed,
  active,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 h-[34px] px-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        collapsed ? 'justify-center px-2' : ''
      } ${
        active
          ? 'bg-primary-subtle text-primary font-semibold'
          : 'text-secondary-text hover:text-foreground hover:bg-hover-surface'
      }`}
    >
      <Icon
        className={`w-[17px] h-[17px] shrink-0 transition-colors ${
          active ? 'text-primary' : 'text-muted group-hover:text-foreground'
        }`}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const businessName = useStore((s) => s.businessProfile.businessName);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Brand header */}
      <div
        className={`flex items-center gap-2.5 px-4 h-16 border-b border-border shrink-0 ${
          collapsed ? 'justify-center px-2' : ''
        }`}
      >
        <DrStockLogo size={32} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[15px] font-semibold text-foreground tracking-tight leading-none">DrStock</p>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-subtle text-primary">
                Clinic
              </span>
            </div>
            <p className="text-[11px] text-muted truncate mt-0.5">Healthcare Inventory</p>
          </div>
        )}
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 min-h-0 px-3 py-2.5 space-y-3 overflow-y-auto" aria-label="Main Navigation">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed ? (
              <p className="px-2.5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                {group.title}
              </p>
            ) : (
              <div className="mx-2 my-2 border-t border-border" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  active={isActive(item.href)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Clinic Workspace Footer */}
      <div className="p-3 border-t border-border shrink-0">
        <Link
          href="/settings"
          onClick={onNavigate}
          title={collapsed ? businessName : undefined}
          className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-hover-surface transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-8 h-8 bg-primary-subtle border border-primary/15 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
            {initials(businessName) || 'AH'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{businessName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <p className="text-[11px] text-muted truncate">Demo Workspace</p>
              </div>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { collapsed, mobileOpen, closeMobile } = useSidebar();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[1px] no-print animate-in"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Over Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border shadow-xl transform transition-transform duration-200 no-print ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <button
          onClick={closeMobile}
          aria-label="Close navigation"
          className="absolute top-4 right-3 p-1.5 text-muted hover:text-foreground hover:bg-hover-surface rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent collapsed={false} onNavigate={closeMobile} />
      </aside>

      {/* Desktop Collapsible White Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-sidebar border-r border-border h-full overflow-hidden shrink-0 transition-[width] duration-200 no-print ${
          collapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        <SidebarContent collapsed={collapsed} onNavigate={() => {}} />
      </aside>
    </>
  );
}
