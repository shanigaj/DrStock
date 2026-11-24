'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/store';
import { Customer } from '@/types';
import { Modal } from '@/components/ui/SharedComponents';
import { useToast } from '@/components/ui/ToastProvider';

const contactSchema = z.object({
  company: z.string().trim(),
  name: z.string().trim().min(2, 'Enter a full name'),
  phone: z
    .string()
    .trim()
    .min(1, 'Enter a phone number')
    .regex(/^\+?[0-9\s-]{8,16}$/, 'Enter a valid phone number'),
  email: z.union([z.literal(''), z.email('Enter a valid email')]),
  address: z.string().trim(),
  age: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().min(0).max(120).optional()
  ),
  gender: z.enum(['Male', 'Female', 'Other', '']).optional(),
  bloodGroup: z.string().trim().optional(),
});

type ContactInputForm = z.input<typeof contactSchema>;
type ContactValues = z.output<typeof contactSchema>;
type Kind = 'customer' | 'supplier';

interface Props {
  kind: Kind;
  open: boolean;
  contact: Customer | null;
  onClose: () => void;
}

export default function ContactFormModal({ kind, open, contact, onClose }: Props) {
  const noun = kind === 'customer' ? 'Patient' : 'Supplier';
  return (
    <Modal open={open} onClose={onClose} title={contact ? `Edit ${contact.name}` : `Add ${noun}`} size="md">
      {open && <ContactForm key={contact?.id ?? 'new'} kind={kind} contact={contact} onClose={onClose} />}
    </Modal>
  );
}

function ContactForm({ kind, contact, onClose }: Omit<Props, 'open'>) {
  const { addToast } = useToast();
  const add = useStore((s) => (kind === 'customer' ? s.addCustomer : s.addSupplier));
  const update = useStore((s) => (kind === 'customer' ? s.updateCustomer : s.updateSupplier));

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ContactInputForm, unknown, ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: contact
      ? {
          company: contact.company,
          name: contact.name,
          phone: contact.phone,
          email: contact.email,
          address: contact.address,
          age: contact.age ?? '',
          gender: contact.gender ?? '',
          bloodGroup: contact.bloodGroup ?? '',
        }
      : { company: '', name: '', phone: '', email: '', address: '', age: '', gender: '', bloodGroup: '' },
  });

  const onSubmit = (values: ContactValues) => {
    const payload = {
      company: values.company || values.name,
      name: values.name,
      phone: values.phone,
      email: values.email,
      address: values.address,
      age: values.age,
      gender: values.gender ? (values.gender as 'Male' | 'Female' | 'Other') : undefined,
      bloodGroup: values.bloodGroup || undefined,
    };
    const result = contact ? update(contact.id, payload) : add(payload);
    if (!result.success) return setError('root', { message: result.error });
    const label = kind === 'customer' ? values.name : values.company || values.name;
    addToast(
      'success',
      contact ? `${kind === 'customer' ? 'Patient' : 'Supplier'} updated` : `${kind === 'customer' ? 'Patient' : 'Supplier'} added`,
      label
    );
    onClose();
  };

  const field = (err: boolean) =>
    `w-full h-9 px-3 text-[13px] bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent ${
      err ? 'border-danger' : 'border-border'
    }`;
  const error = (msg?: string) => (msg ? <p className="text-xs text-danger mt-1" role="alert">{msg}</p> : null);
  const label = (id: string, text: string) => (
    <label htmlFor={id} className="block text-[13px] font-medium text-secondary-text mb-1">
      {text}
    </label>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {errors.root && (
        <p className="p-3 text-[13px] text-danger bg-danger-bg border border-danger/20 rounded-lg">{errors.root.message}</p>
      )}
      {kind === 'supplier' && (
        <div>
          {label('c-company', 'Company / Distributor Name *')}
          <input
            id="c-company"
            {...register('company')}
            placeholder="e.g. Sun Pharma Distribution Ltd"
            className={field(false)}
          />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          {label('c-name', kind === 'customer' ? 'Patient Full Name *' : 'Contact Person *')}
          <input id="c-name" {...register('name')} placeholder={kind === 'customer' ? 'e.g. Rajesh Trivedi' : 'e.g. Ramesh Patel'} className={field(!!errors.name)} />
          {error(errors.name?.message)}
        </div>
        <div>
          {label('c-phone', 'Phone *')}
          <input id="c-phone" type="tel" {...register('phone')} placeholder="+91 98765 43210" className={field(!!errors.phone)} />
          {error(errors.phone?.message)}
        </div>
      </div>

      {kind === 'customer' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            {label('c-age', 'Age')}
            <input id="c-age" type="number" min={0} max={120} {...register('age')} placeholder="e.g. 34" className={field(!!errors.age)} />
          </div>
          <div>
            {label('c-gender', 'Gender')}
            <select id="c-gender" {...register('gender')} className={field(false)}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            {label('c-blood', 'Blood Group')}
            <select id="c-blood" {...register('bloodGroup')} className={field(false)}>
              <option value="">Select</option>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        {label('c-email', 'Email')}
        <input id="c-email" type="email" {...register('email')} className={field(!!errors.email)} />
        {error(errors.email?.message)}
      </div>
      <div>
        {label('c-address', 'Address')}
        <textarea
          id="c-address"
          rows={2}
          {...register('address')}
          className="w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
        />
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-4 text-[13px] font-medium text-secondary-text bg-surface border border-border rounded-lg hover:bg-hover-surface"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-9 px-5 text-[13px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary-hover"
        >
          {contact ? 'Save Changes' : `Add ${kind === 'customer' ? 'Patient' : 'Supplier'}`}
        </button>
      </div>
    </form>
  );
}
