// ============================================================
// DrStock — Centralized Zustand Store
//
// All healthcare inventory & clinic business rules live here.
// Batch-level quantities, FEFO deduction, expiry checks, ledger
// entries, and appointment conflict validation are centralized.
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Product, Customer, Supplier, Sale, SaleItem, PurchaseOrder, PurchaseItem,
  StockMovement, ActivityLog, PaymentStatus, PurchaseStatus, BusinessProfile,
  OrderLineInput, ActionResult, Appointment, getExpiryStatus, PaymentMethod,
} from '@/types';
import { createSeedState } from '@/data/seed';
import { generateId, generateOrderId } from '@/lib/utils';
import { calculateOrderTotals, quantityByProduct, validateOrderLines } from '@/lib/orders';
import {
  addBatchLot,
  adjustProductBatches,
  availableSellableQuantity,
  deductBatchesFEFO,
  normalizeProductBatches,
  restoreBatchLots,
} from '@/lib/batches';

type ProductInput = Omit<Product, 'id' | 'createdAt'>;
type ProductUpdate = Partial<Omit<Product, 'id' | 'createdAt' | 'quantity'>>;
type ContactInput = Omit<Customer, 'id' | 'createdAt'>;
type SupplierInput = Omit<Supplier, 'id' | 'createdAt'>;
type AppointmentInput = Omit<Appointment, 'id' | 'appointmentId' | 'createdAt'>;

export interface CreateSaleInput {
  customerId: string;
  items: OrderLineInput[];
  gstPercent: number;
  paymentStatus: Exclude<PaymentStatus, 'cancelled'>;
  paymentMethod?: PaymentMethod;
  notes: string;
}

export interface CreatePurchaseInput {
  supplierId: string;
  items: OrderLineInput[];
  status: Extract<PurchaseStatus, 'draft' | 'ordered'>;
  expectedDeliveryDate?: string;
  notes: string;
}

interface DataState {
  businessProfile: BusinessProfile;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchaseOrders: PurchaseOrder[];
  stockMovements: StockMovement[];
  activityLogs: ActivityLog[];
  appointments: Appointment[];
}

export interface AppState extends DataState {
  // Medicines (Products)
  addProduct: (product: ProductInput) => ActionResult;
  updateProduct: (id: string, updates: ProductUpdate) => ActionResult;
  deleteProduct: (id: string) => ActionResult;
  adjustStock: (productId: string, change: number, reason: string) => ActionResult;

  // Sales & Billing
  createSale: (input: CreateSaleInput) => ActionResult;
  cancelSale: (id: string) => ActionResult;
  updateSalePaymentStatus: (id: string, status: Exclude<PaymentStatus, 'cancelled'>) => ActionResult;

  // Purchase Orders
  createPurchaseOrder: (input: CreatePurchaseInput) => ActionResult;
  markPurchaseOrdered: (id: string) => ActionResult;
  receivePurchaseOrder: (
    id: string,
    quantities?: Record<string, number>,
    batches?: Record<string, { batchNumber?: string; expiryDate?: string }>
  ) => ActionResult;

  // Patients (Customers)
  addCustomer: (customer: ContactInput) => ActionResult;
  updateCustomer: (id: string, updates: Partial<ContactInput>) => ActionResult;
  deleteCustomer: (id: string) => ActionResult;

  // Suppliers
  addSupplier: (supplier: SupplierInput) => ActionResult;
  updateSupplier: (id: string, updates: Partial<SupplierInput>) => ActionResult;
  deleteSupplier: (id: string) => ActionResult;

  // Clinic Appointments
  addAppointment: (appointment: AppointmentInput) => ActionResult;
  updateAppointment: (id: string, updates: Partial<Appointment>) => ActionResult;
  cancelAppointment: (id: string) => ActionResult;

  // Settings
  updateBusinessProfile: (profile: BusinessProfile) => void;
  resetData: () => void;
}

const STORE_VERSION = 5;

const fail = (error: string): ActionResult => ({ success: false, error });

function activity(
  type: ActivityLog['type'],
  title: string,
  description: string,
  referenceId: string,
  date = new Date().toISOString()
): ActivityLog {
  return { id: generateId(), date, type, title, description, referenceId };
}

function movement(
  product: Product,
  movementType: StockMovement['movementType'],
  quantity: number,
  reference: string,
  notes: string,
  date: string
): StockMovement {
  return {
    id: generateId(),
    date,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    movementType,
    quantity,
    previousStock: product.quantity,
    newStock: product.quantity + quantity,
    reference,
    notes,
  };
}

function applyStockChanges(
  products: Product[],
  changes: { productId: string; quantity: number }[],
  movementType: StockMovement['movementType'],
  reference: string,
  notes: string,
  date: string
): { products: Product[]; movements: StockMovement[] } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const movements: StockMovement[] = [];
  for (const change of changes) {
    const product = byId.get(change.productId);
    if (!product || change.quantity === 0) continue;
    movements.push(movement(product, movementType, change.quantity, reference, notes, date));
    byId.set(product.id, { ...product, quantity: product.quantity + change.quantity });
  }
  return { products: products.map((p) => byId.get(p.id)!), movements };
}

function validateContact(input: Partial<ContactInput>, requireName: boolean): string | null {
  if (requireName && !input.name?.trim()) return 'Name is required.';
  if (input.name !== undefined && !input.name.trim()) return 'Name is required.';
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) return 'Enter a valid email address.';
  return null;
}

function validateProduct(input: ProductUpdate & { quantity?: number }): string | null {
  if (input.name !== undefined && !input.name.trim()) return 'Medicine name is required.';
  if (input.sku !== undefined && !input.sku.trim()) return 'SKU / Item code is required.';
  for (const key of ['costPrice', 'sellingPrice'] as const) {
    const v = input[key];
    if (v !== undefined && (!Number.isFinite(v) || v < 0)) return 'Prices must be zero or more.';
  }
  for (const key of ['minimumStock', 'quantity'] as const) {
    const v = input[key];
    if (v !== undefined && (!Number.isInteger(v) || v < 0)) return 'Stock values must be whole numbers, zero or more.';
  }
  return null;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...createSeedState(),

      // ---------------------------------------------------------------
      // MEDICINES (PRODUCTS)
      // ---------------------------------------------------------------
      addProduct: (input) => {
        const error = validateProduct(input);
        if (error) return fail(error);
        const sku = input.sku.trim().toUpperCase();
        const state = get();
        if (state.products.some((p) => p.sku.toUpperCase() === sku)) {
          return fail(`A medicine with SKU ${sku} already exists.`);
        }

        const now = new Date().toISOString();
        const batches =
          input.quantity > 0
            ? [{ batchNumber: input.batchNumber?.trim().toUpperCase() || 'OPENING', expiryDate: input.expiryDate, quantity: input.quantity }]
            : [];

        const product: Product = {
          ...input,
          name: input.name.trim(),
          sku,
          batchNumber: input.batchNumber?.trim().toUpperCase() || undefined,
          batches,
          quantity: 0,
          id: generateId(),
          createdAt: now,
        };
        const opening = applyStockChanges(
          [product],
          [{ productId: product.id, quantity: input.quantity }],
          'adjustment',
          'OPENING',
          'Initial medicine intake balance',
          now
        );

        set({
          products: [...state.products, opening.products[0]],
          stockMovements: [...opening.movements, ...state.stockMovements],
          activityLogs: [
            activity(
              'product',
              'Medicine Added',
              `${product.name} (${sku}) added with initial stock of ${input.quantity} ${input.unit.toLowerCase()}(s)`,
              product.id,
              now
            ),
            ...state.activityLogs,
          ],
        });
        return { success: true, id: product.id };
      },

      updateProduct: (id, updates) => {
        const error = validateProduct(updates);
        if (error) return fail(error);
        const state = get();
        const existing = state.products.find((p) => p.id === id);
        if (!existing) return fail('Medicine not found.');

        const sku = updates.sku?.trim().toUpperCase();
        if (sku && state.products.some((p) => p.id !== id && p.sku.toUpperCase() === sku)) {
          return fail(`A medicine with SKU ${sku} already exists.`);
        }

        const clean: ProductUpdate = { ...updates };
        if ('quantity' in clean) delete (clean as Partial<Product>).quantity;
        if ('batches' in clean) delete (clean as Partial<Product>).batches;
        if (sku) clean.sku = sku;
        if (clean.name) clean.name = clean.name.trim();

        set({
          products: state.products.map((p) => (p.id === id ? { ...p, ...clean } : p)),
          activityLogs: [
            activity('product', 'Medicine Updated', `${clean.name ?? existing.name} details updated`, id),
            ...state.activityLogs,
          ],
        });
        return { success: true, id };
      },

      deleteProduct: (id) => {
        const state = get();
        const product = state.products.find((p) => p.id === id);
        if (!product) return fail('Medicine not found.');
        const used =
          state.sales.some((s) => s.items.some((i) => i.productId === id)) ||
          state.purchaseOrders.some((po) => po.items.some((i) => i.productId === id));
        if (used) return fail(`${product.name} is referenced by sales or purchase orders and cannot be deleted.`);

        set({
          products: state.products.filter((p) => p.id !== id),
          activityLogs: [activity('product', 'Medicine Deleted', `${product.name} (${product.sku}) removed`, id), ...state.activityLogs],
        });
        return { success: true };
      },

      adjustStock: (productId, change, reason) => {
        const state = get();
        const product = state.products.find((p) => p.id === productId);
        if (!product) return fail('Medicine not found.');
        if (!Number.isInteger(change) || change === 0) return fail('Adjustment must be a whole number other than zero.');
        if (!reason.trim()) return fail('An adjustment reason is required.');
        if (product.quantity + change < 0) {
          return fail(`Cannot remove ${Math.abs(change)} units — only ${product.quantity} in stock.`);
        }

        const now = new Date().toISOString();
        const reference = generateOrderId(
          'ADJ-',
          state.stockMovements.map((m) => m.reference)
        );
        const batchUpdate = adjustProductBatches(product, change);
        const updatedInput = state.products.map((p) =>
          p.id === productId ? { ...p, ...batchUpdate } : p
        );
        const result = applyStockChanges(updatedInput, [{ productId, quantity: change }], 'adjustment', reference, reason.trim(), now);

        set({
          products: result.products,
          stockMovements: [...result.movements, ...state.stockMovements],
          activityLogs: [
            activity(
              'stock-adjustment',
              'Stock Adjusted',
              `${product.name} ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} — ${reason.trim()}`,
              productId,
              now
            ),
            ...state.activityLogs,
          ],
        });
        return { success: true, id: reference };
      },

      // ---------------------------------------------------------------
      // SALES & BILLING
      // ---------------------------------------------------------------
      createSale: (input) => {
        const state = get();
        const customer = state.customers.find((c) => c.id === input.customerId);
        if (!customer) return fail('Select a valid patient or customer.');
        if ((input.paymentStatus as PaymentStatus) === 'cancelled') return fail('A new sale cannot be created as cancelled.');
        if (!Number.isFinite(input.gstPercent) || input.gstPercent < 0) return fail('GST rate is invalid.');

        const lineError = validateOrderLines(input.items);
        if (lineError) return fail(lineError);

        // Deduct FEFO from valid non-expired batches per product
        const updatedBatchesMap = new Map<
          string,
          { batches: Product['batches']; batchNumber?: string; expiryDate?: string; deducted: NonNullable<SaleItem['batchBreakdown']> }
        >();

        for (const [productId, requested] of quantityByProduct(input.items)) {
          const product = state.products.find((p) => p.id === productId);
          if (!product) return fail('One of the selected medicines no longer exists.');

          const deduction = deductBatchesFEFO(product, requested);
          if (!deduction.ok) return fail(deduction.error);

          updatedBatchesMap.set(productId, {
            batches: deduction.batches,
            batchNumber: deduction.batchNumber,
            expiryDate: deduction.expiryDate,
            deducted: deduction.deducted,
          });
        }

        const remainingDeducted = new Map<string, SaleItem['batchBreakdown']>(
          Array.from(updatedBatchesMap.entries()).map(([pid, info]) => [
            pid,
            info.deducted.map((lot) => ({ ...lot })),
          ])
        );

        const now = new Date().toISOString();
        const orderId = generateOrderId('INV-', state.sales.map((s) => s.orderId));
        const items: SaleItem[] = input.items.map((line) => {
          const product = state.products.find((p) => p.id === line.productId)!;
          const pool = remainingDeducted.get(line.productId) ?? [];
          const lineBreakdown: NonNullable<SaleItem['batchBreakdown']> = [];
          let need = line.quantity;
          for (const lot of pool) {
            if (need <= 0) break;
            if (lot.quantity <= 0) continue;
            const take = Math.min(lot.quantity, need);
            lot.quantity -= take;
            need -= take;
            lineBreakdown.push({
              batchNumber: lot.batchNumber,
              expiryDate: lot.expiryDate,
              quantity: take,
            });
          }
          const primaryLot = lineBreakdown[0];
          return {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            batchNumber: primaryLot?.batchNumber || product.batchNumber,
            expiryDate: primaryLot?.expiryDate || product.expiryDate,
            batchBreakdown: lineBreakdown,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.quantity * line.unitPrice,
          };
        });
        const totals = calculateOrderTotals(input.items, input.gstPercent);
        const customerName = customer.name;

        const sale: Sale = {
          id: generateId(),
          orderId,
          customerId: customer.id,
          customerName,
          items,
          ...totals,
          gstPercent: input.gstPercent,
          paymentStatus: input.paymentStatus,
          paymentMethod: input.paymentMethod ?? 'UPI',
          date: now,
          notes: input.notes.trim(),
          createdAt: now,
        };

        const productsWithBatches = state.products.map((p) => {
          const u = updatedBatchesMap.get(p.id);
          return u ? { ...p, batches: u.batches, batchNumber: u.batchNumber, expiryDate: u.expiryDate } : p;
        });

        const changes = items.map((i) => ({ productId: i.productId, quantity: -i.quantity }));
        const stockResult = applyStockChanges(
          productsWithBatches,
          changes,
          'sale',
          orderId,
          `Billed to ${customerName} (${sale.paymentMethod || 'UPI'})`,
          now
        );

        set({
          sales: [sale, ...state.sales],
          products: stockResult.products,
          stockMovements: [...stockResult.movements, ...state.stockMovements],
          activityLogs: [
            activity(
              'sale',
              'Sale Completed',
              `${orderId}: ₹${sale.grandTotal.toFixed(2)} billed to ${customerName} (${sale.paymentMethod || 'UPI'})`,
              sale.id,
              now
            ),
            ...state.activityLogs,
          ],
        });
        return { success: true, id: sale.id };
      },

      cancelSale: (id) => {
        const state = get();
        const sale = state.sales.find((s) => s.id === id);
        if (!sale) return fail('Sale not found.');
        if (sale.paymentStatus === 'cancelled') return fail('Sale is already cancelled.');

        const now = new Date().toISOString();
        const productsWithRestoredBatches = state.products.map((p) => {
          const saleLines = sale.items.filter((i) => i.productId === p.id);
          if (saleLines.length === 0) return p;
          let updated = p;
          for (const saleLine of saleLines) {
            const restored = restoreBatchLots(
              updated,
              saleLine.batchBreakdown,
              saleLine.quantity,
              saleLine.batchNumber,
              saleLine.expiryDate
            );
            updated = {
              ...updated,
              ...restored,
              quantity: updated.quantity + saleLine.quantity,
            };
          }
          // Restore original pre-applyStockChanges quantity so applyStockChanges computes accurate StockMovement rows
          return { ...updated, quantity: p.quantity };
        });

        const restores = sale.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
        const stockResult = applyStockChanges(
          productsWithRestoredBatches,
          restores,
          'return',
          sale.orderId,
          `Cancelled sale ${sale.orderId} — medicine stock returned`,
          now
        );

        set({
          sales: state.sales.map((s) => (s.id === id ? { ...s, paymentStatus: 'cancelled' } : s)),
          products: stockResult.products,
          stockMovements: [...stockResult.movements, ...state.stockMovements],
          activityLogs: [
            activity('sale', 'Sale Cancelled', `${sale.orderId} cancelled — medicine inventory returned`, sale.id, now),
            ...state.activityLogs,
          ],
        });
        return { success: true, id };
      },

      updateSalePaymentStatus: (id, status) => {
        const state = get();
        const sale = state.sales.find((s) => s.id === id);
        if (!sale) return fail('Sale not found.');
        if (sale.paymentStatus === 'cancelled') return fail('Cannot update payment status of a cancelled sale.');
        set({
          sales: state.sales.map((s) => (s.id === id ? { ...s, paymentStatus: status } : s)),
        });
        return { success: true, id };
      },

      // ---------------------------------------------------------------
      // PURCHASE ORDERS
      // ---------------------------------------------------------------
      createPurchaseOrder: (input) => {
        const state = get();
        const supplier = state.suppliers.find((s) => s.id === input.supplierId);
        if (!supplier) return fail('Select a valid supplier.');

        const lineError = validateOrderLines(input.items);
        if (lineError) return fail(lineError);

        const now = new Date().toISOString();
        const orderId = generateOrderId('PO-', state.purchaseOrders.map((p) => p.orderId));
        const items: PurchaseItem[] = input.items.map((line) => {
          const product = state.products.find((p) => p.id === line.productId)!;
          return {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: line.quantity,
            receivedQuantity: 0,
            unitPrice: line.unitPrice,
            total: line.quantity * line.unitPrice,
            batchNumber: line.batchNumber || product.batchNumber,
            expiryDate: line.expiryDate || product.expiryDate,
          };
        });

        const po: PurchaseOrder = {
          id: generateId(),
          orderId,
          supplierId: supplier.id,
          supplierName: supplier.company || supplier.name,
          items,
          totalAmount: items.reduce((sum, i) => sum + i.total, 0),
          status: input.status,
          date: now,
          expectedDeliveryDate: input.expectedDeliveryDate,
          receivedDate: null,
          notes: input.notes.trim(),
          createdAt: now,
        };

        set({
          purchaseOrders: [po, ...state.purchaseOrders],
          activityLogs: [
            activity(
              'purchase',
              po.status === 'ordered' ? 'Purchase Order Placed' : 'Purchase Order Drafted',
              `${po.orderId} (${items.length} items) for ${po.supplierName}`,
              po.id,
              now
            ),
            ...state.activityLogs,
          ],
        });
        return { success: true, id: po.id };
      },

      markPurchaseOrdered: (id) => {
        const state = get();
        const po = state.purchaseOrders.find((p) => p.id === id);
        if (!po) return fail('Purchase order not found.');
        if (po.status !== 'draft') return fail(`Only draft purchase orders can be ordered (currently ${po.status}).`);

        const now = new Date().toISOString();
        set({
          purchaseOrders: state.purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'ordered' } : p)),
          activityLogs: [activity('purchase', 'Purchase Order Placed', `${po.orderId} placed with ${po.supplierName}`, po.id, now), ...state.activityLogs],
        });
        return { success: true, id };
      },

      receivePurchaseOrder: (id, quantities, batches) => {
        const state = get();
        const po = state.purchaseOrders.find((p) => p.id === id);
        if (!po) return fail('Purchase order not found.');
        if (po.status === 'draft') return fail('Draft purchase orders must be ordered before receiving.');
        if (po.status === 'received') return fail('This purchase order is already fully received.');

        const toReceive: { productId: string; quantity: number }[] = [];
        let anyReceived = false;

        for (const item of po.items) {
          const outstanding = item.quantity - item.receivedQuantity;
          const userQty = quantities ? quantities[item.productId] ?? 0 : outstanding;
          if (userQty < 0 || !Number.isInteger(userQty)) return fail('Received quantity must be a whole number zero or greater.');
          if (userQty > outstanding) {
            return fail(`Cannot receive ${userQty} of ${item.productName} — only ${outstanding} outstanding.`);
          }
          if (userQty > 0) {
            toReceive.push({ productId: item.productId, quantity: userQty });
            anyReceived = true;
          }
        }

        if (!anyReceived) return fail('Enter at least one item quantity to receive.');

        const now = new Date().toISOString();
        const updatedItems = po.items.map((item) => {
          const recvNow = quantities ? quantities[item.productId] ?? 0 : item.quantity - item.receivedQuantity;
          const newBatch = batches?.[item.productId];
          return {
            ...item,
            receivedQuantity: item.receivedQuantity + recvNow,
            batchNumber: newBatch?.batchNumber || item.batchNumber,
            expiryDate: newBatch?.expiryDate || item.expiryDate,
          };
        });

        const allDone = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
        const nextStatus: PurchaseStatus = allDone ? 'received' : 'partial';

        // Safely add received units to matching batch or create a new batch lot without overwriting existing stock batches
        const currentProducts = state.products.map((p) => {
          const recv = toReceive.find((r) => r.productId === p.id);
          if (!recv) return p;
          const b = batches?.[p.id];
          const poItem = po.items.find((i) => i.productId === p.id);
          const nextLot = addBatchLot(
            p,
            recv.quantity,
            b?.batchNumber || poItem?.batchNumber,
            b?.expiryDate || poItem?.expiryDate
          );
          return { ...p, ...nextLot };
        });

        const stockResult = applyStockChanges(
          currentProducts,
          toReceive,
          'purchase',
          po.orderId,
          `Stock received from ${po.supplierName}`,
          now
        );

        set({
          products: stockResult.products,
          purchaseOrders: state.purchaseOrders.map((p) =>
            p.id === id ? { ...p, items: updatedItems, status: nextStatus, receivedDate: allDone ? now : p.receivedDate } : p
          ),
          stockMovements: [...stockResult.movements, ...state.stockMovements],
          activityLogs: [
            activity(
              'purchase-received',
              allDone ? 'Purchase Order Fully Received' : 'Partial Stock Received',
              `${po.orderId}: received into inventory from ${po.supplierName}`,
              po.id,
              now
            ),
            ...state.activityLogs,
          ],
        });
        return { success: true, id: po.orderId };
      },

      // ---------------------------------------------------------------
      // PATIENTS (CUSTOMERS)
      // ---------------------------------------------------------------
      addCustomer: (input) => {
        const error = validateContact(input, true);
        if (error) return fail(error);
        const customer: Customer = {
          ...input,
          name: input.name.trim(),
          company: input.company || input.name.trim(),
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          customers: [...state.customers, customer],
          activityLogs: [
            activity('customer', 'Patient Registered', `${customer.name} registered in clinic directory`, customer.id),
            ...state.activityLogs,
          ],
        }));
        return { success: true, id: customer.id };
      },

      updateCustomer: (id, updates) => {
        const error = validateContact(updates, false);
        if (error) return fail(error);
        const state = get();
        const existing = state.customers.find((c) => c.id === id);
        if (!existing) return fail('Patient not found.');
        const updated = { ...existing, ...updates };
        const displayName = updated.name;
        set({
          customers: state.customers.map((c) => (c.id === id ? updated : c)),
          sales: state.sales.map((s) => (s.customerId === id ? { ...s, customerName: displayName } : s)),
          appointments: state.appointments.map((a) => (a.patientId === id ? { ...a, patientName: displayName } : a)),
        });
        return { success: true, id };
      },

      deleteCustomer: (id) => {
        const state = get();
        const customer = state.customers.find((c) => c.id === id);
        if (!customer) return fail('Patient not found.');
        if (state.sales.some((s) => s.customerId === id)) {
          return fail(`${customer.name} has sales/prescription history and cannot be deleted.`);
        }
        if (state.appointments.some((a) => a.patientId === id)) {
          return fail(`${customer.name} has scheduled clinic appointments and cannot be deleted.`);
        }
        set({ customers: state.customers.filter((c) => c.id !== id) });
        return { success: true };
      },

      // ---------------------------------------------------------------
      // SUPPLIERS
      // ---------------------------------------------------------------
      addSupplier: (input) => {
        const error = validateContact(input, true);
        if (error) return fail(error);
        const supplier: Supplier = {
          ...input,
          name: input.name.trim(),
          company: input.company || input.name.trim(),
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          suppliers: [...state.suppliers, supplier],
          activityLogs: [
            activity('supplier', 'Supplier Added', `${supplier.company} registered`, supplier.id),
            ...state.activityLogs,
          ],
        }));
        return { success: true, id: supplier.id };
      },

      updateSupplier: (id, updates) => {
        const error = validateContact(updates, false);
        if (error) return fail(error);
        const state = get();
        const existing = state.suppliers.find((c) => c.id === id);
        if (!existing) return fail('Supplier not found.');
        const updated = { ...existing, ...updates };
        const displayName = updated.company || updated.name;
        set({
          suppliers: state.suppliers.map((s) => (s.id === id ? updated : s)),
          purchaseOrders: state.purchaseOrders.map((p) => (p.supplierId === id ? { ...p, supplierName: displayName } : p)),
        });
        return { success: true, id };
      },

      deleteSupplier: (id) => {
        const state = get();
        const supplier = state.suppliers.find((s) => s.id === id);
        if (!supplier) return fail('Supplier not found.');
        if (state.purchaseOrders.some((p) => p.supplierId === id)) {
          return fail(`${supplier.company} has purchase orders and cannot be deleted.`);
        }
        set({ suppliers: state.suppliers.filter((s) => s.id !== id) });
        return { success: true };
      },

      // ---------------------------------------------------------------
      // APPOINTMENTS
      // ---------------------------------------------------------------
      addAppointment: (input) => {
        const state = get();
        const patient = state.customers.find((c) => c.id === input.patientId);
        if (!patient) return fail('Select a valid patient.');

        const conflict = state.appointments.some(
          (a) =>
            a.doctorName === input.doctorName &&
            a.date === input.date &&
            a.time === input.time &&
            a.status !== 'cancelled'
        );
        if (conflict) {
          return fail(`${input.doctorName} is already booked on ${input.date} at ${input.time}.`);
        }

        const now = new Date().toISOString();
        const appointmentId = generateOrderId('APT-', state.appointments.map((a) => a.appointmentId));
        const apt: Appointment = {
          ...input,
          id: generateId(),
          appointmentId,
          patientName: patient.name,
          createdAt: now,
        };

        set({
          appointments: [apt, ...state.appointments],
          activityLogs: [
            activity(
              'appointment',
              'Appointment Booked',
              `${apt.appointmentId}: ${patient.name} with ${apt.doctorName} at ${apt.time}`,
              apt.id,
              now
            ),
            ...state.activityLogs,
          ],
        });
        return { success: true, id: apt.id };
      },

      updateAppointment: (id, updates) => {
        const state = get();
        const apt = state.appointments.find((a) => a.id === id);
        if (!apt) return fail('Appointment not found.');

        const doctor = updates.doctorName || apt.doctorName;
        const date = updates.date || apt.date;
        const time = updates.time || apt.time;

        if (updates.status !== 'cancelled') {
          const conflict = state.appointments.some(
            (a) =>
              a.id !== id &&
              a.doctorName === doctor &&
              a.date === date &&
              a.time === time &&
              a.status !== 'cancelled'
          );
          if (conflict) {
            return fail(`${doctor} is already booked on ${date} at ${time}.`);
          }
        }

        set({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        });
        return { success: true, id };
      },

      cancelAppointment: (id) => {
        const state = get();
        const apt = state.appointments.find((a) => a.id === id);
        if (!apt) return fail('Appointment not found.');
        set({
          appointments: state.appointments.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)),
        });
        return { success: true, id };
      },

      // ---------------------------------------------------------------
      // SETTINGS & PROFILE
      // ---------------------------------------------------------------
      updateBusinessProfile: (profile) => set({ businessProfile: profile }),
      resetData: () => set(createSeedState()),
    }),
    {
      name: 'drstock-store-v1',
      version: STORE_VERSION,
      migrate: (persisted, version) => {
        if (version >= 4 && persisted && typeof persisted === 'object') {
          const prev = persisted as Partial<DataState>;
          if (Array.isArray(prev.products)) {
            return {
              ...createSeedState(),
              ...prev,
              products: prev.products.map((p) => ({
                ...p,
                batches: normalizeProductBatches(p),
              })),
            } as unknown as AppState;
          }
        }
        return createSeedState() as unknown as AppState;
      },
      partialize: (state): DataState => ({
        businessProfile: state.businessProfile,
        products: state.products,
        customers: state.customers,
        suppliers: state.suppliers,
        sales: state.sales,
        purchaseOrders: state.purchaseOrders,
        stockMovements: state.stockMovements,
        activityLogs: state.activityLogs,
        appointments: state.appointments,
      }),
    }
  )
);

// ---- Shared Selectors ----
export const selectLowStockProducts = (products: Product[]) =>
  products
    .filter((p) => p.quantity <= p.minimumStock)
    .sort((a, b) => a.quantity / Math.max(a.minimumStock, 1) - b.quantity / Math.max(b.minimumStock, 1));

export const selectNearExpiryProducts = (products: Product[], warningDays = 90) =>
  products.filter((p) => getExpiryStatus(p.expiryDate, warningDays) === 'near-expiry');

export const selectExpiredProducts = (products: Product[]) =>
  products.filter((p) => getExpiryStatus(p.expiryDate) === 'expired');

export const selectSellableQuantity = (product: Product) => availableSellableQuantity(product);

export const selectTodayAppointments = (appointments: Appointment[]) => {
  const today = new Date().toISOString().split('T')[0];
  return appointments
    .filter((a) => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
};
