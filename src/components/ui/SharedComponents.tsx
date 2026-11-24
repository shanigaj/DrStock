'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { LucideIcon, X } from 'lucide-react';
import { formatCurrency, DateRange, DatePreset, DATE_PRESET_LABELS } from '@/lib/utils';

function useModalBehavior(active: boolean, onClose: () => void) {
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
      prevFocusRef.current?.focus?.();
    };
  }, [active, onClose]);
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  isCurrency?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary-subtle',
  trend,
  isCurrency,
}: StatCardProps) {
  const displayValue = isCurrency && typeof value === 'number' ? formatCurrency(value) : value;

  return (
    <div className="bg-surface rounded-xl border border-border p-4 sm:p-5 hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-muted truncate">{title}</p>
          <p className="text-[26px] sm:text-[28px] font-semibold text-foreground mt-1.5 leading-tight tabular-nums tracking-tight truncate">
            {displayValue}
          </p>
          {subtitle && (
            <p className="text-xs text-muted mt-1.5 truncate">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${
                  trend.value >= 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                }`}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-muted truncate">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`${iconBg} rounded-lg p-2 shrink-0 border border-border/60`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

export function Metric({
  label,
  value,
  hint,
  accent = 'text-foreground',
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="bg-surface px-4 py-3.5 rounded-xl border border-border min-w-0">
      <p className="text-xs font-medium text-muted truncate">{label}</p>
      <p className={`text-lg sm:text-xl font-semibold mt-0.5 tabular-nums truncate ${accent}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'dot';
}

const statusStyles: Record<string, string> = {
  paid: 'bg-success-bg text-success border-success/20',
  pending: 'bg-warning-bg text-warning border-warning/20',
  partial: 'bg-info-bg text-info border-info/20',
  cancelled: 'bg-muted-surface text-secondary-text border-border',
  draft: 'bg-muted-surface text-secondary-text border-border',
  ordered: 'bg-info-bg text-info border-info/20',
  received: 'bg-success-bg text-success border-success/20',
  'in-stock': 'bg-success-bg text-success border-success/20',
  'low-stock': 'bg-warning-bg text-warning border-warning/20',
  'out-of-stock': 'bg-danger-bg text-danger border-danger/20',
  valid: 'bg-success-bg text-success border-success/20',
  'near-expiry': 'bg-warning-bg text-warning border-warning/20',
  expired: 'bg-danger-bg text-danger border-danger/20',
  scheduled: 'bg-info-bg text-info border-info/20',
  waiting: 'bg-warning-bg text-warning border-warning/20',
  completed: 'bg-success-bg text-success border-success/20',
};

const statusDots: Record<string, string> = {
  paid: 'bg-success',
  pending: 'bg-warning',
  partial: 'bg-info',
  cancelled: 'bg-subtle',
  draft: 'bg-subtle',
  ordered: 'bg-info',
  received: 'bg-success',
  'in-stock': 'bg-success',
  'low-stock': 'bg-warning',
  'out-of-stock': 'bg-danger',
  valid: 'bg-success',
  'near-expiry': 'bg-warning',
  expired: 'bg-danger',
  scheduled: 'bg-info',
  waiting: 'bg-warning',
  completed: 'bg-success',
};

export function StatusBadge({ status, variant = 'dot' }: StatusBadgeProps) {
  const style = statusStyles[status] || 'bg-muted-surface text-secondary-text border-border';
  const dot = statusDots[status] || 'bg-subtle';
  const label = status
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap ${style}`}
    >
      {variant === 'dot' && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      {label}
    </span>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5">
      <div className="min-w-0">
        <h1 className="text-[22px] sm:text-[26px] font-semibold text-foreground tracking-tight leading-tight">
          {title}
        </h1>
        {description && <p className="text-[13px] sm:text-sm text-muted mt-1">{description}</p>}
      </div>
      {action && <div className="w-full sm:w-auto sm:shrink-0 flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent placeholder:text-subtle transition-shadow"
      />
    </div>
  );
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  label?: string;
  className?: string;
}

export function FilterDropdown({ value, onChange, options, label, className = '' }: FilterDropdownProps) {
  return (
    <div className={className}>
      {label && <label className="text-xs font-medium text-secondary-text mb-1 block">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent text-secondary-text cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  presets?: DatePreset[];
  className?: string;
}

export function DateRangeFilter({
  value,
  onChange,
  presets = ['all', '7d', 'month', '30d', '90d', 'custom'],
  className = '',
}: DateRangeFilterProps) {
  const inputClass =
    'h-9 px-2.5 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent text-secondary-text min-w-0';
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <select
        aria-label="Date range"
        value={value.preset}
        onChange={(e) => onChange({ ...value, preset: e.target.value as DatePreset })}
        className={`${inputClass} w-full sm:w-auto cursor-pointer`}
      >
        {presets.map((p) => (
          <option key={p} value={p}>
            {DATE_PRESET_LABELS[p]}
          </option>
        ))}
      </select>
      {value.preset === 'custom' && (
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            aria-label="From date"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className={`${inputClass} flex-1 sm:flex-initial`}
          />
          <span className="text-xs text-muted">to</span>
          <input
            type="date"
            aria-label="To date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className={`${inputClass} flex-1 sm:flex-initial`}
          />
        </div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <div className="bg-muted-surface border border-border rounded-full p-3.5 mb-3.5">
        <Icon className="w-6 h-6 text-muted" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-[13px] text-muted max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'default';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'default',
}: ConfirmDialogProps) {
  useModalBehavior(open, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 no-print"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative bg-surface rounded-xl shadow-xl border border-border max-w-[420px] w-full p-6 animate-in">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-[13px] text-secondary-text mt-2 leading-relaxed">{description}</p>
        <div className="flex justify-end gap-2.5 mt-6">
          <button
            autoFocus
            onClick={onClose}
            className="h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`h-9 px-4 text-[13px] font-medium text-white rounded-lg transition-colors ${
              variant === 'danger' ? 'bg-danger hover:bg-red-800' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useModalBehavior(open, onClose);
  if (!open) return null;

  const sizeClasses = {
    sm: 'sm:max-w-[420px]',
    md: 'sm:max-w-[580px]',
    lg: 'sm:max-w-[740px]',
    xl: 'sm:max-w-[920px]',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:p-4 sm:pt-[6vh] overflow-y-auto no-print"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={`relative bg-surface rounded-t-2xl sm:rounded-xl shadow-xl border border-border ${sizeClasses[size]} w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col sm:mb-8 animate-in`}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground truncate">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-muted hover:text-foreground transition-colors rounded-lg hover:bg-hover-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 'max-w-[520px]',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  useModalBehavior(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-[1px]" onClick={onClose} />
      <div
        className={`relative bg-surface w-full ${width} h-full shadow-2xl border-l border-border flex flex-col slide-in-from-right-5`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground truncate">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-hover-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
