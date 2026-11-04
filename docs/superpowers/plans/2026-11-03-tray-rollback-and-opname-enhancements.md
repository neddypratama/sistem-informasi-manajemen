# Tray Opname Rollback & Inventory Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rollback the massive tray opnames safely without breaking any downstream transactions to restore the Tray Asset report from -Rp 1.3B to positive, enhance Stok Opname with custom HPP input capability, and add the monthly monitoring tab with KPI metrics (bentes, ceplok, kotor, jumbo, tray).

**Architecture:** 
1. Database rollback script executed inside a Prisma transaction for the 6+1 tray opname records and their corresponding journal entries, ensuring no other transactions are disturbed.
2. Backend NestJS `inventory.service.ts` update: add `customHpp` support to `CreateOpnameDto` and `createOpname`.
3. Frontend `StokOpnamePage.tsx` update:
   - Allow user to input/edit HPP in the Stok Opname form (especially when base HPP is 0).
   - Add new tab "📊 Monitoring & Rekap Bulanan Susut" with filters, KPI summary cards, and aggregation tables matching legacy export metrics.
4. Laporan Aset audit verification to confirm positive tray inventory value.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, MySQL, React, Tailwind CSS, Lucide Icons, TanStack Query.

---

## Tasks

### Task 1: Safe Rollback of Tray Opnames in Database
**Files:**
- Create: `backend/scripts/execute_rollback_tray_opnames.cjs`
- Target Database: `bimapratama_v2`

**Interfaces:**
- Consumes: Opname IDs [6403, 6404, 6409, 6411, 6412, 6415, 6416]
- Produces: Clean rollback with journals deleted and no foreign key / downstream constraint errors.

- [ ] **Step 1: Write execution script with safety verification**
  - Verify that no transactions after 05:00 on 2026-11-03 depend on these opnames.
  - Delete `jurnal_details` for the opname journals.
  - Delete `jurnal_umums` for the opname journals.
  - Delete `stok_opnames` for the 7 tray opnames.
  - Verify `stok_batches` for these 7 barangs remain intact and match ground truth.
- [ ] **Step 2: Run rollback script within database transaction**
- [ ] **Step 3: Verify Laporan Aset Tray (Kat 62) is positive (+Rp 100M+)**

---

### Task 2: Backend Support for Custom HPP in Stok Opname
**Files:**
- Modify: `backend/src/modules/inventory/dto/create-opname.dto.ts` (or `inventory.service.ts`)
- Modify: `backend/src/modules/inventory/inventory.service.ts`

**Interfaces:**
- Consumes: `customHpp?: number` in payload
- Produces: Batch created with `hargaBeli = customHpp` if provided; journals calculated with `customHpp`.

- [ ] **Step 1: Add `customHpp?: number` to `CreateOpnameDto`**
- [ ] **Step 2: Update `inventory.service.ts` to respect `customHpp` if provided (> 0)**
  - If `dto.customHpp && Number(dto.customHpp) > 0`, use `dto.customHpp` as `hpp`.
  - Batch newly created will use `hargaBeli: hpp`.
  - Jurnal will calculate debit/kredit using `hpp`.
- [ ] **Step 3: Build backend and verify type checks pass (`npm run build --prefix backend`)**

---

### Task 3: Frontend Custom HPP Input in Stok Opname Form
**Files:**
- Modify: `frontend/src/features/inventory/StokOpnamePage.tsx`

**Interfaces:**
- Consumes: `currentHPP` and user custom input
- Produces: Editable HPP input field when creating opname, required if current HPP = 0.

- [ ] **Step 1: Add state `formCustomHpp` to `StokOpnamePage.tsx`**
- [ ] **Step 2: Render input "Harga Satuan / HPP Modal (Rp)"**
  - Prefilled with `currentHPP` if > 0.
  - If `currentHPP === 0`, show warning badge "Belum ada HPP dasar — Silakan isi taksiran HPP modal agar nilai rupiah persediaan terbentuk".
- [ ] **Step 3: Pass `customHpp` in payload to `createOpnameMutation`**

---

### Task 4: Frontend Monitoring & Rekap Bulanan Susut Tab
**Files:**
- Modify: `frontend/src/features/inventory/StokOpnamePage.tsx`

**Interfaces:**
- Consumes: `opnameHistoryResponse` / opnames list
- Produces: Tab 3 "📊 Monitoring & Rekap Bulanan Susut" with KPI cards & rekap table.

- [ ] **Step 1: Add Tab navigation item "📊 Monitoring Susut"**
- [ ] **Step 2: Calculate aggregate metrics for selected date range**
  - Total Bentes (Kg/Btr & Rp)
  - Total Ceplok (Kg/Btr & Rp)
  - Total Kotor (Kg)
  - Total Prok & Jumbo (Kg)
  - Total Pemakaian Tray (Ikat & Rp)
  - Total Pakan/Obat Rusak (Kg & Rp)
  - Grand Total Beban Selisih/Susut (Rp)
- [ ] **Step 3: Render KPI Cards & Aggregated Table per barang**
- [ ] **Step 4: Add Excel export button for monthly opname rekap**

---

### Task 5: Verification & End-to-End Test
- [ ] **Step 1: Verify backend build & restart daemon**
- [ ] **Step 2: Verify frontend build (`npm run build --prefix frontend`)**
- [ ] **Step 3: Check Laporan Aset endpoint `/reports/aset` to ensure positive figures**
- [ ] **Step 4: Verify UI in browser**
