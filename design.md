# Sistem Desain & Arsitektur Teknis (Design.md)
## Bima Pratama ERP 2.0 (NestJS + React + PostgreSQL/MySQL + Redis)

---

## 1. Visi Arsitektur & Prinsip Desain

Tujuan perancangan ulang arsitektur sistem ini adalah menggantikan sistem legacy (Laravel 12 + Livewire Volt) yang lambat dengan arsitektur **Enterprise Decoupled (Terpisah)** yang tangguh, modular, dan sanggup menampung volume data operasional hingga **5–10 tahun ke depan** (perkiraan 5–10 juta baris transaksi & log mutasi stok) tanpa degradasi performa.

### Prinsip Utama (Core Principles):
1. **Decoupled Client-Server:** Pemrosesan render antarmuka sepenuhnya dijalankan pada perangkat pengguna (Client-Side Rendering menggunakan React). Server hanya memproses data dan logika bisnis melalui REST API berformat JSON.
2. **Stateless Backend:** Backend NestJS bersifat stateless, memungkinkan penskalaan horizontal (multi-instance/multi-container) di kemudian hari.
3. **Database-First Data Integrity:** Validasi data dilakukan pada layer DTO (Class-Validator/Zod) dan dikunci secara ketat di level Database Engine menggunakan foreign key constraints, check constraints, dan transaksi ACID berinsulasi.
4. **General Ledger (Single Source of Truth):** Menghapus anti-pattern *triple-invoicing* sistem lama. Satu transaksi penjualan hanya memiliki satu header transaksi riil dan satu pasang jurnal debit/kredit seimbang.
5. **Pre-aggregation & Snapshotting:** Laporan keuangan historis tidak lagi menghitung ulang dari baris pertama tahun pertama secara on-the-fly, melainkan membaca data agregat bulanan (*monthly balance snapshots*).

---

## 2. Diagram Arsitektur Sistem

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND CLIENT (React 19)                      │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  TanStack    │  │  Zustand     │  │  Shadcn UI  │  │  React      │  │
│  │  Query v5    │  │  (UI State)  │  │  + Tailwind │  │  Hook Form  │  │
│  └──────┬───────┘  └──────────────┘  └─────────────┘  └─────────────┘  │
└─────────┼──────────────────────────────────────────────────────────────┘
          │ HTTPS JSON Requests (Bearer JWT)
          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      REVERSE PROXY (Nginx / Caddy)                     │
│          - SSL Termination       - Gzip / Brotli Compression           │
│          - Rate Limiting         - Static Asset Caching                │
└─────────┬──────────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND API (NestJS 11)                         │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Global Middleware & Interceptors (Logger, CORS, Transform, Resp) │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ Module Architecture (Controllers -> Services -> Repositories)    │  │
│  │                                                                  │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────┐  │  │
│  │  │ Auth &     │  │ Master Data │  │ Transaksi  │  │ Inventory │  │  │
│  │  │ RBAC       │  │ Service     │  │ Engine     │  │ & FIFO    │  │  │
│  │  └────────────┘  └─────────────┘  └────────────┘  └───────────┘  │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────┐  │  │
│  │  │ Akuntansi  │  │ Piutang &   │  │ Reporting  │  │ BullMQ    │  │  │
│  │  │ & Ledger   │  │ Hutang      │  │ Service    │  │ Worker    │  │  │
│  │  └────────────┘  └─────────────┘  └────────────┘  └───────────┘  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────┐
│     PRIMARY RELATIONAL DB     │             │    IN-MEMORY CACHE &      │
│   PostgreSQL 16 / MySQL 8.0   │             │       MESSAGE QUEUE       │
│                               │             │                           │
│ - Transaksi & Jurnal Umum     │             │ - User Session & Tokens   │
│ - Stok Batches & Mutasi       │             │ - Master Data In-Memory   │
│ - Monthly Balance Snapshots   │             │ - Heavy Job Background    │
│ - B-Tree Composite Indexing   │             │   (Excel Generator)       │
└───────────────────────────────┘             └───────────────────────────┘
```

---

## 3. Desain Backend (NestJS Layered Clean Architecture)

Backend dibangun dengan framework **NestJS** berbasis TypeScript dengan struktur modular enterprise:

### A. Struktur Folder Backend (`/backend/src`)
```
backend/src/
├── common/                     # Utilitas bersama, filter, guard, dekorator
│   ├── decorators/             # @CurrentUser, @Roles, @Permissions
│   ├── dto/                    # PaginationQueryDto, BaseResponseDto
│   ├── filters/                # AllExceptionsFilter, PrismaExceptionFilter
│   ├── guards/                 # JwtAuthGuard, RolesGuard
│   ├── interceptors/           # TransformResponseInterceptor, LoggingInterceptor
│   └── pipes/                  # Custom ValidationPipes
├── config/                     # Konfigurasi app, db, redis, auth via Joi/Zod
├── database/                   # Prisma ORM schema, migrations, seeder
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── prisma.service.ts
├── modules/                    # Modul-modul domain bisnis
│   ├── auth/                   # Autentikasi, JWT Access/Refresh Token
│   ├── users/                  # Pengguna sistem & Hak Akses (RBAC)
│   ├── master/                 # Barang, Jenis Barang, Satuan, Client/Pedagang
│   ├── inventory/              # Batch Stok, FIFO Engine, Opname, Kondisi Telur
│   ├── transaksi/              # Pembelian, Penjualan, Retur
│   ├── keuangan/               # Kas/Bank, Piutang, Hutang, Biaya Operasional
│   ├── akuntansi/              # Chart of Accounts (COA), Jurnal Umum, Buku Besar
│   ├── reports/                # Laba Rugi, Neraca Saldo, Aset, Laporan Stok
│   └── jobs/                   # BullMQ Queue Processor (Export Excel, Closing Bulanan)
├── app.module.ts
└── main.ts
```

### B. Pola Layering Per Modul
Setiap modul menerapkan pemisahan tanggung jawab yang jelas:
1. **Controller:** Hanya menangani routing HTTP, validasi request DTO, dan serialisasi response.
2. **Service:** Menjalankan *domain business logic*, perhitungan FIFO, transaksi database atomik.
3. **Repository / Query Layer:** Menggunakan Prisma Client / Kysely untuk mengeksekusi SQL query dengan optimasi indeks komposit.

### C. Algoritma FIFO Stok Atomik (Solusi Concurrency Lock)
Pada sistem lama, alokasi FIFO dilakukan di memory PHP dengan `StokBatch::lockForUpdate()->get()`, yang rentan menyebabkan *connection pool lock* jika request antri.

Pada NestJS, alokasi FIFO dilakukan dalam satu blok transaksi database atomik (`prisma.$transaction`) dengan alur terpadu:
```typescript
// Alur Alokasi FIFO dalam Transaksi Atomik
export async function allocateFifoStock(
  tx: PrismaTransaction,
  barangId: number,
  qtyDibutuhkan: number,
  detailTransaksiId: number
) {
  // 1. Kunci hanya baris batch yang relevan secara berurutan
  const batches = await tx.$queryRaw<StokBatch[]>`
    SELECT id, qty_sisa, harga 
    FROM stok_batches 
    WHERE barang_id = ${barangId} AND qty_sisa > 0 
    ORDER BY tanggal ASC, id ASC 
    FOR UPDATE
  `;

  let sisaAlokasi = qtyDibutuhkan;
  const alokasiList = [];

  for (const batch of batches) {
    if (sisaAlokasi <= 0) break;
    const pakai = Math.min(Number(batch.qty_sisa), sisaAlokasi);

    // 2. Potong stok batch
    await tx.stokBatch.update({
      where: { id: batch.id },
      data: { qty_sisa: { decrement: pakai } }
    });

    // 3. Catat di log keluaran batch (StokKeluarBatch)
    alokasiList.push({
      detailTransaksiId,
      stokBatchId: batch.id,
      qty: pakai,
      harga: batch.harga
    });

    sisaAlokasi -= pakai;
  }

  if (sisaAlokasi > 0) {
    throw new BadRequestException(`Stok barang ID ${barangId} tidak mencukupi untuk memenuhi pesanan.`);
  }

  // 4. Batch insert catatan pengeluaran
  await tx.stokKeluarBatch.createMany({ data: alokasiList });
  return alokasiList;
}
```

---

## 4. Desain Frontend (React 19 + TypeScript SPA)

Frontend dibangun sebagai **Single Page Application (SPA)** murni dengan fokus pada performa instan dan pengalaman pengguna kasir/admin yang lancar.

### A. Struktur Folder Frontend (`/frontend/src`)
```
frontend/src/
├── assets/                     # Gambar, logo, icon
├── components/                 # Komponen UI global (Shadcn UI)
│   ├── ui/                     # Button, Dialog, Dropdown, Input, Table, Badge
│   └── shared/                 # DataTable, CurrencyInput, DateRangePicker, StatCard
├── features/                   # Modul berbasis fitur
│   ├── auth/                   # Form Login, Guard, Hook useAuth
│   ├── dashboard/              # Widget analitik, ringkasan harian
│   ├── master/                 # Halaman CRUD Barang, Client, Satuan
│   ├── transaksi/              # Halaman POS/Kasir Penjualan & Pembelian
│   ├── inventory/              # Monitoring Batch Telur, Opname Fisik
│   ├── keuangan/               # Modul Kas, Bon Piutang, Hutang Peternak
│   └── reports/                # Viewer Laporan Laba Rugi, Neraca, Export Button
├── hooks/                      # Custom React Hooks (useDebounce, usePermission)
├── lib/                        # Axios instance, formatting helpers, TanStack query client
├── routes/                     # React Router v7 configuration & Protected Routes
├── stores/                     # Zustand store (Sidebar state, Active filter, Cart state)
├── types/                      # TypeScript definitions (Entity, DTO, API Response)
├── App.tsx
└── main.tsx
```

### B. Strategi Performa UI
1. **Virtual Scrolling Data Table:** Menggunakan **TanStack Table v8 + TanStack Virtual** sehingga tabel transaksi dengan 10.000 baris hanya me-render 20 elemen DOM yang terlihat di layar, menghemat memori browser dan mencegah browser lagging.
2. **Server State Caching (TanStack Query v5):** Master data (daftar pedagang, daftar barang) di-cache di browser pengguna dengan `staleTime: 5 menit`. Perpindahan halaman terasa instan karena tidak perlu melakukan HTTP fetch berulang.
3. **Optimistic Updates:** Pada aksi seperti pelunasan bon atau perubahan status, antarmuka langsung merespons secara optimistik sebelum response server tiba.

---

## 5. Strategi Database & Kueri untuk 5–10 Tahun

Untuk menangani 5–10 juta baris data dengan respons query tetap di bawah **50 milidetik**:

### A. Penghapusan Anti-Pattern Triple-Invoice
* **Sistem Lama:** 1 Penjualan Telur = 3 row `transaksis` (`INV-BON`, `INV-TLR`, `INV-HPP`).
* **Sistem Baru:** 1 Penjualan = 1 row `transaksis` (Header) + N row `detail_transaksis` (Items) + 1 pasang entri `jurnal_details` (Akuntansi).
  * Debit: Piutang Usaha / Kas
  * Kredit: Pendapatan Penjualan Telur
  * Debit: Beban Pokok Penjualan (HPP)
  * Kredit: Persediaan Telur

### B. Snapshot Saldo Bulanan (`monthly_account_balances`)
Setiap akhir bulan, sistem menjalankan closing otomatis:
1. Menghitung saldo akhir setiap akun/kategori untuk bulan tersebut.
2. Menyimpan ringkasan ke tabel `monthly_account_balances`.
3. Saat user membuka laporan Neraca tahun 2029, sistem hanya membaca snapshot penutup bulan sebelumnya + mutasi bulan aktif. **Tidak ada full-table scan ke tahun 2025.**

### C. Partitioning Tabel (PostgreSQL Range Partition)
Tabel transaksi dan jurnal umum dapat dipartisi per tahun secara otomatis:
```sql
CREATE TABLE transaksis (
    id BIGSERIAL,
    invoice VARCHAR(50) NOT NULL,
    tanggal TIMESTAMPTZ NOT NULL,
    ...
    PRIMARY KEY (id, tanggal)
) PARTITION BY RANGE (tanggal);

-- Partisi per tahun
CREATE TABLE transaksis_2025 PARTITION OF transaksis FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE transaksis_2026 PARTITION OF transaksis FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

---

## 6. Arsitektur Cache & Background Jobs (Redis + BullMQ)

1. **Redis Cache:**
   * Token JWT blacklist & user active session.
   * Master data barang, kategori akun, dan konfigurasi sistem (TTL 1 jam, di-invalidate saat ada mutasi CRUD).
2. **BullMQ Background Workers:**
   * **Export Excel:** Laporan Excel besar (50.000 baris) tidak lagi diproses dalam synchronous HTTP request. Request langsung mereturn `{ jobId }`. Worker Node.js memproses file di latar belakang via streaming memory, lalu mengirim notifikasi jika file siap diunduh.
   * **Automated Daily Reconcile:** Memverifikasi integritas stok fisik vs log batch setiap tengah malam.
