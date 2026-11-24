'use client';

import { ReactNode } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatCompactINR, formatCurrency } from '@/lib/utils';
import { TimeBucket } from '@/lib/reports';

export function ReportCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-surface rounded-xl border border-border min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TimeSeriesChart({ data, color, valueLabel }: { data: TimeBucket[]; color: string; valueLabel: string }) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <div className="h-[240px] w-full p-4 min-w-0" role="img" aria-label={`${valueLabel} over time chart`}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="#E4E7EC" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              stroke="#667085"
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="#667085" width={54} tickFormatter={formatCompactINR} />
            <Tooltip
              cursor={{ fill: '#F9FAFB' }}
              formatter={(v, _n, item) => [
                `${formatCurrency(Number(v) || 0)} · ${(item.payload as TimeBucket).count} orders`,
                valueLabel,
              ]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4E7EC',
                borderRadius: 8,
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(16, 24, 40, 0.08)',
              }}
            />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-[13px] text-muted">No data in this date range</div>
      )}
    </div>
  );
}

export interface RankedRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  display: string;
}

export function RankedBars({ rows, color = 'bg-primary', empty }: { rows: RankedRow[]; color?: string; empty: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.length === 0) return <p className="px-5 py-6 text-[13px] text-muted">{empty}</p>;
  return (
    <ul className="p-5 space-y-3.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-foreground font-medium truncate">{r.label}</span>
            <span className="tabular-nums font-semibold text-foreground shrink-0">{r.display}</span>
          </div>
          <div className="mt-1.5 h-1.5 bg-hover-surface rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} />
          </div>
          {r.sublabel && <p className="text-[11px] text-muted mt-1">{r.sublabel}</p>}
        </li>
      ))}
    </ul>
  );
}
