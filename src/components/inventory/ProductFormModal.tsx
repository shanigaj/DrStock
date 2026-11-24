'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/store';
import { Product } from '@/types';
import { Modal } from '@/components/ui/SharedComponents';
import { useToast } from '@/components/ui/ToastProvider';

const UNITS = ['Strip', 'Bottle', 'Vial', 'Ampoule', 'Tube', 'Sachet', 'Piece', 'Box', 'Pack'];
const DEFAULT_CATEGORIES = [
  'Tablets',
  'Capsules',
  'Syrups',
  'Injections',
  'Drops',
  'Creams',
  'Homeopathy',
  'Medical Supplies',
];

const wholeNumber = (label: string) =>
  z.coerce
    .number({ error: `${label} is required` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} cannot be negative`);
const money = (label: string) =>
  z.coerce.number({ error: `${label} is required` }).min(0, `${label} cannot be negative`);

const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a medicine name'),
    genericName: z.string().trim().optional(),
    sku: z
      .string()
      .trim()
      .min(2, 'Enter a SKU')
      .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and hyphens only'),
    category: z.string().trim().min(2, 'Select a category'),
    manufacturer: z.string().trim().optional(),
    batchNumber: z.string().trim().optional(),
    expiryDate: z.string().trim().optional(),
    potency: z.string().trim().optional(),
    unit: z.string().min(1),
    description: z.string().trim(),
    costPrice: money('Purchase price'),
    sellingPrice: money('Selling price'),
    quantity: wholeNumber('Opening stock'),
    minimumStock: wholeNumber('Minimum stock'),
  })
  .refine((v) => v.sellingPrice >= v.costPrice, {
    path: ['sellingPrice'],
    message: 'Selling price should not be below purchase cost',
  });

type ProductFormInput = z.input<typeof productSchema>;
type ProductFormValues = z.output<typeof productSchema>;

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="text-xs text-danger mt-1" role="alert">
      {message}
    </p>
  ) : null;
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-medium text-secondary-text mb-1">
      {children}
    </label>
  );
}

interface Props {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

export default function ProductFormModal({ open, product, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={product ? `Edit ${product.name}` : 'Add Medicine'} size="lg">
      {open && <ProductForm key={product?.id ?? 'new'} product={product} onClose={onClose} />}
    </Modal>
  );
}

function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { addToast } = useToast();
  const products = useStore((s) => s.products);
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);
  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category)]));

  const defaultExpiry = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? { ...product }
      : {
          name: '',
          genericName: '',
          sku: '',
          category: 'Tablets',
          manufacturer: '',
          batchNumber: '',
          expiryDate: defaultExpiry(),
          potency: '',
          unit: 'Strip',
          description: '',
          costPrice: '',
          sellingPrice: '',
          quantity: 0,
          minimumStock: 10,
        },
  });

  const [selectedCategory, setSelectedCategory] = useState(product?.category ?? 'Tablets');
  const categoryReg = register('category');

  const onSubmit = (values: ProductFormValues) => {
    if (product) {
      const { quantity: _ignored, ...details } = values;
      void _ignored;
      const result = updateProduct(product.id, details);
      if (!result.success) return setError('sku', { message: result.error });
      addToast('success', 'Medicine updated', `${values.name} saved.`);
    } else {
      const result = addProduct(values);
      if (!result.success) return setError('sku', { message: result.error });
      addToast('success', 'Medicine added', `${values.name} added with ${values.quantity} in stock.`);
    }
    onClose();
  };

  const field = (hasError: boolean) =>
    `w-full h-9 px-3 text-[13px] bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent ${
      hasError ? 'border-danger' : 'border-border'
    }`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="p-name">Medicine Name *</Label>
          <input id="p-name" {...register('name')} placeholder="e.g. Paracetamol 500mg" className={field(!!errors.name)} />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="p-generic">Generic Composition</Label>
          <input id="p-generic" {...register('genericName')} placeholder="e.g. Acetaminophen" className={field(false)} />
        </div>
        <div>
          <Label htmlFor="p-sku">SKU / Code *</Label>
          <input
            id="p-sku"
            {...register('sku')}
            placeholder="e.g. MED-031"
            className={`${field(!!errors.sku)} font-mono uppercase`}
          />
          <FieldError message={errors.sku?.message} />
        </div>
        <div>
          <Label htmlFor="p-category">Category *</Label>
          <select
            id="p-category"
            {...categoryReg}
            onChange={(e) => {
              categoryReg.onChange(e);
              setSelectedCategory(e.target.value);
            }}
            className={field(!!errors.category)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FieldError message={errors.category?.message} />
        </div>
        <div>
          <Label htmlFor="p-manufacturer">Manufacturer</Label>
          <input id="p-manufacturer" {...register('manufacturer')} placeholder="e.g. Sun Pharma" className={field(false)} />
        </div>
        <div>
          <Label htmlFor="p-unit">Unit *</Label>
          <select id="p-unit" {...register('unit')} className={field(false)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="p-batch">Batch Number</Label>
          <input id="p-batch" {...register('batchNumber')} placeholder="e.g. BATCH-24A10" className={`${field(false)} font-mono uppercase`} />
        </div>
        <div>
          <Label htmlFor="p-expiry">Expiry Date</Label>
          <input id="p-expiry" type="date" {...register('expiryDate')} className={field(false)} />
        </div>
      </div>

      {selectedCategory === 'Homeopathy' && (
        <div>
          <Label htmlFor="p-potency">Potency (Homeopathy)</Label>
          <input id="p-potency" {...register('potency')} placeholder="e.g. 30C, 200C, 1M" className={field(false)} />
        </div>
      )}

      <div>
        <Label htmlFor="p-desc">Clinical Notes / Description</Label>
        <textarea
          id="p-desc"
          rows={2}
          {...register('description')}
          placeholder="Dosage indication, storage conditions…"
          className="w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border">
        <div>
          <Label htmlFor="p-cost">Purchase Price (₹) *</Label>
          <input id="p-cost" type="number" step="0.01" min={0} inputMode="decimal" {...register('costPrice')} className={field(!!errors.costPrice)} />
          <FieldError message={errors.costPrice?.message} />
        </div>
        <div>
          <Label htmlFor="p-sell">Selling Price (₹) *</Label>
          <input id="p-sell" type="number" step="0.01" min={0} inputMode="decimal" {...register('sellingPrice')} className={field(!!errors.sellingPrice)} />
          <FieldError message={errors.sellingPrice?.message} />
        </div>
        <div>
          <Label htmlFor="p-qty">{product ? 'Current Stock' : 'Opening Stock *'}</Label>
          <input
            id="p-qty"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            readOnly={!!product}
            {...register('quantity')}
            className={`${field(!!errors.quantity)} ${product ? 'bg-muted-surface text-muted cursor-not-allowed' : ''}`}
          />
          {product ? (
            <p className="text-[11px] text-muted mt-1">Use Adjust Stock to modify</p>
          ) : (
            <FieldError message={errors.quantity?.message} />
          )}
        </div>
        <div>
          <Label htmlFor="p-min">Minimum Level *</Label>
          <input id="p-min" type="number" min={0} step={1} inputMode="numeric" {...register('minimumStock')} className={field(!!errors.minimumStock)} />
          <FieldError message={errors.minimumStock?.message} />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-9 px-5 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover disabled:opacity-60"
        >
          {product ? 'Save Changes' : 'Add Medicine'}
        </button>
      </div>
    </form>
  );
}
