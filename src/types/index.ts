// ============================================================
// DrStock — Core Type Definitions
// Healthcare Inventory & Clinic Management
// ============================================================

export type MedicineCategory =
  | 'Tablets'
  | 'Capsules'
  | 'Syrups'
  | 'Injections'
  | 'Drops'
  | 'Creams'
  | 'Homeopathy'
  | 'Medical Supplies';

export interface BatchLot {
  batchNumber: string;
  expiryDate?: string; // YYYY-MM-DD
  quantity: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  genericName?: string;
  category: MedicineCategory | string;
  manufacturer?: string;
  batchNumber?: string;
  expiryDate?: string; // YYYY-MM-DD
  batches?: BatchLot[];
  dosageForm?: string;
  potency?: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minimumStock: number;
  unit: string;
  createdAt: string; // ISO date
}

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';
export type ExpiryStatus = 'valid' | 'near-expiry' | 'expired';

export interface Customer {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  bloodGroup?: string;
  lastVisit?: string;
  createdAt: string;
}

export type Patient = Customer;

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  contactPerson?: string;
  createdAt: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'cancelled';
export type PaymentMethod = 'Cash' | 'UPI' | 'Card';

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  batchNumber?: string;
  expiryDate?: string;
  batchBreakdown?: BatchLot[];
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  date: string; // ISO date
  notes: string;
  createdAt: string;
}

export type PurchaseStatus = 'draft' | 'ordered' | 'received' | 'partial';

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  total: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface PurchaseOrder {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  status: PurchaseStatus;
  date: string; // ISO date
  expectedDeliveryDate?: string;
  receivedDate: string | null;
  notes: string;
  createdAt: string;
}

export type MovementType = 'purchase' | 'sale' | 'adjustment' | 'return';

export interface StockMovement {
  id: string;
  date: string; // ISO date
  productId: string;
  productName: string;
  sku: string;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference: string;
  notes: string;
}

export interface ActivityLog {
  id: string;
  date: string; // ISO date
  type:
    | 'sale'
    | 'purchase'
    | 'stock-adjustment'
    | 'product'
    | 'customer'
    | 'supplier'
    | 'purchase-received'
    | 'appointment';
  title: string;
  description: string;
  referenceId: string;
}

export interface Appointment {
  id: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  department: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  visitType: 'Consultation' | 'Follow-up' | 'Emergency' | 'Routine Checkup';
  status: 'scheduled' | 'waiting' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface BusinessProfile {
  businessName: string;
  tagline: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  defaultGstPercent: number;
  expiryWarningDays: number;
}

export interface OrderLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  batchNumber?: string;
  expiryDate?: string;
}

export type ActionResult = { success: true; id?: string } | { success: false; error: string };

export function getStockStatus(quantity: number, minimumStock: number): StockStatus {
  if (quantity <= 0) return 'out-of-stock';
  if (quantity <= minimumStock) return 'low-stock';
  return 'in-stock';
}

export function getExpiryStatus(expiryDate?: string, warningDays = 90): ExpiryStatus {
  if (!expiryDate) return 'valid';
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return 'valid';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (exp < today) return 'expired';
  const threshold = new Date(today.getTime() + warningDays * 86_400_000);
  if (exp <= threshold) return 'near-expiry';
  return 'valid';
}
