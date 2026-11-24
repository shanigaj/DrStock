import Link from 'next/link';
import { ClipboardList, ReceiptText, SlidersHorizontal, FileSpreadsheet, Keyboard, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/SharedComponents';

const workflows = [
  {
    title: 'Sales & Dispensing',
    icon: ReceiptText,
    href: '/sales?action=create',
    cta: 'Create Sale',
    steps: [
      'Navigate to Sales & Billing → New Sale, choose a patient and add medicines.',
      'Live non-expired sellable quantity is displayed; quantities exceeding stock or expired batches are blocked.',
      'Stock deducts strictly in First-Expired-First-Out (FEFO) order across active batch lots.',
      'Cancelling an invoice restores deducted batch quantities cleanly via a Return ledger entry.',
    ],
  },
  {
    title: 'Purchase Orders & Receiving',
    icon: ClipboardList,
    href: '/purchases?action=create',
    cta: 'Create Purchase Order',
    steps: [
      'Go to Purchase Orders → New Purchase Order, select a medical distributor and medicines.',
      'Creating a PO never increases stock immediately; inventory only updates when goods arrive.',
      'Click Receive on an ordered PO to record full or partial receipts along with Batch # and Expiry Date.',
      'New batch lots append alongside existing stock batches without overwriting prior batch expiry dates.',
    ],
  },
  {
    title: 'Medicine Stock & Adjustments',
    icon: SlidersHorizontal,
    href: '/inventory',
    cta: 'Open Inventory',
    steps: [
      'Stock quantities cannot be arbitrarily edited in the product form.',
      'Use Adjust Stock to record physical audit variances, damaged units, or expired batch quarantines.',
      'Click any medicine name to inspect its Active Batch Breakdown drawer with lot-level expiry tracking.',
      'Low-stock and near-expiry alerts update dynamically across the Dashboard and Header notification bell.',
    ],
  },
  {
    title: 'Clinical Reports & Exports',
    icon: FileSpreadsheet,
    href: '/reports',
    cta: 'View Reports',
    steps: [
      'Reports provide live Stock Valuation, Sales Revenue, and Purchase Procurement breakdowns.',
      'Summary metrics and charts always calculate across the entire filtered dataset, independent of table pagination.',
      'Every table supports sorting, 10/20/50/100 page sizing, full-dataset CSV export, and print-friendly layout.',
    ],
  },
];

const reviewerSteps = [
  'Open Dashboard to inspect KPI summary cards, monthly activity chart, low-stock / expiry alerts, and today’s appointments.',
  'Open Purchase Orders → Select PO-2006 (“Ordered”) → Click Receive with a new Batch # to see stock increase cleanly without overwriting prior batches.',
  'Open Medicine Inventory → Click any item to review its Active Batch Breakdown drawer, search/filter, or run Adjust Stock with a mandatory reason.',
  'Open Sales & Billing → Create a bill to observe FEFO batch deduction → Print Invoice or cancel to verify automatic stock return.',
  'Try dispensing Clotrimazole Cream (Expired) in a sale → Verify expired medicine validation blocks unsafe dispensing.',
  'Visit Reports → Compare Stock, Sales, and Purchase tabs, switch page sizes (10/20/50/100), and test full-dataset CSV exports.',
  'Explore Patients, Appointments (with doctor slot conflict checks), Suppliers, and Clinic Settings for JSON backup and demo workspace reset.',
];

const shortcuts = [
  ['/', 'Focus global search'],
  ['Ctrl / ⌘ + K', 'Focus global search'],
  ['Esc', 'Close modals, drawers, and menus'],
  ['↑ ↓ Enter', 'Navigate global search results'],
];

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Help & Reviewer Guide"
        description="How DrStock connects medicine inventory, billing, procurement, and reporting workflows."
      />

      <section className="bg-primary-subtle border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Quick Reviewer Walkthrough (7-Step Assessment Flow)</h2>
        </div>
        <ol className="space-y-2 text-[13px] sm:text-sm text-secondary-text list-decimal pl-5 leading-relaxed">
          {reviewerSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workflows.map(({ title, icon: Icon, steps, href, cta }) => (
          <section key={title} className="bg-surface rounded-xl border border-border p-5 flex flex-col">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="p-2 rounded-lg bg-primary-subtle text-primary">
                <Icon className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            </div>
            <ol className="space-y-2 text-xs sm:text-[13px] text-secondary-text list-decimal pl-5 flex-1 leading-relaxed">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <Link href={href} className="mt-4 self-start text-xs font-semibold text-primary hover:text-primary-hover">
              {cta} →
            </Link>
          </section>
        ))}
      </div>

      <section className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="p-1.5 rounded-lg bg-muted-surface border border-border text-secondary-text">
            <Keyboard className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[13px]">
          {shortcuts.map(([key, action]) => (
            <div key={key + action} className="flex items-center justify-between gap-3">
              <dt className="text-secondary-text">{action}</dt>
              <dd>
                <kbd className="px-2 py-0.5 text-xs font-medium text-foreground bg-muted-surface border border-border rounded">
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="bg-surface border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Technical Demo &amp; Persistence</h2>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            All sample data is fictional and stored locally in browser <code>localStorage</code>. Reset or export anytime from Clinic Settings.
          </p>
        </div>
        <Link
          href="/settings#demo-data"
          className="h-9 px-4 inline-flex items-center justify-center bg-primary text-primary-foreground text-[13px] font-medium rounded-lg hover:bg-primary-hover shrink-0 transition-colors"
        >
          Data Settings
        </Link>
      </section>
    </div>
  );
}
