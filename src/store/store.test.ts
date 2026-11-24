import { beforeEach, describe, expect, it } from 'vitest';
import {
  useStore,
  selectLowStockProducts,
  selectNearExpiryProducts,
  selectExpiredProducts,
} from '@/store';
import { createSeedState } from '@/data/seed';
import { getStockStatus, getExpiryStatus } from '@/types';

const s = () => useStore.getState();
const med = (sku: string) => s().products.find((p) => p.sku === sku)!;
const movementsFor = (ref: string) => s().stockMovements.filter((m) => m.reference === ref);
const PATIENT = 'cust-001';
const SUPPLIER = 'sup-001';

beforeEach(() => s().resetData());

describe('seed data reconciliation', () => {
  it('stock ledger reconciles with every medicine quantity', () => {
    const { products, stockMovements } = createSeedState();
    for (const p of products) {
      const chain = stockMovements.filter((m) => m.productId === p.id).sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 0; i < chain.length; i++) {
        expect(chain[i].previousStock + chain[i].quantity).toBe(chain[i].newStock);
        if (i > 0) expect(chain[i].previousStock).toBe(chain[i - 1].newStock);
      }
      expect(chain.at(-1)?.newStock ?? 0).toBe(p.quantity);
    }
  });

  it('every non-cancelled sale line and received PO line has a stock movement', () => {
    const { sales, purchaseOrders, stockMovements } = createSeedState();
    for (const sale of sales) {
      for (const item of sale.items) {
        expect(
          stockMovements.some((m) => m.reference === sale.orderId && m.productId === item.productId && m.movementType === 'sale')
        ).toBe(true);
      }
    }
    for (const po of purchaseOrders) {
      const moves = stockMovements.filter((m) => m.reference === po.orderId);
      const expectedCount =
        po.status === 'received' || po.status === 'partial'
          ? po.items.filter((i) => i.receivedQuantity > 0).length
          : 0;
      expect(moves.length).toBe(expectedCount);
    }
  });

  it('includes valid, near-expiry, expired, low-stock and out-of-stock medicines', () => {
    expect(med('MED-001').quantity).toBe(120); // Healthy stock
    expect(med('MED-028').quantity).toBe(0); // Out of stock
    expect(selectLowStockProducts(s().products).length).toBeGreaterThan(0);
    expect(selectNearExpiryProducts(s().products).length).toBeGreaterThan(0);
    expect(selectExpiredProducts(s().products).some((p) => p.sku === 'MED-022')).toBe(true);
  });
});

describe('sales & dispensing workflows', () => {
  it('deducts stock, calculates GST totals, records ledger movement and activity log', () => {
    const para = med('MED-001'); // Qty 120, selling 20
    const salesBefore = s().sales.length;
    const result = s().createSale({
      customerId: PATIENT,
      items: [{ productId: para.id, quantity: 5, unitPrice: 20 }],
      gstPercent: 12,
      paymentStatus: 'paid',
      paymentMethod: 'UPI',
      notes: 'Fever prescription',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(med('MED-001').quantity).toBe(115);
    expect(s().sales).toHaveLength(salesBefore + 1);

    const sale = s().sales.find((x) => x.id === result.id)!;
    expect(sale.subtotal).toBe(100);
    expect(sale.gstAmount).toBe(12);
    expect(sale.grandTotal).toBe(112);

    const [move] = movementsFor(sale.orderId);
    expect(move).toMatchObject({ movementType: 'sale', quantity: -5, previousStock: 120, newStock: 115 });
    expect(s().activityLogs[0].referenceId).toBe(sale.id);
  });

  it('blocks selling expired medicine batches', () => {
    const expiredMed = med('MED-022'); // Clotrimazole Cream expired
    expect(getExpiryStatus(expiredMed.expiryDate)).toBe('expired');
    const result = s().createSale({
      customerId: PATIENT,
      items: [{ productId: expiredMed.id, quantity: 1, unitPrice: 65 }],
      gstPercent: 12,
      paymentStatus: 'paid',
      notes: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('expired');
    }
    expect(med('MED-022').quantity).toBe(5);
  });

  it('blocks selling more than available stock', () => {
    const insulin = med('MED-015'); // Qty 4
    const result = s().createSale({
      customerId: PATIENT,
      items: [{ productId: insulin.id, quantity: 10, unitPrice: 780 }],
      gstPercent: 12,
      paymentStatus: 'paid',
      notes: '',
    });
    expect(result).toEqual({ success: false, error: expect.stringContaining('Insufficient stock') });
    expect(med('MED-015').quantity).toBe(4);
  });

  it('rejects duplicate medicine lines that together exceed stock', () => {
    const para = med('MED-001');
    const lines = [
      { productId: para.id, quantity: 80, unitPrice: 20 },
      { productId: para.id, quantity: 80, unitPrice: 20 },
    ];
    expect(s().createSale({ customerId: PATIENT, items: lines, gstPercent: 12, paymentStatus: 'paid', notes: '' }).success).toBe(false);
    expect(med('MED-001').quantity).toBe(120);
  });

  it('cancelling a sale restores stock exactly once', () => {
    const para = med('MED-001');
    const res = s().createSale({
      customerId: PATIENT,
      items: [{ productId: para.id, quantity: 10, unitPrice: 20 }],
      gstPercent: 12,
      paymentStatus: 'pending',
      notes: '',
    });
    expect(res.success).toBe(true);
    if (!res.success) return;

    const sale = s().sales.find((x) => x.id === res.id)!;
    expect(med('MED-001').quantity).toBe(110);
    expect(s().cancelSale(sale.id).success).toBe(true);
    expect(med('MED-001').quantity).toBe(120);
    expect(s().cancelSale(sale.id).success).toBe(false);
    expect(med('MED-001').quantity).toBe(120);
    expect(movementsFor(sale.orderId).map((m) => m.movementType).sort()).toEqual(['return', 'sale']);
  });
});

describe('purchase orders & receiving workflows', () => {
  it('creating a PO does not increase stock; receiving adds stock and updates batch/expiry', () => {
    const gloves = med('MED-028'); // Qty 0
    const res = s().createPurchaseOrder({
      supplierId: SUPPLIER,
      items: [{ productId: gloves.id, quantity: 20, unitPrice: 280 }],
      status: 'ordered',
      notes: 'Urgent replenishment',
    });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(med('MED-028').quantity).toBe(0);

    const po = s().purchaseOrders.find((p) => p.id === res.id)!;
    const recv = s().receivePurchaseOrder(
      po.id,
      { [gloves.id]: 20 },
      { [gloves.id]: { batchNumber: 'BATCH-NEW99', expiryDate: '2028-12-31' } }
    );
    expect(recv.success).toBe(true);
    expect(med('MED-028').quantity).toBe(20);
    expect(med('MED-028').batchNumber).toBe('BATCH-NEW99');
    expect(movementsFor(po.orderId)).toHaveLength(1);
    expect(movementsFor(po.orderId)[0]).toMatchObject({ movementType: 'purchase', quantity: 20, previousStock: 0, newStock: 20 });

    // Prevent double receiving
    expect(s().receivePurchaseOrder(po.id).success).toBe(false);
    expect(med('MED-028').quantity).toBe(20);
  });

  it('supports partial receipts and prevents over-receiving', () => {
    const insulin = med('MED-015'); // Qty 4
    const res = s().createPurchaseOrder({
      supplierId: SUPPLIER,
      items: [{ productId: insulin.id, quantity: 10, unitPrice: 550 }],
      status: 'ordered',
      notes: '',
    });
    if (!res.success) return;
    const po = s().purchaseOrders.find((p) => p.id === res.id)!;

    expect(s().receivePurchaseOrder(po.id, { [insulin.id]: 4 }).success).toBe(true);
    expect(s().purchaseOrders.find((p) => p.id === res.id)!.status).toBe('partial');
    expect(med('MED-015').quantity).toBe(8);

    // Over-receiving rejected
    expect(s().receivePurchaseOrder(po.id, { [insulin.id]: 7 }).success).toBe(false);

    // Remaining 6 received
    expect(s().receivePurchaseOrder(po.id).success).toBe(true);
    expect(s().purchaseOrders.find((p) => p.id === res.id)!.status).toBe('received');
    expect(med('MED-015').quantity).toBe(14);
  });

  it('draft POs must be ordered before receiving', () => {
    const para = med('MED-001');
    const res = s().createPurchaseOrder({
      supplierId: SUPPLIER,
      items: [{ productId: para.id, quantity: 15, unitPrice: 12 }],
      status: 'draft',
      notes: '',
    });
    if (!res.success) return;
    const po = s().purchaseOrders.find((p) => p.id === res.id)!;

    expect(s().receivePurchaseOrder(po.id).success).toBe(false);
    expect(s().markPurchaseOrdered(po.id).success).toBe(true);
    expect(s().receivePurchaseOrder(po.id).success).toBe(true);
    expect(med('MED-001').quantity).toBe(135);
  });
});

describe('stock adjustments & alerts', () => {
  it('reducing below minimum triggers low-stock alert and writes ledger entry', () => {
    const para = med('MED-001'); // Qty 120, Min 30
    expect(selectLowStockProducts(s().products).some((p) => p.id === para.id)).toBe(false);
    const result = s().adjustStock(para.id, -95, 'Hospital ward bulk issue');
    expect(result.success).toBe(true);
    expect(med('MED-001').quantity).toBe(25);
    expect(getStockStatus(25, para.minimumStock)).toBe('low-stock');
    expect(selectLowStockProducts(s().products).some((p) => p.id === para.id)).toBe(true);
  });

  it('requires an audit reason and prevents negative stock', () => {
    const insulin = med('MED-015'); // Qty 4
    expect(s().adjustStock(insulin.id, -1, '  ').success).toBe(false);
    expect(s().adjustStock(insulin.id, -5, 'Broken vials').success).toBe(false);
    expect(med('MED-015').quantity).toBe(4);
  });

  it('editing a medicine cannot bypass ledger to alter quantity', () => {
    const para = med('MED-001');
    s().updateProduct(para.id, { name: 'Paracetamol IP 500mg', quantity: 999 } as never);
    expect(med('MED-001')).toMatchObject({ name: 'Paracetamol IP 500mg', quantity: 120 });
  });
});

describe('appointments & referential integrity', () => {
  it('books appointments and prevents conflicting doctor time slots', () => {
    const res1 = s().addAppointment({
      patientId: PATIENT,
      patientName: 'Rajesh Trivedi',
      doctorName: 'Dr. Ananya Rao',
      department: 'General Medicine',
      date: '2026-12-01',
      time: '10:00 AM',
      visitType: 'Consultation',
      status: 'scheduled',
    });
    expect(res1.success).toBe(true);

    // Same doctor, date, time conflict
    const res2 = s().addAppointment({
      patientId: 'cust-002',
      patientName: 'Sunita Sharma',
      doctorName: 'Dr. Ananya Rao',
      department: 'General Medicine',
      date: '2026-12-01',
      time: '10:00 AM',
      visitType: 'Follow-up',
      status: 'scheduled',
    });
    expect(res2.success).toBe(false);
    if (!res2.success) {
      expect(res2.error).toContain('already booked');
    }
  });

  it('blocks deleting referenced patients, suppliers, and medicines', () => {
    expect(s().deleteCustomer(PATIENT).success).toBe(false);
    expect(s().deleteSupplier(SUPPLIER).success).toBe(false);
    expect(s().deleteProduct(med('MED-001').id).success).toBe(false);
  });
});

describe('multi-batch receiving, FEFO deduction, and duplicate line-item validation', () => {
  it('appends a new received batch without overwriting existing stock batches', () => {
    const para = med('MED-001'); // Qty 120
    const origBatch = para.batchNumber;
    const origExpiry = para.expiryDate;

    const poRes = s().createPurchaseOrder({
      supplierId: SUPPLIER,
      items: [{ productId: para.id, quantity: 30, unitPrice: para.costPrice }],
      status: 'ordered',
      notes: 'Second batch replenishment',
    });
    expect(poRes.success).toBe(true);
    if (!poRes.success) return;

    const recv = s().receivePurchaseOrder(
      poRes.id!,
      { [para.id]: 30 },
      { [para.id]: { batchNumber: 'PARA-NEXT99', expiryDate: '2029-08-31' } }
    );
    expect(recv.success).toBe(true);

    const updated = med('MED-001');
    expect(updated.quantity).toBe(150);
    expect(updated.batches).toHaveLength(2);
    expect(updated.batches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchNumber: origBatch, expiryDate: origExpiry, quantity: 120 }),
        expect.objectContaining({ batchNumber: 'PARA-NEXT99', expiryDate: '2029-08-31', quantity: 30 }),
      ])
    );
  });

  it('excludes expired batches from sale while deducting valid batches in FEFO order and restoring on cancel', () => {
    const added = s().addProduct({
      sku: 'MED-TEST-FEFO',
      name: 'Test Cefixime 200mg',
      category: 'Tablets',
      batchNumber: 'LOT-OLD-EXP',
      expiryDate: '2020-01-15',
      description: 'Test product',
      costPrice: 30,
      sellingPrice: 50,
      quantity: 5,
      minimumStock: 4,
      unit: 'Strip',
    });
    expect(added.success).toBe(true);

    const testProd = med('MED-TEST-FEFO');
    const poRes = s().createPurchaseOrder({
      supplierId: SUPPLIER,
      items: [{ productId: testProd.id, quantity: 10, unitPrice: 30 }],
      status: 'ordered',
      notes: 'Fresh batch delivery',
    });
    expect(poRes.success).toBe(true);
    if (!poRes.success) return;

    const recv = s().receivePurchaseOrder(
      poRes.id!,
      { [testProd.id]: 10 },
      { [testProd.id]: { batchNumber: 'LOT-FRESH', expiryDate: '2029-12-31' } }
    );
    expect(recv.success).toBe(true);
    expect(med('MED-TEST-FEFO').quantity).toBe(15);

    // Selling 11 fails because 5 units are expired (only 10 sellable)
    const overSell = s().createSale({
      customerId: PATIENT,
      items: [{ productId: testProd.id, quantity: 11, unitPrice: 50 }],
      gstPercent: 12,
      paymentStatus: 'paid',
      notes: 'Attempt over sellable qty',
    });
    expect(overSell.success).toBe(false);

    // Selling 6 deducts from LOT-FRESH cleanly
    const validSell = s().createSale({
      customerId: PATIENT,
      items: [{ productId: testProd.id, quantity: 6, unitPrice: 50 }],
      gstPercent: 12,
      paymentStatus: 'paid',
      notes: 'Valid FEFO dispense',
    });
    expect(validSell.success).toBe(true);
    if (!validSell.success) return;

    const afterSale = med('MED-TEST-FEFO');
    expect(afterSale.quantity).toBe(9);
    expect(afterSale.batches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchNumber: 'LOT-OLD-EXP', quantity: 5 }),
        expect.objectContaining({ batchNumber: 'LOT-FRESH', quantity: 4 }),
      ])
    );

    // Cancelling restores LOT-FRESH back to 10
    expect(s().cancelSale(validSell.id!).success).toBe(true);
    const afterCancel = med('MED-TEST-FEFO');
    expect(afterCancel.quantity).toBe(15);
    expect(afterCancel.batches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ batchNumber: 'LOT-OLD-EXP', quantity: 5 }),
        expect.objectContaining({ batchNumber: 'LOT-FRESH', quantity: 10 }),
      ])
    );
  });

  it('rejects duplicate sale line items whose combined quantity exceeds available stock', () => {
    const insulin = med('MED-015'); // Qty 4
    const res = s().createSale({
      customerId: PATIENT,
      items: [
        { productId: insulin.id, quantity: 3, unitPrice: insulin.sellingPrice },
        { productId: insulin.id, quantity: 3, unitPrice: insulin.sellingPrice },
      ],
      gstPercent: 5,
      paymentStatus: 'paid',
      notes: 'Duplicate lines exceeding stock',
    });
    expect(res.success).toBe(false);
    expect(med('MED-015').quantity).toBe(4);
  });
});
