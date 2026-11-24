# DrStock — Healthcare Inventory Management

**Smart Inventory for Modern Healthcare.**

DrStock is a clean, lightweight healthcare inventory, billing, procurement, and clinic operations web application built for clinics, pharmacies, and medical suppliers. Engineered as a polished technical assessment using Next.js 16 App Router, Tailwind CSS v4, TypeScript (strict mode), Zustand, React Hook Form, Zod, Recharts, and Vitest.

> **Demo Workspace Notice:** All records in this application are fictional and persisted locally in your browser's `localStorage`. No backend server, database, authentication, or environment variables are required. It is not intended for storing real Protected Health Information (PHI) or clinical diagnosis records.

---

## Key Design & Engineering Highlights

- **Light-First Clinical SaaS UI:** Crisp white navigation shell (`#FFFFFF`), `#F6F8FA` workspace canvas, clinical deep teal (`#0F766E`) primary accent, tabular numeric typography (`Inter`), and subtle `1px` borders (`#E4E7EC`).
- **Smart Enterprise `DataTable`:** Reusable typed table system (`DataTable`, `DataTableToolbar`, `DataTablePagination`) across all tabular views and reports featuring sticky headers, sortable columns, responsive mobile card layouts, mobile filter drawers, persisted page sizing (`10 / 20 / 50 / 100`, default `10`), and full-dataset CSV exports.
- **Lot-Level Batch Tracking & FEFO Deduction:** Receiving purchase orders appends new `(batchNumber, expiryDate)` lots without overwriting existing inventory batches. Sales deduct strictly from non-expired stock in First-Expired-First-Out (FEFO) order and restore exact lots on invoice cancellation.
- **Responsive Architecture (`320px`–`1920px`):** Integrated mobile sidebar drawer, responsive header breadcrumbs and `Ctrl/⌘ + K` command search, bottom-sheet modals on narrow screens, and zero global horizontal overflow.

---

## Core Modules & Features

| Module | Description |
| --- | --- |
| **Dashboard (`/dashboard`)** | Real-time healthcare KPIs (total medicines, stock valuation, sales revenue, purchase spend, low-stock count), 6-month Sales vs Purchases chart, category stock breakdown, low-stock & near-expiry alert tables with 1-click **Reorder**, today's appointments preview, and live activity timeline. |
| **Medicine Inventory (`/inventory`)** | 30+ seeded medicines across 8 medical categories (*Tablets, Capsules, Syrups, Injections, Drops, Creams, Homeopathy, Medical Supplies*). Tracks lot-level batches, expiry dates, purchase/selling prices, minimum levels, stock/expiry status badges, audit adjustments, slide-over batch & ledger drawer, and CSV export. |
| **Sales & Billing (`/sales`)** | Patient dispensing workflow: Patient selection → Live non-expired sellable stock check → FEFO deduction preview → GST calculation → Payment method (*UPI / Cash / Card*) & status (*Paid / Pending / Partial*) → Printable Tax Invoice (`window.print()`) → Sale cancellation with atomic stock restoration. |
| **Purchase Orders (`/purchases`)** | End-to-end procurement cycle: *Draft → Ordered → Partially Received / Received*. Supports partial deliveries and recording new Batch # & Expiry dates per receipt without overwriting existing batches. Blocks over-receiving and duplicate receipt processing. |
| **Stock History (`/stock-history`)** | Immutable chronological stock movement ledger showing previous → new stock balances, movement types (*Purchase, Sale, Adjustment, Return*), reference IDs, date range filtering, pagination, and audit notes. |
| **Reports (`/reports`)** | Tabbed analytics for **Stock Valuation**, **Sales & Revenue**, and **Purchase Procurement** with Recharts visualizations, full-dataset summary metrics, paginated report tables, print-ready layout, and full filtered CSV exports. |
| **Patients & Appointments (`/patients`, `/appointments`)** | Patient directory linked to dispensing invoices and visits, plus a paginated clinic schedule with automatic doctor time-slot conflict prevention. |
| **Suppliers (`/suppliers`)** | Medical distributor directory linked directly to purchase order history. |
| **Settings & Help (`/settings`, `/help`)** | Editable clinic/pharmacy profile, default GST slab, near-expiry alert window, full JSON backup export, safe demo reset, and a 7-step reviewer testing guide. |

---

## Connected Business Rules

1. **Ledger-Driven Inventory:** Medicine stock quantities cannot be arbitrarily overwritten from product edit forms. Every stock change flows through `applyStockChanges()` and writes an immutable `StockMovement`.
2. **Purchase Separation:** Creating a Purchase Order (`draft` or `ordered`) never inflates stock. Inventory increases only when items are received via `receivePurchaseOrder()`, supporting partial deliveries.
3. **Non-Overwriting Multi-Batch Storage & FEFO:** Incoming purchase batches append as distinct `BatchLot` entries; expired lots are excluded from sellable stock (`availableSellableQuantity`) and sales deduct valid batches in FEFO order.
4. **Atomic Sale Cancellation:** Cancelling an invoice restores deducted batch quantities back into inventory exactly once via a `return` movement.
5. **Pagination Accuracy:** Summary metrics, KPI cards, charts, and CSV exports always reflect the **entire filtered dataset** before pagination slicing.
6. **Referential Integrity:** Medicines, patients, and suppliers referenced by active orders or appointments cannot be deleted.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5 (Strict mode, zero explicit `any`)
- **Styling:** Tailwind CSS v4 (CSS custom properties with `@theme inline`)
- **State & Persistence:** Zustand 5 with `persist` middleware (`localStorage`)
- **Forms & Validation:** React Hook Form + Zod
- **Charts:** Recharts
- **Icons:** Lucide React
- **Testing:** Vitest

---

## Architecture Overview

```text
src/
├── app/                   # Next.js App Router pages (Dashboard, Inventory, Sales, Purchases, etc.)
├── components/
│   ├── layout/            # White Sidebar, SidebarContext, TopHeader, GlobalSearch (Ctrl+K), AppLayout
│   ├── ui/                # Reusable DataTable, DataTableToolbar, DataTablePagination, StatCard, Modal, Drawer
│   ├── orders/            # Shared LineItemsEditor with live sellable stock & duplicate-line validation
│   ├── inventory/         # ProductFormModal, ProductDetailModal (Drawer + Batch Breakdown), StockAdjustmentModal
│   ├── sales/             # SaleFormModal (2-step billing), SaleDetailModal (Printable Invoice)
│   ├── purchases/         # PurchaseFormModal, PurchaseDetailModal, ReceivePurchaseModal (Batch/Expiry)
│   ├── contacts/          # ContactDirectory & ContactFormModal shared by Patients & Suppliers
│   └── reports/           # StockReport, SalesReport, PurchaseReport & Recharts visualizations
├── store/
│   ├── index.ts           # Centralized Zustand store with batch/FEFO rules, migration & selectors
│   └── store.test.ts      # Vitest integration tests covering pharmacy, billing, PO & conflict rules
├── data/seed.ts           # Deterministic, mathematically reconciled healthcare seed dataset
├── lib/
│   ├── batches.ts         # Batch lot normalization, FEFO deduction, restoration & tests
│   ├── pagination.ts      # Pure pagination helpers, persisted usePagination hook & tests
│   ├── orders.ts          # Order validation & line aggregation helpers
│   └── utils.ts           # Currency (en-IN ₹), date range filters, time-bucketing & CSV export
└── types/index.ts         # Strict TypeScript domain models & status calculators
```

---

## Local Development

Requires Node.js 20+.

```bash
git clone https://github.com/shanigaj/DrStock.git
cd DrStock
npm install
npm run dev          # Starts local dev server at http://localhost:3000
```

### Verification Commands

```bash
npm run typecheck    # TypeScript strict check
npm run lint         # ESLint check
npm test             # Run Vitest unit & integration suite
npm run build        # Build production bundle
```

---

## Reviewer Demo Walkthrough

1. **Review Dashboard Metrics:** Open `/dashboard` to inspect totals, Recharts monthly trends, low-stock & expiry tables, and today's appointments.
2. **Receive a Purchase:** Go to **Purchase Orders**, select `PO-2006` (*Ordered*), and click **Receive** with a batch number and expiry to add stock without overwriting existing lots.
3. **Inspect Batch Breakdown:** Open **Medicine Inventory**, click a medicine name to inspect its batch breakdown drawer, filter by status/expiry, or run **Adjust Stock**.
4. **Complete a Sale (FEFO):** Use **Quick Create → New Sale**, dispense medicines, verify FEFO deduction and printable invoice, or cancel to verify stock return.
5. **Test Expired Medicine Block:** Try selecting `Clotrimazole Cream` (expired batch) in a new sale and observe dispensing validation blocking expired stock.
6. **Inspect Paginated Reports:** Visit **Reports** across Stock, Sales, and Purchase tabs, switch page sizes (`10 / 20 / 50 / 100`), and export filtered CSVs.
7. **Clinic Directory & Settings:** Explore **Patients**, **Appointments**, **Suppliers**, and **Clinic Settings** (`localStorage` JSON backup and workspace reset).

---

## Live Demo & Deployment

- **GitHub Repository:** https://github.com/shanigaj/DrStock
- **Deploy to Vercel:** Import the repository in Vercel using the default Next.js preset (`npm run build`) and deploy cleanly with zero environment variables (`No Login` / client-side `localStorage` persistence).
