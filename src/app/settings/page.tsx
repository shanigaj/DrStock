'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, RotateCcw, ShieldAlert } from 'lucide-react';
import { useStore } from '@/store';
import { PageHeader, ConfirmDialog, Metric } from '@/components/ui/SharedComponents';
import { useToast } from '@/components/ui/ToastProvider';

const profileSchema = z.object({
  businessName: z.string().trim().min(2, 'Enter clinic or pharmacy name'),
  tagline: z.string().trim(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === '' || /^[0-9]{2}[A-Z0-9]{13}$/.test(v), 'GSTIN must be 15 characters (e.g. 24AAACP4567M1Z2)'),
  phone: z.string().trim(),
  email: z.union([z.literal(''), z.email('Enter a valid email')]),
  address: z.string().trim(),
  defaultGstPercent: z.coerce.number().refine((v) => [0, 5, 12, 18].includes(v), 'Choose a valid GST slab'),
  expiryWarningDays: z.coerce.number().int().min(7).max(365),
});

type ProfileInput = z.input<typeof profileSchema>;
type ProfileValues = z.output<typeof profileSchema>;

export default function SettingsPage() {
  const { addToast } = useToast();
  const profile = useStore((s) => s.businessProfile);
  const updateBusinessProfile = useStore((s) => s.updateBusinessProfile);
  const resetData = useStore((s) => s.resetData);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const suppliers = useStore((s) => s.suppliers);
  const sales = useStore((s) => s.sales);
  const purchaseOrders = useStore((s) => s.purchaseOrders);
  const stockMovements = useStore((s) => s.stockMovements);
  const appointments = useStore((s) => s.appointments);
  const activityLogs = useStore((s) => s.activityLogs);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileInput, unknown, ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  });

  const onSave = (values: ProfileValues) => {
    updateBusinessProfile(values);
    reset(values);
    addToast('success', 'Clinic profile saved', values.businessName);
  };

  const handleReset = () => {
    resetData();
    const fresh = useStore.getState().businessProfile;
    reset(fresh);
    setFormKey((k) => k + 1);
    addToast('success', 'Demo data restored', 'Medicines, sales, purchases, appointments, and settings are reset.');
  };

  const handleBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      businessProfile: profile,
      products,
      customers,
      suppliers,
      sales,
      purchaseOrders,
      stockMovements,
      appointments,
      activityLogs,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `drstock-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Backup downloaded', 'All workspace data exported as JSON.');
  };

  const field = (err: boolean) =>
    `w-full h-9 px-3 text-[13px] bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent ${
      err ? 'border-danger' : 'border-border'
    }`;
  const errorText = (msg?: string) => (msg ? <p className="text-xs text-danger mt-1" role="alert">{msg}</p> : null);
  const labelClass = 'block text-[13px] font-medium text-secondary-text mb-1';

  return (
    <div className="space-y-5 max-w-4xl">
      <PageHeader
        title="Clinic Settings"
        description="Configure clinic pharmacy profile, tax slabs, expiry alert window, and local demo persistence."
      />

      <section className="bg-surface rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Clinic &amp; Pharmacy Profile</h2>
          <p className="text-xs text-muted mt-0.5">Printed on patient tax invoices and shown in the navigation sidebar.</p>
        </div>
        <form key={formKey} onSubmit={handleSubmit(onSave)} className="p-5 space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="s-name" className={labelClass}>
                Clinic / Pharmacy Name *
              </label>
              <input id="s-name" {...register('businessName')} className={field(!!errors.businessName)} />
              {errorText(errors.businessName?.message)}
            </div>
            <div>
              <label htmlFor="s-gstin" className={labelClass}>
                GSTIN
              </label>
              <input id="s-gstin" {...register('gstin')} className={`${field(!!errors.gstin)} font-mono uppercase`} />
              {errorText(errors.gstin?.message)}
            </div>
            <div>
              <label htmlFor="s-phone" className={labelClass}>
                Phone
              </label>
              <input id="s-phone" type="tel" {...register('phone')} className={field(false)} />
            </div>
            <div>
              <label htmlFor="s-email" className={labelClass}>
                Email
              </label>
              <input id="s-email" type="email" {...register('email')} className={field(!!errors.email)} />
              {errorText(errors.email?.message)}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="s-address" className={labelClass}>
                Address
              </label>
              <input id="s-address" {...register('address')} className={field(false)} />
            </div>
            <div>
              <label htmlFor="s-gst" className={labelClass}>
                Default Pharma GST Rate
              </label>
              <select id="s-gst" {...register('defaultGstPercent')} className={field(false)}>
                {[0, 5, 12, 18].map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? 'Exempt (0%)' : `${r}% GST`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="s-exp" className={labelClass}>
                Near-Expiry Alert Window
              </label>
              <select id="s-exp" {...register('expiryWarningDays')} className={field(false)}>
                <option value={30}>30 days before expiry</option>
                <option value={60}>60 days before expiry</option>
                <option value={90}>90 days before expiry (Recommended)</option>
                <option value={180}>180 days before expiry</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              disabled={!isDirty}
              onClick={() => reset(profile)}
              className="h-9 px-4 text-[13px] font-medium text-secondary-text border border-border rounded-lg hover:bg-hover-surface disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={!isDirty}
              className="h-9 px-4 bg-primary text-primary-foreground text-[13px] font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50"
            >
              Save Changes
            </button>
          </div>
        </form>
      </section>

      <section id="demo-data" className="bg-surface rounded-xl border border-border scroll-mt-6">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Workspace Data &amp; Demo Backup</h2>
          <p className="text-xs text-muted mt-0.5">All records are saved locally in browser localStorage.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Medicines" value={String(products.length)} />
            <Metric label="Invoices" value={String(sales.length)} />
            <Metric label="Purchase Orders" value={String(purchaseOrders.length)} />
            <Metric label="Ledger Entries" value={String(stockMovements.length)} />
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-primary-subtle border border-primary/20 text-xs text-primary">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              <strong>Technical Demonstration Notice:</strong> DrStock uses fictional healthcare and pharmacy data persisted in your browser&apos;s{' '}
              <code>localStorage</code>. It is not intended for storing real Protected Health Information (PHI) or clinical diagnosis records.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Export JSON Backup</p>
              <p className="text-xs text-muted mt-0.5">Download a complete snapshot of medicines, orders, and movements.</p>
            </div>
            <button
              onClick={handleBackup}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface shrink-0"
            >
              <Download className="w-4 h-4 text-muted" /> Download JSON
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-danger/25 bg-danger-bg/60">
            <div>
              <p className="text-sm font-semibold text-danger">Reset Demo Workspace</p>
              <p className="text-xs text-secondary-text mt-0.5">Restore original Apex Healthcare fictional seed data. All edits will be lost.</p>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 text-[13px] font-semibold text-white bg-danger rounded-lg hover:bg-red-800 shrink-0"
            >
              <RotateCcw className="w-4 h-4" /> Reset Demo Data
            </button>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title="Reset workspace to initial demo state?"
        description="Every medicine, invoice, purchase order, appointment, and stock movement will be restored to the original sample dataset."
        confirmLabel="Reset Workspace"
        variant="danger"
      />
    </div>
  );
}
