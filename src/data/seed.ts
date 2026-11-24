// ============================================================
// DrStock — Healthcare Seed Data
// Fictional clinical and pharmaceutical sample data
// ============================================================

import {
  Product, Customer, Supplier, Sale, SaleItem, PurchaseOrder, PurchaseItem,
  StockMovement, ActivityLog, PaymentStatus, PurchaseStatus, BusinessProfile,
  Appointment,
} from '@/types';
import { roundMoney } from '@/lib/utils';

export const seedBusinessProfile: BusinessProfile = {
  businessName: 'Apex Healthcare & Clinic Pharmacy',
  tagline: 'Smart Inventory for Modern Healthcare',
  gstin: '24AAACP4567M1Z2',
  phone: '+91 98765 12345',
  email: 'care@apexhealthcare.in',
  address: 'Ground Floor, Mediplex Complex, Navrangpura, Ahmedabad, Gujarat - 380009',
  defaultGstPercent: 12, // Standard pharmaceutical GST
  expiryWarningDays: 90,
};

// ---- Date helpers ----
function daysAgo(days: number, hour = 11, minute = 0): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  if (d > now) return new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  return d.toISOString();
}

/** ISO date string for future dates (used for medicine expiries) */
function futureDays(days: number): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Past date string (used for expired medicines) */
function pastDate(days: number): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function thisMonth(days: number, hour = 11, minute = 0): string {
  return daysAgo(Math.min(days, Math.max(1, new Date().getDate() - 1)), hour, minute);
}

// ---- Medicines (30 Items across 8 healthcare categories) ----
type ProductDef = Omit<Product, 'createdAt'>;

const productDefs: ProductDef[] = [
  // Tablets
  { id: 'prod-001', sku: 'MED-001', name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Tablets', manufacturer: 'Sun Pharma', batchNumber: 'BATCH-24P01', expiryDate: futureDays(420), dosageForm: 'Tablet', description: 'Antipyretic and analgesic for fever and mild to moderate pain relief.', costPrice: 12, sellingPrice: 20, quantity: 120, minimumStock: 30, unit: 'Strip' },
  { id: 'prod-002', sku: 'MED-002', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin Trihydrate', category: 'Tablets', manufacturer: 'Cipla Ltd', batchNumber: 'BATCH-24A02', expiryDate: futureDays(310), dosageForm: 'Capsule', description: 'Broad-spectrum penicillin antibiotic for bacterial infections.', costPrice: 55, sellingPrice: 85, quantity: 45, minimumStock: 20, unit: 'Strip' },
  { id: 'prod-003', sku: 'MED-003', name: 'Azithromycin 250mg', genericName: 'Azithromycin Dihydrate', category: 'Tablets', manufacturer: 'Zydus Lifesciences', batchNumber: 'BATCH-24Z03', expiryDate: futureDays(240), dosageForm: 'Tablet', description: 'Macrolide antibiotic for respiratory tract and skin infections.', costPrice: 70, sellingPrice: 110, quantity: 28, minimumStock: 15, unit: 'Strip' },
  { id: 'prod-004', sku: 'MED-004', name: 'Cetirizine 10mg', genericName: 'Cetirizine Hydrochloride', category: 'Tablets', manufacturer: 'Alkem Laboratories', batchNumber: 'BATCH-24C04', expiryDate: futureDays(540), dosageForm: 'Tablet', description: 'Second-generation antihistamine for allergic rhinitis and urticaria.', costPrice: 15, sellingPrice: 28, quantity: 90, minimumStock: 25, unit: 'Strip' },
  { id: 'prod-005', sku: 'MED-005', name: 'Metformin 500mg', genericName: 'Metformin Hydrochloride', category: 'Tablets', manufacturer: 'Torrent Pharma', batchNumber: 'BATCH-23M05', expiryDate: futureDays(45), dosageForm: 'Tablet', description: 'First-line medication for type 2 diabetes management (Near Expiry).', costPrice: 22, sellingPrice: 38, quantity: 18, minimumStock: 25, unit: 'Strip' }, // Low Stock + Near Expiry
  { id: 'prod-006', sku: 'MED-006', name: 'Pantoprazole 40mg', genericName: 'Pantoprazole Sodium', category: 'Tablets', manufacturer: 'Lupin Pharmaceuticals', batchNumber: 'BATCH-24P06', expiryDate: futureDays(365), dosageForm: 'Tablet', description: 'Proton-pump inhibitor for acid reflux and gastroesophageal reflux.', costPrice: 48, sellingPrice: 75, quantity: 60, minimumStock: 20, unit: 'Strip' },
  { id: 'prod-007', sku: 'MED-007', name: 'Vitamin C 500mg Chewable', genericName: 'Ascorbic Acid', category: 'Tablets', manufacturer: 'Abbott Healthcare', batchNumber: 'BATCH-24V07', expiryDate: futureDays(480), dosageForm: 'Chewable Tablet', description: 'Essential immune booster and dietary antioxidant supplement.', costPrice: 25, sellingPrice: 42, quantity: 75, minimumStock: 20, unit: 'Strip' },
  { id: 'prod-008', sku: 'MED-008', name: 'Calcium + Vitamin D3', genericName: 'Calcium Carbonate + Cholecalciferol', category: 'Tablets', manufacturer: 'Mankind Pharma', batchNumber: 'BATCH-24C08', expiryDate: futureDays(330), dosageForm: 'Tablet', description: 'Bone mineral density and joint calcium supplementation.', costPrice: 65, sellingPrice: 105, quantity: 40, minimumStock: 15, unit: 'Strip' },

  // Capsules
  { id: 'prod-009', sku: 'MED-009', name: 'Omeprazole 20mg', genericName: 'Omeprazole Delayed-Release', category: 'Capsules', manufacturer: 'Dr. Reddy’s', batchNumber: 'BATCH-24O09', expiryDate: futureDays(270), dosageForm: 'Capsule', description: 'Reduces stomach acid for heartburn and peptic ulcer prevention.', costPrice: 35, sellingPrice: 58, quantity: 50, minimumStock: 20, unit: 'Strip' },
  { id: 'prod-010', sku: 'MED-010', name: 'Doxycycline 100mg', genericName: 'Doxycycline Hyclate', category: 'Capsules', manufacturer: 'Cadila Healthcare', batchNumber: 'BATCH-24D10', expiryDate: futureDays(450), dosageForm: 'Capsule', description: 'Tetracycline class antibiotic for bacterial acne and chest infections.', costPrice: 42, sellingPrice: 70, quantity: 32, minimumStock: 15, unit: 'Strip' },
  { id: 'prod-011', sku: 'MED-011', name: 'B-Complex with Zinc', genericName: 'Multivitamin & Mineral Capsule', category: 'Capsules', manufacturer: 'Pfizer India', batchNumber: 'BATCH-24B11', expiryDate: futureDays(600), dosageForm: 'Capsule', description: 'Therapeutic nutritional formulation for neuropathy and convalescence.', costPrice: 28, sellingPrice: 48, quantity: 65, minimumStock: 20, unit: 'Strip' },

  // Syrups
  { id: 'prod-012', sku: 'MED-012', name: 'Cough Relief Syrup 100ml', genericName: 'Dextromethorphan + Chlorpheniramine', category: 'Syrups', manufacturer: 'Dabur Pharma', batchNumber: 'BATCH-24S12', expiryDate: futureDays(420), dosageForm: 'Liquid Syrup', description: 'Fast-acting antitussive and decongestant for dry non-productive cough.', costPrice: 60, sellingPrice: 98, quantity: 24, minimumStock: 12, unit: 'Bottle' },
  { id: 'prod-013', sku: 'MED-013', name: 'Paracetamol Pediatric 60ml', genericName: 'Paracetamol 250mg/5ml', category: 'Syrups', manufacturer: 'GlaxoSmithKline', batchNumber: 'BATCH-24P13', expiryDate: futureDays(330), dosageForm: 'Oral Suspension', description: 'Pleasant strawberry-flavored pediatric fever reducer for infants and kids.', costPrice: 32, sellingPrice: 55, quantity: 30, minimumStock: 10, unit: 'Bottle' },
  { id: 'prod-014', sku: 'MED-014', name: 'Multivitamin Syrup 200ml', genericName: 'Zinc & Vitamin Complex Liquid', category: 'Syrups', manufacturer: 'Bayer Pharmaceuticals', batchNumber: 'BATCH-24M14', expiryDate: futureDays(60), dosageForm: 'Syrup', description: 'Appetite stimulant and daily energy tonic (Near Expiry).', costPrice: 85, sellingPrice: 135, quantity: 7, minimumStock: 12, unit: 'Bottle' }, // Low Stock + Near Expiry

  // Injections
  { id: 'prod-015', sku: 'MED-015', name: 'Insulin Glargine 100IU/ml', genericName: 'Insulin Glargine Recombinant', category: 'Injections', manufacturer: 'Biocon Biologics', batchNumber: 'BATCH-24I15', expiryDate: futureDays(210), dosageForm: 'Injectable Solution', description: 'Long-acting basal insulin analogue for glycemic control.', costPrice: 550, sellingPrice: 780, quantity: 4, minimumStock: 10, unit: 'Vial' }, // Low Stock
  { id: 'prod-016', sku: 'MED-016', name: 'Diclofenac Sodium 75mg/3ml', genericName: 'Diclofenac Sodium Injection', category: 'Injections', manufacturer: 'Novartis Healthcare', batchNumber: 'BATCH-24D16', expiryDate: futureDays(390), dosageForm: 'Ampoule', description: 'Potent nonsteroidal anti-inflammatory for acute trauma and surgical pain.', costPrice: 18, sellingPrice: 32, quantity: 35, minimumStock: 15, unit: 'Ampoule' },
  { id: 'prod-017', sku: 'MED-017', name: 'Tetanus Toxoid Vaccine 0.5ml', genericName: 'Adsorbed Tetanus Vaccine', category: 'Injections', manufacturer: 'Serum Institute of India', batchNumber: 'BATCH-24T17', expiryDate: futureDays(240), dosageForm: 'Pre-filled Syringe', description: 'Active immunization prophylaxis against Clostridium tetani infection.', costPrice: 22, sellingPrice: 40, quantity: 20, minimumStock: 10, unit: 'Ampoule' },

  // Drops
  { id: 'prod-018', sku: 'MED-018', name: 'Saline Nasal Drops 15ml', genericName: 'Sodium Chloride 0.65% w/v', category: 'Drops', manufacturer: 'Otrivin Healthcare', batchNumber: 'BATCH-24N18', expiryDate: futureDays(365), dosageForm: 'Nasal Drops', description: 'Gentle isotonic nasal saline wash for dry, crusty, or congested noses.', costPrice: 28, sellingPrice: 48, quantity: 22, minimumStock: 10, unit: 'Bottle' },
  { id: 'prod-019', sku: 'MED-019', name: 'Ciprofloxacin Eye Drops 10ml', genericName: 'Ciprofloxacin 0.3% w/v', category: 'Drops', manufacturer: 'Sun Pharma Eye Care', batchNumber: 'BATCH-24C19', expiryDate: futureDays(300), dosageForm: 'Ophthalmic Solution', description: 'Antibacterial solution for conjunctivitis and corneal ulcers.', costPrice: 35, sellingPrice: 60, quantity: 18, minimumStock: 10, unit: 'Bottle' },

  // Creams & Ointments
  { id: 'prod-020', sku: 'MED-020', name: 'Betadine 5% Ointment 20g', genericName: 'Povidone Iodine 5% w/w', category: 'Creams', manufacturer: 'Win-Medicare', batchNumber: 'BATCH-24B20', expiryDate: futureDays(540), dosageForm: 'Topical Ointment', description: 'Topical microbicidal ointment for cuts, abrasions, and superficial burns.', costPrice: 48, sellingPrice: 78, quantity: 25, minimumStock: 10, unit: 'Tube' },
  { id: 'prod-021', sku: 'MED-021', name: 'Diclofenac Pain Relief Gel 30g', genericName: 'Diclofenac Diethylamine + Linseed Oil', category: 'Creams', manufacturer: 'Volini Pharma', batchNumber: 'BATCH-24G21', expiryDate: futureDays(450), dosageForm: 'Gel', description: 'Deep penetrating transdermal gel for muscular sprains and arthritis.', costPrice: 62, sellingPrice: 99, quantity: 30, minimumStock: 12, unit: 'Tube' },
  { id: 'prod-022', sku: 'MED-022', name: 'Clotrimazole Cream 15g', genericName: 'Clotrimazole 1% w/w', category: 'Creams', manufacturer: 'Glenmark Pharmaceuticals', batchNumber: 'BATCH-23C22', expiryDate: pastDate(12), dosageForm: 'Cream', description: 'Antifungal cream for ringworm, athlete foot, and candidiasis (Expired).', costPrice: 38, sellingPrice: 65, quantity: 5, minimumStock: 10, unit: 'Tube' }, // Expired!

  // Homeopathy
  { id: 'prod-023', sku: 'MED-023', name: 'Arnica Montana 30C', genericName: 'Arnica Montana Dilution', category: 'Homeopathy', manufacturer: 'Dr. Reckeweg & Co', batchNumber: 'BATCH-24H23', expiryDate: futureDays(720), dosageForm: 'Liquid Dilution', potency: '30C', description: 'Homeopathic remedy for trauma, bruising, shock, and muscle soreness.', costPrice: 80, sellingPrice: 125, quantity: 15, minimumStock: 8, unit: 'Bottle' },
  { id: 'prod-024', sku: 'MED-024', name: 'Rhus Toxicodendron 30C', genericName: 'Rhus Tox Dilution', category: 'Homeopathy', manufacturer: 'SBL Homeopathy', batchNumber: 'BATCH-24H24', expiryDate: futureDays(720), dosageForm: 'Liquid Dilution', potency: '30C', description: 'Indicated for stiffness, joint pains aggravated by initial movement.', costPrice: 80, sellingPrice: 125, quantity: 12, minimumStock: 6, unit: 'Bottle' },
  { id: 'prod-025', sku: 'MED-025', name: 'Nux Vomica 200C', genericName: 'Nux Vomica Dilution', category: 'Homeopathy', manufacturer: 'Schwabe India', batchNumber: 'BATCH-24H25', expiryDate: futureDays(720), dosageForm: 'Liquid Dilution', potency: '200C', description: 'Digestive tonic for dyspepsia, acidity, and sedentary lifestyle effects.', costPrice: 85, sellingPrice: 130, quantity: 14, minimumStock: 6, unit: 'Bottle' },

  // Medical Supplies
  { id: 'prod-026', sku: 'MED-026', name: 'Digital Thermometer', genericName: 'Medical Diagnostic Tool', category: 'Medical Supplies', manufacturer: 'Omron Healthcare', batchNumber: 'BATCH-24M26', expiryDate: futureDays(1080), dosageForm: 'Device', description: 'Instant oral and axillary waterproof digital body temperature sensor.', costPrice: 140, sellingPrice: 240, quantity: 16, minimumStock: 8, unit: 'Piece' },
  { id: 'prod-027', sku: 'MED-027', name: 'Sterile Gauze Swabs 10x10cm', genericName: 'Hospital Grade Cotton Gauze', category: 'Medical Supplies', manufacturer: 'Datt Mediproducts', batchNumber: 'BATCH-24M27', expiryDate: futureDays(600), dosageForm: 'Dressing Pack', description: '100% bleached absorbent cotton 8-ply sterile surgical gauze pads.', costPrice: 30, sellingPrice: 52, quantity: 50, minimumStock: 20, unit: 'Pack' },
  { id: 'prod-028', sku: 'MED-028', name: 'Examination Gloves Latex 100s', genericName: 'Pre-powdered Disposable Gloves', category: 'Medical Supplies', manufacturer: 'Romsons Medical', batchNumber: 'BATCH-24M28', expiryDate: futureDays(720), dosageForm: 'Box', description: 'Ambidextrous non-sterile latex examination gloves, size Medium (Out of Stock).', costPrice: 280, sellingPrice: 420, quantity: 0, minimumStock: 5, unit: 'Box' }, // Out of Stock!
  { id: 'prod-029', sku: 'MED-029', name: 'ORS Electrolyte Sachets', genericName: 'Oral Rehydration Salts WHO Formula', category: 'Medical Supplies', manufacturer: 'FDC Limited', batchNumber: 'BATCH-24O29', expiryDate: futureDays(480), dosageForm: 'Powder Sachet', description: 'WHO recommended oral electrolyte rehydration formula for dehydration.', costPrice: 12, sellingPrice: 22, quantity: 150, minimumStock: 40, unit: 'Sachet' },
  { id: 'prod-030', sku: 'MED-030', name: 'BP Monitor Upper Arm', genericName: 'Digital Sphygmomanometer', category: 'Medical Supplies', manufacturer: 'Beurer Medical', batchNumber: 'BATCH-24B30', expiryDate: futureDays(1080), dosageForm: 'Device', description: 'Fully automatic blood pressure and pulse rate monitor with LCD display.', costPrice: 1150, sellingPrice: 1650, quantity: 6, minimumStock: 5, unit: 'Piece' },
];

// ---- Patients (Fictional Clinic Patients / Customers) ----
const customerDefs: Omit<Customer, 'createdAt'>[] = [
  { id: 'cust-001', name: 'Rajesh Trivedi', company: 'Rajesh Trivedi (Patient #P-101)', phone: '+91 98765 43210', email: 'rajesh.trivedi@gmail.com', address: 'B-402, Shivalik Heights, Navrangpura, Ahmedabad', age: 48, gender: 'Male', bloodGroup: 'O+', lastVisit: daysAgo(3, 10) },
  { id: 'cust-002', name: 'Sunita Sharma', company: 'Sunita Sharma (Patient #P-102)', phone: '+91 87654 32109', email: 'sunita.sharma@yahoo.com', address: '12, Sunrise Park, Gurukul Road, Ahmedabad', age: 34, gender: 'Female', bloodGroup: 'B+', lastVisit: daysAgo(5, 14) },
  { id: 'cust-003', name: 'Amit Patel', company: 'Amit Patel (Patient #P-103)', phone: '+91 76543 21098', email: 'amit.patel@outlook.com', address: '78, SG Highway, Thaltej, Ahmedabad', age: 52, gender: 'Male', bloodGroup: 'A+', lastVisit: daysAgo(8, 16) },
  { id: 'cust-004', name: 'Priya Desai', company: 'Priya Desai (Patient #P-104)', phone: '+91 65432 10987', email: 'priya.desai@gmail.com', address: '23, Satellite Road, Anandnagar, Ahmedabad', age: 29, gender: 'Female', bloodGroup: 'AB+', lastVisit: daysAgo(12, 11) },
  { id: 'cust-005', name: 'Vikram Chauhan', company: 'Vikram Chauhan (Patient #P-105)', phone: '+91 54321 09876', email: 'vikram.chauhan@gmail.com', address: '56, Paldi Bhatta, Ahmedabad', age: 61, gender: 'Male', bloodGroup: 'O-', lastVisit: daysAgo(18, 9) },
  { id: 'cust-006', name: 'Meena Vyas', company: 'Meena Vyas (Patient #P-106)', phone: '+91 94280 12345', email: 'meena.vyas@gmail.com', address: 'Flat 301, Nilkanth Flats, Naranpura, Ahmedabad', age: 42, gender: 'Female', bloodGroup: 'B-', lastVisit: daysAgo(25, 15) },
  { id: 'cust-007', name: 'Harish Joshi', company: 'Harish Joshi (Patient #P-107)', phone: '+91 98251 67890', email: 'harish.joshi@gmail.com', address: '45, Manekbaug Society, Ambawadi, Ahmedabad', age: 38, gender: 'Male', bloodGroup: 'A-', lastVisit: daysAgo(35, 17) },
  { id: 'cust-008', name: 'Anjali Nair', company: 'Anjali Nair (Patient #P-108)', phone: '+91 97123 45678', email: 'anjali.nair@gmail.com', address: '104, Green Acres, Prahladnagar, Ahmedabad', age: 26, gender: 'Female', bloodGroup: 'O+', lastVisit: daysAgo(42, 12) },
];

// ---- Suppliers (Medical Distributors & Pharmaceutical Wholesalers) ----
const supplierDefs: Omit<Supplier, 'createdAt'>[] = [
  { id: 'sup-001', name: 'Ramesh Patel', company: 'Sun Pharma Distribution Ltd', contactPerson: 'Ramesh Patel (Regional Lead)', phone: '+91 99887 11223', email: 'sales@sunpharmadist.in', address: '90, GIDC Pharma Hub, Changodar, Ahmedabad' },
  { id: 'sup-002', name: 'Dr. Rajiv Mehta', company: 'Cipla Healthcare Wholesalers', contactPerson: 'Dr. Rajiv Mehta', phone: '+91 88776 22334', email: 'supply@ciplahealth.in', address: '34, Medical Complex, Kalupur, Ahmedabad' },
  { id: 'sup-003', name: 'Nitin Desai', company: 'Apollo Medical & Surgical Supply', contactPerson: 'Nitin Desai', phone: '+91 77665 33445', email: 'orders@apollosurgical.in', address: '67, Naroda Industrial Estate, Ahmedabad' },
  { id: 'sup-004', name: 'Suresh Shah', company: 'Alkem Laboratories Logistics', contactPerson: 'Suresh Shah', phone: '+91 66554 44556', email: 'info@alkemdist.in', address: '12, Chemical Zone, Vatva, Ahmedabad' },
  { id: 'sup-005', name: 'Kiran Joshi', company: 'Hahnemann Homeo Care Depot', contactPerson: 'Kiran Joshi', phone: '+91 95432 55667', email: 'supply@hahnemannhomeo.in', address: '88, Heritage Square, Ashram Road, Ahmedabad' },
];

// ---- Events Ledger ----
type Line = [productId: string, quantity: number];

interface SaleDef {
  orderId: string;
  customerId: string;
  date: string;
  lines: Line[];
  gstPercent: number;
  status: PaymentStatus;
  paymentMethod?: 'Cash' | 'UPI' | 'Card';
  notes?: string;
  cancelledOn?: string;
}

interface PurchaseDef {
  orderId: string;
  supplierId: string;
  date: string;
  lines: Line[];
  status: PurchaseStatus;
  receivedOn?: string;
  receivedLines?: Line[];
  notes?: string;
}

interface AdjustmentDef {
  reference: string;
  productId: string;
  date: string;
  quantity: number;
  reason: string;
}

// 14 Sales events (spanning recent months up to this week)
const saleDefs: SaleDef[] = [
  { orderId: 'INV-1001', customerId: 'cust-001', date: daysAgo(150, 10, 30), lines: [['prod-001', 10], ['prod-004', 10]], gstPercent: 12, status: 'paid', paymentMethod: 'UPI', notes: 'Prescription refill' },
  { orderId: 'INV-1002', customerId: 'cust-002', date: daysAgo(135, 11), lines: [['prod-002', 5], ['prod-006', 5]], gstPercent: 12, status: 'paid', paymentMethod: 'Card', notes: 'General consultation prescription' },
  { orderId: 'INV-1003', customerId: 'cust-003', date: daysAgo(115, 14), lines: [['prod-005', 8], ['prod-008', 4]], gstPercent: 12, status: 'paid', paymentMethod: 'Cash', notes: 'Monthly diabetic care package' },
  { orderId: 'INV-1004', customerId: 'cust-004', date: daysAgo(98, 16), lines: [['prod-012', 3], ['prod-007', 5]], gstPercent: 12, status: 'paid', paymentMethod: 'UPI' },
  { orderId: 'INV-1005', customerId: 'cust-005', date: daysAgo(82, 10), lines: [['prod-016', 4], ['prod-021', 2]], gstPercent: 12, status: 'paid', paymentMethod: 'Card', notes: 'Ortho post-injury pack' },
  { orderId: 'INV-1006', customerId: 'cust-006', date: daysAgo(68, 12), lines: [['prod-003', 4], ['prod-018', 2]], gstPercent: 12, status: 'paid', paymentMethod: 'UPI' },
  { orderId: 'INV-1007', customerId: 'cust-007', date: daysAgo(52, 15), lines: [['prod-023', 2], ['prod-025', 2]], gstPercent: 12, status: 'paid', paymentMethod: 'Cash', notes: 'Homeopathy dosage pack' },
  { orderId: 'INV-1008', customerId: 'cust-008', date: daysAgo(38, 11), lines: [['prod-026', 1], ['prod-029', 10]], gstPercent: 12, status: 'paid', paymentMethod: 'UPI' },
  { orderId: 'INV-1009', customerId: 'cust-001', date: daysAgo(26, 14), lines: [['prod-015', 2], ['prod-009', 4]], gstPercent: 12, status: 'cancelled', paymentMethod: 'Card', notes: 'Patient cancelled — dosage altered by physician', cancelledOn: daysAgo(25, 17) },
  { orderId: 'INV-1010', customerId: 'cust-003', date: daysAgo(18, 10), lines: [['prod-010', 3], ['prod-011', 4]], gstPercent: 12, status: 'partial', paymentMethod: 'UPI', notes: 'Pending balance ₹150' },
  { orderId: 'INV-1011', customerId: 'cust-002', date: thisMonth(9, 10, 15), lines: [['prod-001', 8], ['prod-007', 6]], gstPercent: 12, status: 'paid', paymentMethod: 'Cash' },
  { orderId: 'INV-1012', customerId: 'cust-004', date: thisMonth(5, 12, 45), lines: [['prod-020', 2], ['prod-027', 4]], gstPercent: 12, status: 'pending', paymentMethod: 'UPI', notes: 'Wound dressing kit, billing invoice pending payment' },
  { orderId: 'INV-1013', customerId: 'cust-005', date: thisMonth(2, 15, 20), lines: [['prod-004', 5], ['prod-013', 2]], gstPercent: 12, status: 'partial', paymentMethod: 'Cash' },
  { orderId: 'INV-1014', customerId: 'cust-006', date: daysAgo(1, 16, 40), lines: [['prod-008', 3], ['prod-029', 8]], gstPercent: 12, status: 'paid', paymentMethod: 'UPI', notes: 'Routine medication pickup' },
];

// 8 Purchase orders (draft, ordered, partial, and received)
const purchaseDefs: PurchaseDef[] = [
  { orderId: 'PO-2001', supplierId: 'sup-001', date: daysAgo(140, 9), lines: [['prod-001', 50], ['prod-004', 40]], status: 'received', receivedOn: daysAgo(137, 14), notes: 'Batch received in good condition' },
  { orderId: 'PO-2002', supplierId: 'sup-002', date: daysAgo(110, 11), lines: [['prod-002', 25], ['prod-006', 30]], status: 'received', receivedOn: daysAgo(107, 16), notes: 'Antibiotics quarterly replenishment' },
  { orderId: 'PO-2003', supplierId: 'sup-003', date: daysAgo(85, 10), lines: [['prod-027', 40], ['prod-029', 80]], status: 'received', receivedOn: daysAgo(82, 15), notes: 'Emergency ward surgical goods' },
  { orderId: 'PO-2004', supplierId: 'sup-005', date: daysAgo(55, 14), lines: [['prod-023', 10], ['prod-024', 10]], status: 'received', receivedOn: daysAgo(52, 11), notes: 'German dilution batch imported' },
  { orderId: 'PO-2005', supplierId: 'sup-001', date: daysAgo(20, 10), lines: [['prod-005', 20], ['prod-015', 3]], status: 'received', receivedOn: daysAgo(18, 16), notes: 'Diabetic care replenishment' },
  { orderId: 'PO-2006', supplierId: 'sup-003', date: thisMonth(4, 11), lines: [['prod-028', 25], ['prod-030', 5]], status: 'ordered', notes: 'Scheduled for delivery next Monday' },
  { orderId: 'PO-2007', supplierId: 'sup-002', date: daysAgo(1, 14), lines: [['prod-014', 15], ['prod-003', 15]], status: 'draft', notes: 'Internal draft review by chief pharmacist' },
  { orderId: 'PO-2008', supplierId: 'sup-004', date: daysAgo(8, 11), lines: [['prod-009', 20], ['prod-010', 20]], status: 'partial', receivedOn: daysAgo(6, 15), receivedLines: [['prod-009', 10], ['prod-010', 10]], notes: 'First half delivered; balance in transit' },
];

// Stock audit adjustments
const adjustmentDefs: AdjustmentDef[] = [
  { reference: 'ADJ-101', productId: 'prod-001', date: daysAgo(75, 17), quantity: -2, reason: 'Damaged packaging during transit' },
  { reference: 'ADJ-102', productId: 'prod-029', date: daysAgo(40, 16), quantity: 15, reason: 'Annual physical audit count surplus' },
  { reference: 'ADJ-103', productId: 'prod-022', date: daysAgo(10, 10), quantity: -3, reason: 'Quarantined expired stock batch' },
];

// Clinic Appointments (10 Appointments)
export const seedAppointments: Appointment[] = [
  { id: 'apt-001', appointmentId: 'APT-101', patientId: 'cust-001', patientName: 'Rajesh Trivedi', doctorName: 'Dr. Ananya Rao', department: 'General Medicine', date: futureDays(0), time: '10:00 AM', visitType: 'Consultation', status: 'completed', notes: 'Blood pressure check and diabetic medication review.', createdAt: daysAgo(2) },
  { id: 'apt-002', appointmentId: 'APT-102', patientId: 'cust-002', patientName: 'Sunita Sharma', doctorName: 'Dr. Vikram Mehta', department: 'Pediatrics & Family Medicine', date: futureDays(0), time: '11:30 AM', visitType: 'Follow-up', status: 'waiting', notes: 'Child seasonal viral fever recovery checkup.', createdAt: daysAgo(1) },
  { id: 'apt-003', appointmentId: 'APT-103', patientId: 'cust-004', patientName: 'Priya Desai', doctorName: 'Dr. Ananya Rao', department: 'General Medicine', date: futureDays(0), time: '02:00 PM', visitType: 'Routine Checkup', status: 'scheduled', notes: 'Post-op wound healing evaluation.', createdAt: daysAgo(3) },
  { id: 'apt-004', appointmentId: 'APT-104', patientId: 'cust-003', patientName: 'Amit Patel', doctorName: 'Dr. Vikram Mehta', department: 'Pediatrics & Family Medicine', date: futureDays(0), time: '04:30 PM', visitType: 'Consultation', status: 'scheduled', notes: 'Allergy screening and dietary consultation.', createdAt: daysAgo(1) },
  { id: 'apt-005', appointmentId: 'APT-105', patientId: 'cust-005', patientName: 'Vikram Chauhan', doctorName: 'Dr. Ananya Rao', department: 'General Medicine', date: futureDays(1), time: '10:30 AM', visitType: 'Consultation', status: 'scheduled', notes: 'Geriatric joint mobility consultation.', createdAt: daysAgo(2) },
  { id: 'apt-006', appointmentId: 'APT-106', patientId: 'cust-006', patientName: 'Meena Vyas', doctorName: 'Dr. Vikram Mehta', department: 'Pediatrics & Family Medicine', date: futureDays(1), time: '01:00 PM', visitType: 'Routine Checkup', status: 'scheduled', notes: 'Annual wellness check.', createdAt: daysAgo(4) },
  { id: 'apt-007', appointmentId: 'APT-107', patientId: 'cust-007', patientName: 'Harish Joshi', doctorName: 'Dr. Ananya Rao', department: 'General Medicine', date: futureDays(2), time: '11:00 AM', visitType: 'Follow-up', status: 'scheduled', notes: 'ECG and lipid profile discussion.', createdAt: daysAgo(2) },
  { id: 'apt-008', appointmentId: 'APT-108', patientId: 'cust-008', patientName: 'Anjali Nair', doctorName: 'Dr. Vikram Mehta', department: 'Pediatrics & Family Medicine', date: futureDays(3), time: '03:30 PM', visitType: 'Consultation', status: 'scheduled', notes: 'Migraine and chronic headache evaluation.', createdAt: daysAgo(1) },
  { id: 'apt-009', appointmentId: 'APT-109', patientId: 'cust-001', patientName: 'Rajesh Trivedi', doctorName: 'Dr. Ananya Rao', department: 'General Medicine', date: daysAgo(7).split('T')[0], time: '10:00 AM', visitType: 'Consultation', status: 'completed', notes: 'Initial intake and blood sample requisition.', createdAt: daysAgo(9) },
  { id: 'apt-010', appointmentId: 'APT-110', patientId: 'cust-003', patientName: 'Amit Patel', doctorName: 'Dr. Vikram Mehta', department: 'Pediatrics & Family Medicine', date: daysAgo(14).split('T')[0], time: '02:30 PM', visitType: 'Consultation', status: 'cancelled', notes: 'Patient had travel conflict.', createdAt: daysAgo(16) },
];

// ---- Build models & reconcile stock movements ----
const OPENING_DATE = daysAgo(180, 9);
const productById = new Map<string, ProductDef>(productDefs.map((p) => [p.id, p]));
const customerById = new Map<string, Omit<Customer, 'createdAt'>>(customerDefs.map((c) => [c.id, c]));
const supplierById = new Map<string, Omit<Supplier, 'createdAt'>>(supplierDefs.map((s) => [s.id, s]));

function product(id: string): ProductDef {
  const p = productById.get(id);
  if (!p) throw new Error(`Unknown product ${id}`);
  return p;
}

function buildSale(def: SaleDef, index: number): Sale {
  const items: SaleItem[] = def.lines.map(([productId, quantity]) => {
    const p = product(productId);
    return {
      productId,
      productName: p.name,
      sku: p.sku,
      batchNumber: p.batchNumber,
      expiryDate: p.expiryDate,
      quantity,
      unitPrice: p.sellingPrice,
      total: quantity * p.sellingPrice,
    };
  });
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const gstAmount = roundMoney((subtotal * def.gstPercent) / 100);
  const customer = customerById.get(def.customerId)!;
  return {
    id: `sale-${String(index + 1).padStart(3, '0')}`,
    orderId: def.orderId,
    customerId: def.customerId,
    customerName: customer.name,
    items,
    subtotal,
    gstPercent: def.gstPercent,
    gstAmount,
    grandTotal: roundMoney(subtotal + gstAmount),
    paymentStatus: def.status,
    paymentMethod: def.paymentMethod ?? 'UPI',
    date: def.date,
    notes: def.notes ?? '',
    createdAt: def.date,
  };
}

function buildPurchase(def: PurchaseDef, index: number): PurchaseOrder {
  const recvMap = new Map(def.receivedLines ?? []);
  const items: PurchaseItem[] = def.lines.map(([productId, quantity]) => {
    const p = product(productId);
    const receivedQuantity =
      def.status === 'received' ? quantity : def.status === 'partial' ? (recvMap.get(productId) ?? 0) : 0;
    return {
      productId,
      productName: p.name,
      sku: p.sku,
      quantity,
      receivedQuantity,
      unitPrice: p.costPrice,
      total: quantity * p.costPrice,
      batchNumber: p.batchNumber,
      expiryDate: p.expiryDate,
    };
  });
  const supplier = supplierById.get(def.supplierId)!;
  return {
    id: `po-${String(index + 1).padStart(3, '0')}`,
    orderId: def.orderId,
    supplierId: def.supplierId,
    supplierName: supplier.company,
    items,
    totalAmount: items.reduce((sum, i) => sum + i.total, 0),
    status: def.status,
    date: def.date,
    receivedDate: def.receivedOn ?? null,
    notes: def.notes ?? '',
    createdAt: def.date,
  };
}

export const seedProducts: Product[] = productDefs.map((p) => ({
  ...p,
  batches:
    p.quantity > 0
      ? [{ batchNumber: p.batchNumber || 'UNASSIGNED', expiryDate: p.expiryDate, quantity: p.quantity }]
      : [],
  createdAt: OPENING_DATE,
}));
export const seedCustomers: Customer[] = customerDefs.map((c, i) => ({ ...c, createdAt: daysAgo(190 - i * 3, 10) }));
export const seedSuppliers: Supplier[] = supplierDefs.map((s, i) => ({ ...s, createdAt: daysAgo(200 - i * 3, 10) }));
export const seedSales: Sale[] = saleDefs.map(buildSale);
export const seedPurchaseOrders: PurchaseOrder[] = purchaseDefs.map(buildPurchase);

// ---- Stock ledger reconciliation ----
interface LedgerEvent {
  date: string;
  productId: string;
  movementType: StockMovement['movementType'];
  quantity: number;
  reference: string;
  notes: string;
}

function buildLedgerEvents(): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  for (const sale of seedSales) {
    const def = saleDefs.find((d) => d.orderId === sale.orderId)!;
    for (const item of sale.items) {
      events.push({
        date: sale.date,
        productId: item.productId,
        movementType: 'sale',
        quantity: -item.quantity,
        reference: sale.orderId,
        notes: `Prescription sale to ${sale.customerName}`,
      });
      if (def.cancelledOn) {
        events.push({
          date: def.cancelledOn,
          productId: item.productId,
          movementType: 'return',
          quantity: item.quantity,
          reference: sale.orderId,
          notes: `Cancelled prescription ${sale.orderId} — medicine stock returned`,
        });
      }
    }
  }
  for (const po of seedPurchaseOrders) {
    if ((po.status !== 'received' && po.status !== 'partial') || !po.receivedDate) continue;
    for (const item of po.items) {
      if (item.receivedQuantity <= 0) continue;
      events.push({
        date: po.receivedDate,
        productId: item.productId,
        movementType: 'purchase',
        quantity: item.receivedQuantity,
        reference: po.orderId,
        notes: `Received stock from ${po.supplierName}`,
      });
    }
  }
  for (const adj of adjustmentDefs) {
    events.push({
      date: adj.date,
      productId: adj.productId,
      movementType: 'adjustment',
      quantity: adj.quantity,
      reference: adj.reference,
      notes: adj.reason,
    });
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

function buildStockMovements(): StockMovement[] {
  const events = buildLedgerEvents();
  const movements: StockMovement[] = [];
  let seq = 0;
  const push = (e: LedgerEvent, previousStock: number) => {
    const p = product(e.productId);
    seq += 1;
    movements.push({
      id: `sm-${String(seq).padStart(3, '0')}`,
      date: e.date,
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      movementType: e.movementType,
      quantity: e.quantity,
      previousStock,
      newStock: previousStock + e.quantity,
      reference: e.reference,
      notes: e.notes,
    });
  };

  const netChanges = new Map<string, number>();
  for (const e of events) {
    netChanges.set(e.productId, (netChanges.get(e.productId) ?? 0) + e.quantity);
  }

  const currentStock = new Map<string, number>();
  for (const p of productDefs) {
    const change = netChanges.get(p.id) ?? 0;
    const opening = p.quantity - change;
    if (opening < 0) {
      throw new Error(`Seed data invalid: ${p.sku} would need a negative opening stock (${opening}) to reach current ${p.quantity}.`);
    }
    currentStock.set(p.id, opening);
    push(
      { date: OPENING_DATE, productId: p.id, movementType: 'adjustment', quantity: opening, reference: 'OPENING', notes: 'Initial inventory intake' },
      0
    );
  }

  for (const e of events) {
    const prev = currentStock.get(e.productId) ?? 0;
    push(e, prev);
    currentStock.set(e.productId, prev + e.quantity);
  }

  return movements;
}

export const seedStockMovements: StockMovement[] = buildStockMovements();

// ---- Activity logs ----
export const seedActivityLogs: ActivityLog[] = [
  { id: 'act-001', date: daysAgo(0, 10, 15), type: 'sale', title: 'Sale Completed', description: 'INV-1014: ₹298.00 billed to Meena Vyas (UPI)', referenceId: 'sale-014' },
  { id: 'act-002', date: daysAgo(0, 9, 30), type: 'appointment', title: 'Appointment Completed', description: 'Rajesh Trivedi completed consultation with Dr. Ananya Rao', referenceId: 'apt-001' },
  { id: 'act-003', date: daysAgo(1, 14, 0), type: 'purchase', title: 'Purchase Order Drafted', description: 'PO-2007 drafted with Cipla Healthcare Wholesalers', referenceId: 'po-007' },
  { id: 'act-004', date: daysAgo(2, 15, 20), type: 'sale', title: 'Sale Completed', description: 'INV-1013: Cetirizine 10mg billed to Vikram Chauhan', referenceId: 'sale-013' },
  { id: 'act-005', date: daysAgo(4, 11, 0), type: 'purchase', title: 'Purchase Order Placed', description: 'PO-2006 placed with Apollo Medical & Surgical Supply', referenceId: 'po-006' },
  { id: 'act-006', date: daysAgo(10, 10, 0), type: 'stock-adjustment', title: 'Stock Quarantined', description: 'Clotrimazole Cream expired batch quarantined (-3 units)', referenceId: 'prod-022' },
  { id: 'act-007', date: daysAgo(18, 16, 0), type: 'purchase-received', title: 'Stock Received', description: 'PO-2005 received into inventory from Sun Pharma Distribution Ltd', referenceId: 'po-005' },
  { id: 'act-008', date: daysAgo(25, 17, 0), type: 'sale', title: 'Prescription Cancelled', description: 'INV-1009 cancelled — medicine stock returned to inventory', referenceId: 'sale-009' },
];

export function createSeedState() {
  return {
    businessProfile: seedBusinessProfile,
    products: seedProducts,
    customers: seedCustomers,
    suppliers: seedSuppliers,
    sales: seedSales,
    purchaseOrders: seedPurchaseOrders,
    stockMovements: seedStockMovements,
    activityLogs: seedActivityLogs,
    appointments: seedAppointments,
  };
}
