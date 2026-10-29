# Bima Pratama ERP 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a high-performance modern ERP system (React 19 SPA + NestJS 11 + PostgreSQL/MySQL 8 + Redis) for Bima Pratama, modernizing the legacy Laravel Livewire system (`SIM_Bima_Pratama`), eliminating triple-invoicing with Double-Entry General Ledger, migrating 1 year of production data from `bimaprat_sim2.sql`, and architecting for 5–10 years of scale.

**Architecture:** Decoupled client-server architecture with React 19 SPA on the frontend (TanStack Table + Virtualization + Zustand) and NestJS 11 on the backend (Clean Modular Architecture, Prisma ORM, Atomic FIFO concurrency engine, Redis cache & BullMQ background export).

**Tech Stack:** React 19, TypeScript 5, Vite, Tailwind CSS, Shadcn UI, TanStack Query/Table, NestJS 11, Prisma ORM, PostgreSQL 16 (or MySQL 8), Redis 7, BullMQ, Docker Compose.

**Spec:** [README.md](file:///c:/laragon/www/erp-bimapratama/README.md), [design.md](file:///c:/laragon/www/erp-bimapratama/design.md), [data.md](file:///c:/laragon/www/erp-bimapratama/data.md), [model_card.md](file:///c:/laragon/www/erp-bimapratama/model_card.md), [api_docs.md](file:///c:/laragon/www/erp-bimapratama/api_docs.md), [deployment.md](file:///c:/laragon/www/erp-bimapratama/deployment.md), [migration_plan.md](file:///c:/laragon/www/erp-bimapratama/migration_plan.md).

## Global Constraints

- Backend must use NestJS 11+ and Node.js 22 LTS with strict TypeScript typing (`noImplicitAny: true`).
- Frontend must be a React 19 SPA using Vite, Tailwind CSS, and TanStack Table v8.
- Zero data loss during migration of the 241,000-line `bimaprat_sim2.sql` dump.
- In financial and stock reporting, eliminate all unindexed full table scans; all date range queries must use indexed bounding boxes (`BETWEEN ? AND ?`), not `DATE(tanggal)`.
- Transaction status updates to `SELESAI` must execute atomically within a database transaction, allocating FIFO batches with row-level locks.
- Eliminate triple-invoicing: One sales transaction must result in 1 `transaksis` record + `detail_transaksis` + balanced double-entry `jurnal_details`.

## Review Focus

1. **FIFO Concurrency & Stock Depletion:** Simultaneous sales transactions for the same batch must never oversell (`qty_sisa >= 0` database constraint) or cause deadlocks.
2. **Invoice Normalization Accuracy:** Merging `INV-...-BON`, `INV-...-TLR`, and `INV-...-HPP` into unified transactions must preserve exact historical totals down to 0 Rupiah discrepancy.
3. **Double-Entry Balance Invariant:** Every posted journal must satisfy $\sum \text{Debit} = \sum \text{Kredit}$.
4. **Sub-second Reporting on Large Datasets:** Laporan Laba Rugi and Neraca must return in < 50ms using indexed ledger and monthly balance snapshots.
5. **Memory Leak Prevention on Virtualized Grids:** Data tables displaying 10,000+ transaction rows must maintain constant DOM node count via virtual scrolling.

---

## Tasks

### Task 1: Backend Scaffolding & Environment Setup
**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/nest-cli.json`
- Create: `backend/.env.example`
- Create: `backend/src/main.ts`
- Create: `backend/src/app.module.ts`
- Create: `backend/src/common/filters/http-exception.filter.ts`
- Create: `backend/src/common/interceptors/transform-response.interceptor.ts`
- Test: `backend/test/app.e2e-spec.ts`

- [x] Initialize NestJS project structure in `backend/` with Fastify or Express adapter.
- [x] Install dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/config`, `class-validator`, `class-transformer`, `ioredis`.
- [x] Configure global validation pipe with whitelist and transform enabled.
- [x] Configure global HTTP exception filter and response transformation interceptor returning `{ success, message, data, meta }`.
- [x] Write e2e test verifying health check endpoint `/api/v1/health`.
- [x] Run test and verify it passes.

---

### Task 2: Database Schema & Prisma ORM Modeling
**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/database/prisma.service.ts`
- Create: `backend/src/database/prisma.module.ts`
- Test: `backend/src/database/prisma.service.spec.ts`

- [x] Install `@prisma/client` and `prisma` CLI.
- [x] Define normalized Prisma schema matching `data.md`:
  - Enums: `ClientType`, `TransaksiType`, `TransaksiStatus`, `PaymentMethod`, `CoaType`.
  - Models: `Role`, `User`, `JenisBarang`, `Satuan`, `Barang`, `Client`, `Transaksi`, `DetailTransaksi`, `StokBatch`, `StokKeluarBatch`, `ChartOfAccount`, `JurnalUmum`, `JurnalDetail`, `MonthlyAccountBalance`.
- [x] Configure composite indexes on `Transaksi(tanggal, status, type)`, `StokBatch(barangId, qtySisa, tanggal)`, `JurnalUmum(tanggal)`.
- [x] Generate Prisma Client and implement `PrismaService` with connection lifecycle hooks.
- [x] Write integration test verifying database connection and model operations.

---

### Task 3: Legacy Data ETL & Migration Script (`bimaprat_sim2.sql`)
**Files:**
- Create: `backend/src/scripts/migrate-legacy.ts`
- Create: `backend/src/scripts/verify-migration.ts`
- Test: `backend/src/scripts/migrate-legacy.spec.ts`

- [x] Write ETL pipeline to parse and import `bimaprat_sim2.sql` tables:
  - Migrate `roles` and `users` (preserving passwords and IDs).
  - Migrate `jenis_barangs`, `satuans`, and `barangs`.
  - Migrate `clients` with calculated initial balances.
  - Setup standard Chart of Accounts (COA) for Aset, Liabilitas, Ekuitas, Pendapatan, HPP, Beban.
- [x] Implement invoice deduplication engine:
  - Group triplet invoices (`INV-...-BON`, `INV-...-TLR`, `INV-...-HPP`) into a single master `Transaksi` and `DetailTransaksi`.
  - Create corresponding `JurnalUmum` and `JurnalDetail` entries.
- [x] Migrate `stok_batches` and `stok_keluar_batches`.
- [x] Generate initial `MonthlyAccountBalance` snapshots for each historical month.
- [x] Run verification script to confirm zero discrepancy in total sales, AR (piutang), and AP (hutang) between legacy dump and new database.

---

### Task 4: Authentication, RBAC, and User Management Module
**Files:**
- Create: `backend/src/modules/auth/auth.module.ts`
- Create: `backend/src/modules/auth/auth.service.ts`
- Create: `backend/src/modules/auth/auth.controller.ts`
- Create: `backend/src/modules/auth/jwt.strategy.ts`
- Create: `backend/src/common/guards/jwt-auth.guard.ts`
- Create: `backend/src/common/guards/roles.guard.ts`
- Create: `backend/src/common/decorators/roles.decorator.ts`
- Test: `backend/src/modules/auth/auth.service.spec.ts`

- [x] Implement JWT token issuance (Access Token + Refresh Token).
- [x] Implement password verification with bcrypt.
- [x] Implement `@Roles(...)` decorator and `RolesGuard` matching legacy roles (Admin, Kasir, Pembelian, Akuntansi, etc.).
- [x] Write unit tests for login success, invalid credentials, and role authorization.
- [x] Run tests and verify they pass.

---

### Task 5: Master Data Module (Barang, Jenis, Satuan, Client)
**Files:**
- Create: `backend/src/modules/master/master.module.ts`
- Create: `backend/src/modules/master/controllers/barang.controller.ts`
- Create: `backend/src/modules/master/controllers/client.controller.ts`
- Create: `backend/src/modules/master/services/barang.service.ts`
- Create: `backend/src/modules/master/services/client.service.ts`
- Create: `backend/src/modules/master/dto/*.dto.ts`
- Test: `backend/src/modules/master/barang.service.spec.ts`

- [x] Implement CRUD for `Barang` with category and unit relations, search query, and Redis caching.
- [x] Implement CRUD for `Client` (Pedagang, Peternak, Supplier) with live balance summaries.
- [x] Write unit and integration tests for pagination, search, and validation.
- [x] Run tests and verify they pass.

---

### Task 6: Inventory & Atomic FIFO Engine Module
**Files:**
- Create: `backend/src/modules/inventory/inventory.module.ts`
- Create: `backend/src/modules/inventory/fifo.service.ts`
- Create: `backend/src/modules/inventory/inventory.service.ts`
- Create: `backend/src/modules/inventory/inventory.controller.ts`
- Test: `backend/src/modules/inventory/fifo.service.spec.ts`

- [x] Implement `allocateFifoStock` within database transactions with `SELECT ... FOR UPDATE` ordering by `tanggal ASC, id ASC`.
- [x] Implement egg condition tracking (bentes, kotor, ceplok, jumbo, utuh).
- [x] Implement Stock Opname endpoint for physical stock reconciliation.
- [x] Write concurrency tests verifying that concurrent requests allocate without race condition or negative stock.
- [x] Run tests and verify they pass.

---

### Task 7: Transaction Processing & Ledger Posting Engine
**Files:**
- Create: `backend/src/modules/transaksi/transaksi.module.ts`
- Create: `backend/src/modules/transaksi/transaksi.service.ts`
- Create: `backend/src/modules/transaksi/transaksi.controller.ts`
- Create: `backend/src/modules/transaksi/dto/create-transaksi.dto.ts`
- Test: `backend/src/modules/transaksi/transaksi.service.spec.ts`

- [x] Implement sales transaction (`POST /api/v1/transaksi/penjualan`):
  - Validates items and available stock.
  - Executes FIFO batch allocation.
  - Creates single `Transaksi` + `DetailTransaksi`.
  - Automatically posts balanced journal entries to `JurnalUmum` and `JurnalDetail`.
  - Updates client AR (Piutang) balance.
- [x] Implement purchase transaction (`POST /api/v1/transaksi/pembelian`):
  - Creates new batch in `StokBatch`.
  - Posts AP (Hutang) journal entries.
- [x] Implement returns and transaction status transitions (`DRAFT` -> `SELESAI` -> `BATAL`).
- [x] Write integration test verifying complete sales flow and journal balance invariant $\sum \text{Debit} = \sum \text{Kredit}$.
- [x] Run tests and verify they pass.

---

### Task 8: Finance, Piutang & Hutang Settlement Module
**Files:**
- Create: `backend/src/modules/keuangan/keuangan.module.ts`
- Create: `backend/src/modules/keuangan/keuangan.service.ts`
- Create: `backend/src/modules/keuangan/keuangan.controller.ts`
- Test: `backend/src/modules/keuangan/keuangan.service.spec.ts`

- [x] Implement cash & bank mutation recording (Kas Tunai, Transfer Bank, Kas Deby).
- [x] Implement Pelunasan Bon Piutang Pedagang with automatic journal posting and client balance reduction.
- [x] Implement Pelunasan Hutang Peternak/Supplier.
- [x] Write unit tests for debt/receivable settlements.
- [x] Run tests and verify they pass.

---

### Task 9: Financial Reporting Engine & Async Export Queue
**Files:**
- Create: `backend/src/modules/reports/reports.module.ts`
- Create: `backend/src/modules/reports/reports.service.ts`
- Create: `backend/src/modules/reports/reports.controller.ts`
- Create: `backend/src/modules/reports/excel-export.consumer.ts`
- Test: `backend/src/modules/reports/reports.service.spec.ts`

- [x] Implement Laba Rugi endpoint reading indexed journals by date range.
- [x] Implement Neraca Saldo and Laporan Aset reading `monthly_account_balances` + current month ledger.
- [x] Implement BullMQ job queue for asynchronous streaming Excel generation (`exceljs`).
- [x] Write tests verifying report totals and execution speed (< 50ms).
- [x] Run tests and verify they pass.

---

### Task 10: Frontend Scaffolding (React 19 + Vite + Tailwind + TanStack)
**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/stores/auth.store.ts`
- Test: `frontend/src/App.test.tsx`

- [x] Initialize React 19 + Vite TypeScript project in `frontend/`.
- [x] Install Tailwind CSS, Lucide React, Shadcn UI components (Button, Input, Dialog, Table, Badge).
- [x] Configure TanStack Query v5 and Zustand auth store.
- [x] Setup Axios client with Bearer token injection and 401 interceptor refresh flow.
- [x] Write smoke test for root component.
- [x] Run test and verify it passes.

---

### Task 11: Frontend Feature Modules (Master, POS Transaksi, Inventory, Laporan)
**Files:**
- Create: `frontend/src/features/auth/LoginPage.tsx`
- Create: `frontend/src/features/dashboard/DashboardPage.tsx`
- Create: `frontend/src/features/master/BarangPage.tsx`
- Create: `frontend/src/features/master/ClientPage.tsx`
- Create: `frontend/src/features/transaksi/PenjualanPage.tsx`
- Create: `frontend/src/features/transaksi/PembelianPage.tsx`
- Create: `frontend/src/features/inventory/StokTelurPage.tsx`
- Create: `frontend/src/features/keuangan/PiutangPage.tsx`
- Create: `frontend/src/features/reports/LabaRugiPage.tsx`
- Create: `frontend/src/features/reports/NeracaPage.tsx`
- Create: `frontend/src/components/shared/VirtualizedDataTable.tsx`

- [x] Build virtualized data table component using TanStack Table v8 + `@tanstack/react-virtual`.
- [x] Implement POS Kasir Penjualan Telur with real-time FIFO HPP preview, grading breakdown, and client search.
- [x] Implement Pembelian, Retur, and Stock Opname interfaces.
- [x] Implement Piutang Bon & Pelunasan interface with invoice picker.
- [x] Implement Financial Reports viewer (Laba Rugi, Neraca, Aset) with instant date filter and async Excel export button with progress toast.

---

### Task 12: Docker Containerization & Final Production Verification
**Files:**
- Create: `docker/docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `docker/nginx.conf`
- Create: `docker/postgres.conf`
- Create: `scripts/backup.sh`

- [x] Build production multi-stage Dockerfiles for backend and frontend.
- [x] Configure Nginx reverse proxy with SSL, Gzip, and static asset caching.
- [x] Verify `docker compose up` starts all services (Postgres, Redis, API, Worker, Web, Nginx) cleanly.
- [x] Run full end-to-end integration test from transaction creation to report generation.
