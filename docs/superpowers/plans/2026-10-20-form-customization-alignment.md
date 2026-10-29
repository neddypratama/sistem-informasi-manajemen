Created At: 2026-10-20T23:13:06+07:00
Completed At: 2026-10-20T23:30:00+07:00

# Form Customization & System Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyesuaikan dan menyempurnakan form-form input pada Sistem Baru (ERP Bima Pratama) sesuai keputusan pengguna dari hasil komparasi dengan sistem lama, meliputi penegasan akun metode pembayaran kas/hutang/piutang, penambahan tombol retur komoditas, penyesuaian form beban & pendapatan lain, penambahan searchable select client beserta nominal saldo berjalan pada hutang/piutang, serta penyesuaian form stok opname khusus pakan, obat, dan tray.

**Architecture:**
- **Frontend (React 19 + TypeScript + Vite + Tailwind CSS):** Modifikasi form modal di `CommodityTransactionPage.tsx`, `PenjualanPage.tsx`, `BebanPage.tsx`, `PendapatanLainPage.tsx`, `HutangPage.tsx`, `PiutangPage.tsx`, dan `StokOpnamePage.tsx`. Tambahkan komponen reusable `SearchableClientSelect` dengan display saldo hutang/piutang berjalan.
- **Backend (NestJS + Prisma):** Perbarui DTO dan service di `transaksi.service.ts`, `transaksi.controller.ts`, dan `inventory.service.ts` untuk memproses akun kas/bank, tipe beban (debit/kredit), client id pada pendapatan lain, serta jurnal penyesuaian pakan/obat/tray.

**Tech Stack:** NestJS, Prisma ORM, MySQL, React, TypeScript, TanStack React Query, Tailwind CSS, Lucide React.

---

## Global Constraints
- Database target aktif: `bimapratama_v2`.
- Kode akun Kas & Bank resmi (IDs 64-71): Kas Tunai (64), Bank BCA Binti Wasilah (65), Bank BCA Masduki (66), Bank BRI Binti Wasilah (67), Bank BRI Masduki (68), Bank BNI Binti Wasilah (69), Bank BNI Bima Pratama (70), Kas Deby (71).
- Akun Piutang Pedagang: Kategori ID 46.
- Akun Hutang Peternak: Kategori ID 72, Hutang Pakan: Kategori ID 73.
- Menjaga integritas jurnal akuntansi tetap seimbang (*balance debit = credit*).

---

## Tasks

### Task 1: Form Penjualan & Pembelian Komoditas — Detail Akun Kas/Hutang/Piutang & Hapus Kondisi Telur
**Files:**
- Modify: `frontend/src/features/transaksi/CommodityTransactionPage.tsx`
- Modify: `frontend/src/features/transaksi/PenjualanPage.tsx`
- Modify: `backend/src/modules/transaksi/dto/create-transaksi.dto.ts`
- Modify: `backend/src/modules/transaksi/transaksi.service.ts`

- [x] Hapus kolom input `telurBentes`, `telurKotor`, `telurCeplok`, `telurJumbo` dari baris item input dan cart di `CommodityTransactionPage.tsx` dan `PenjualanPage.tsx`.
- [x] Di bagian Metode Pembayaran Penjualan:
  - Berikan opsi eksplisit: `Kas Tunai (ID 64)`, `Transfer Bank` (dropdown pilihan BCA Masduki 66, BRI Wasilah 67, dll.), atau `Piutang / Tempo` (Akun Piutang Pedagang ID 46 otomatis terhubung dengan Client).
  - Tampilkan label akun COA dan nomor akun yang dipilih dengan jelas.
- [x] Di bagian Metode Pembayaran Pembelian:
  - Berikan opsi eksplisit: `Kas Tunai (ID 64)`, `Transfer Bank` (dropdown pilihan bank sumber dana), atau `Hutang / Tempo` (Akun Hutang Peternak ID 72 / Hutang Pakan ID 73 otomatis terhubung dengan Client).
  - Tampilkan label akun COA yang dipilih.
- [x] Update backend `transaksi.service.ts` agar saat menerima `paymentAccountId` / `kasBankKategoriId` menggunakan akun spesifik tersebut pada posting jurnal dan transaksi pendamping.

---

### Task 2: Form Retur Penjualan & Pembelian — Tombol Aksi Tambah Retur
**Files:**
- Modify: `frontend/src/features/transaksi/CommodityTransactionPage.tsx`

- [x] Di header halaman `CommodityTransactionPage.tsx`:
  - Saat tab aktif adalah `RETUR_PENJUALAN`: tampilkan tombol "+ Catat Retur Penjualan" (membuka modal dengan formType = `RETUR_PENJUALAN`).
  - Saat tab aktif adalah `RETUR_PEMBELIAN`: tampilkan tombol "+ Catat Retur Pembelian" (membuka modal dengan formType = `RETUR_PEMBELIAN`).
  - Saat tab aktif adalah `STOK`: sembunyikan atau sediakan tombol pintasan ke Stok Opname.
- [x] Pastikan alur pemilihan invoice asal pada modal retur berjalan mulus dan memuat data barang retur sesuai batas maksimal retur.

---

### Task 3: Form Beban Operasional — Pilihan Akun Kas/Bank & Tipe Pengeluaran vs Kembalian
**Files:**
- Modify: `frontend/src/features/keuangan/BebanPage.tsx`
- Modify: `backend/src/modules/transaksi/transaksi.controller.ts`
- Modify: `backend/src/modules/transaksi/transaksi.service.ts`

- [x] Di `BebanPage.tsx`:
  - Tambahkan dropdown pilihan **Akun Pembayaran Kas/Bank (`kasBankKategoriId`)**: Kas Tunai (64), Kas Deby (71), Bank BCA Masduki (66), Bank BRI (67), Bank BNI (70), dsb.
  - Tambahkan radio button / select **Tipe Beban (`type`)**: `Debit` = Pengeluaran Beban vs `Kredit` = Kembalian Beban / Koreksi Sisa Biaya.
- [x] Di backend `transaksi.service.ts` method `createBeban`:
  - Terima `kasBankKategoriId` (default 64) dan `type` (default 'Debit').
  - Jika `type === 'Kredit'` (Kembalian Beban): jurnal Kas didebit dan Beban dikredit.
  - Jika `type === 'Debit'` (Pengeluaran Beban): jurnal Beban didebit dan Kas dikredit.

---

### Task 4: Form Pendapatan Lain-Lain — Pilihan Client Penyetor & Akun Kas/Bank
**Files:**
- Modify: `frontend/src/features/keuangan/PendapatanLainPage.tsx`
- Modify: `backend/src/modules/transaksi/transaksi.controller.ts`
- Modify: `backend/src/modules/transaksi/transaksi.service.ts`

- [x] Di `PendapatanLainPage.tsx`:
  - Tambahkan dropdown **Pihak Penyetor / Client (`clientId`)** opsional (searchable select dari master client).
  - Ganti pilihan radio pembayaran menjadi dropdown **Akun Kas & Bank Penerima (`kasBankKategoriId`)**: Kas Tunai (64), Kas Deby (71), Bank BCA Masduki (66), Bank BRI (67), Bank BNI (70), dsb.
- [x] Di backend `transaksi.service.ts` method `createPendapatanLain`:
  - Terima `clientId` dan `kasBankKategoriId`.
  - Catat transaksi dengan `clientId` dan posting jurnal kas penerima dana sesuai `kasBankKategoriId`.

---

### Task 5: Form Hutang & Piutang — Searchable Select Client dengan Nominal Saldo Berjalan
**Files:**
- Create: `frontend/src/components/SearchableClientSelect.tsx`
- Modify: `frontend/src/features/keuangan/HutangPage.tsx`
- Modify: `frontend/src/features/keuangan/PiutangPage.tsx`

- [x] Buat komponen reusable `SearchableClientSelect`:
  - Input teks pencarian instan (nama client, tipe, atau nomor HP).
  - Tampilkan setiap item dengan format: `[Nama Client] • [Tipe] | Saldo: Rp [Saldo Berjalan]`.
  - Saat dipilih, tampilkan kartu/alert ringkas di bawah input: `Saldo [Hutang/Piutang] Berjalan Saat Ini: Rp [Nominal]`.
- [x] Integrasikan `SearchableClientSelect` ke dalam modal Add/Bayar di `HutangPage.tsx` (menampilkan saldo hutang).
- [x] Integrasikan `SearchableClientSelect` ke dalam modal Add/Bayar di `PiutangPage.tsx` (menampilkan saldo piutang).

---

### Task 6: Form Stok Opname — Penyesuaian Khusus Pakan, Obat, dan Tray
**Files:**
- Modify: `frontend/src/features/inventory/StokOpnamePage.tsx`
- Modify: `backend/src/modules/inventory/inventory.service.ts`

- [x] Di `StokOpnamePage.tsx`:
  - Tambahkan input dinamis berdasarkan `formKomoditas`:
    * Jika `PAKAN`:
      - Stok Fisik Bagus (Kg / Sak)
      - Pakan Rusak / Kadaluarsa (Kg / Sak) -> Kategori 30: Beban Barang Kadaluarsa
      - Selisih Stok (Kg / Sak) -> Kategori 88 Penyesuaian Stok Persediaan
    * Jika `OBAT`:
      - Stok Fisik Bagus (Botol / Pcs)
      - Obat Rusak / Kadaluarsa (Botol / Pcs) -> Kategori 30: Beban Barang Kadaluarsa
      - Selisih Stok (Botol / Pcs) -> Kategori 88 Penyesuaian Stok Persediaan
    * Jika `TRAY`:
      - Stok Fisik Bagus (Ikat / Pcs)
      - Tray Rusak / Afkir / Terpakai (Pcs) -> Kategori 42: Beban Tray Terpakai
      - Selisih Stok (Pcs) -> Kategori 88 Penyesuaian Stok Persediaan
- [x] Di backend `inventory.service.ts`:
  - Tangani parameter penyesuaian pakan, obat, dan tray dan bukukan jurnal penyesuaian ke akun beban terkait (ID 30 untuk kadaluarsa, ID 42 untuk tray terpakai, ID 88 untuk selisih fisik).

---

### Task 7: Verifikasi dan Pengujian Menyeluruh
- [x] Build backend (`npm run build` di `backend/`) dan verifikasi nol error TypeScript.
- [x] Restart service daemon backend.
- [x] Build frontend (`npm run build` di `frontend/`) dan verifikasi nol error TypeScript / Vite.
- [x] Uji coba tiap form di browser dan pastikan seluruh inputan bekerja sesuai keputusan user.
