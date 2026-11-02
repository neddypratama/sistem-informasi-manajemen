# Portal Khusus Bpk. Supriyadi (Pakan Curah & Keuangan Pak Pri) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun ruang kerja / menu terpadu khusus **Pakan Curah (Bpk. Supriyadi)** yang menggabungkan operasional Mbak Pakan (Jual, Beli, Konversi/Racik Pakan), audit aliran uang Kas Tunai & Transfer Bank, rekonsiliasi saldo modal, serta laporan laba rugi curah dan stok gudang dalam 1 halaman terpusat.

**Architecture:** 
1. Backend: Sempurnakan mapping COA otomatis di `transaksi.service.ts` agar komoditas curah (`jenis_id = 9` atau nama jenis Curah) 100% diposting ke Kategori 8 (Penjualan Pakan Curah), Kategori 96 (HPP Pakan Curah), dan Kategori 89 (Stok Curah). Tambahkan filter `paymentMethod` dan summary finansial curah di backend.
2. Frontend: Halaman baru `CurahPakPriPage.tsx` di route `/curah-pak-pri` dengan 4 Kartu KPI Ringkasan (Saldo Modal, Kas Tunai, Transfer Bank, Stok Gudang) dan 4 Tab Utama (Transaksi Curah, Audit Kas Tunai vs Transfer, Konversi Racik Bahan, Stok Gudang & Laba Rugi Curah).
3. Navigasi: Tambahkan menu `Pakan Curah (Pak Pri)` dengan badge `Pak Pri` di sidebar navigasi `AppLayout.tsx`, dan rapikan menu `Pakan Pabrikan` (Sentrat).

**Tech Stack:** NestJS, Prisma ORM, MySQL, React 18, Vite, TypeScript, Tailwind CSS, Lucide React, TanStack React Query.

**Spec:** Pembicaraan dan kesepakatan dengan pengguna: memisahkan operasional dan finansial Bima Pratama dan Bpk. Supriyadi dalam 1 sistem web, dengan menu khusus yang mengumpulkan transaksi Mbak Pakan, mutasi transfer, mutasi tunai kasir, dan posisi saldo modal.

---

## Global Constraints

- Standar Akuntansi: Double-entry journal balance (Debit = Kredit).
- Metode Persediaan: FIFO (First-In, First-Out) dengan tracking batch persediaan (`stok_batches`).
- Integritas Data: Tidak boleh mengubah atau merusak transaksi dan jurnal komoditas Telur, Sentrat, Obat, dan Tray yang sudah berjalan.
- Standar Mata Uang: Format Rupiah Indonesia (`Rp 1.000.000`), titik sebagai pemisah ribuan, koma untuk desimal jika diizinkan.

---

## Review Focus

1. **Jurnal Pakan Curah Tepat Sasaran**: Pastikan komoditas curah (baik bertuliskan 'curah' maupun tidak, seperti *Katul Super A*, *Katul B*, *JGIL*, *Jagung OC*) selalu masuk ke Kategori 8 (Penjualan), 96 (HPP), dan 89 (Stok Curah).
2. **Pemisahan Tunai vs Transfer**: Pastikan filter dan ringkasan membedakan pembayaran Tunai Toko (Kas 64/71) dan Transfer Bank (BCA, BRI, BNI 65-70) secara akurat.
3. **Pemisahan Pakan Sentrat vs Curah**: Pastikan `PakanModulePage.tsx` fokus pada Sentrat (`jenisIds=[8, 10]`), sedangkan `CurahPakPriPage.tsx` fokus pada Pakan Curah (`jenisIds=[9]`).
4. **Kelancaran Alur Konversi Bahan**: Pastikan fitur racik bahan (Konversi) dapat diakses langsung tanpa keluar dari portal Pak Pri.
5. **Kesesuaian Saldo Modal**: Pastikan saldo modal pinjaman/talangan Bp. Supriyadi tersinkronisasi realtime dengan Client ID 241 dan Kategori 76/49.

---

## Tasks

### Task 1: Backend COA & Filter Enhancement for Pakan Curah

**Files:**
- Modify: `backend/src/modules/transaksi/dto/query-transaksi.dto.ts`
- Modify: `backend/src/modules/transaksi/transaksi.service.ts`
- Modify: `backend/src/modules/transaksi/transaksi.controller.ts`
- Modify: `backend/src/modules/inventory/inventory.service.ts`

- [x] Tambahkan properti `paymentMethod?: string` di `QueryTransaksiDto` agar API dapat memfilter langsung berdasarkan metode pembayaran (`TUNAI`, `TRANSFER`, `KREDIT_BON`).
- [x] Di `transaksi.service.ts` method `findAll`, terapkan filter `where.paymentMethod = query.paymentMethod` jika parameter diberikan.
- [x] Di `transaksi.service.ts` method `createPenjualan`, sempurnakan penentuan COA agar jika barang memiliki `barang.jenisId === 9n` atau `jenisName.includes('curah')`, secara pasti diposting ke:
  - `akunPendapatanId = BigInt(8)` (Penjualan Pakan Curah)
  - `akunHppId = BigInt(96)` (HPP Pakan Curah)
  - `akunPersediaanId = BigInt(89)` (Stok Curah)
- [x] Di `transaksi.service.ts` method `createPembelian`, jika barang memiliki `barang.jenisId === 9n` atau `jenisName.includes('curah')`:
  - `akunPersediaanId = BigInt(89)` (Stok Curah)
  - Tetapkan default creditor `clientId = 241n` jika akun kredit yang dipilih adalah Kategori 76 (`Saldo Bp.Supriyadi`).
- [x] Di `inventory.service.ts` method `createKonversi`, perbarui `getPersediaanCoa` agar mengenali `jenisId === 9` atau nama 'curah' mengarah ke akun 89 (`Stok Curah`).
- [x] Tambahkan method ringkasan `getCurahSummary(startDate?: string, endDate?: string)` di `transaksi.service.ts` dan controller `transaksi.controller.ts` (`GET /transaksi/curah/summary`) yang mengembalikan:
  - `totalPenjualanCurah`, `totalPembelianCurah`
  - `totalTunaiCurah`, `totalTransferCurah`, `totalBonCurah`
  - `saldoMitraSupriyadi` (dari Client ID 241: `saldoHutang`, `saldoPiutang`)
- [x] Build backend dengan `npm run build` dan verifikasi tidak ada error TypeScript.

---

### Task 2: Frontend Dedicated Page `CurahPakPriPage.tsx`

**Files:**
- Create: `frontend/src/features/curah/CurahPakPriPage.tsx`

- [x] Buat komponen `CurahPakPriPage` dengan tata letak modern bernuansa Amber/Emas khas pertanian/komoditas curah.
- [x] Tambahkan **Header & Date Filter**:
  - Judul: "Portal Pakan Curah (Bpk. Supriyadi)"
  - Subtitle: "Ruang Kerja Khusus Operasional Pakan Curah, Pengolahan Racik, Audit Kas Tunai vs Transfer, dan Monitoring Saldo Mitra"
  - Quick date filter: `Hari Ini`, `Bulan Ini`, `Bulan Lalu`, `Tahun Ini`, serta custom range.
- [x] Tambahkan **4 Kartu Ringkasan Realtime (KPI Atas)**:
  1. **Saldo Modal / Talangan Bp. Supriyadi**: Menampilkan posisi piutang/hutang modal (dengan badge status: Lunas / Ditalangi BP / Kelebihan Setoran).
  2. **Kas Tunai Terkumpul**: Total uang tunai curah di laci kasir pada periode terpilih.
  3. **Transfer Bank Terkumpul**: Total uang transfer bank curah pada periode terpilih.
  4. **Stok Fisik & Nilai Gudang**: Total kg pakan curah di gudang beserta total nilai rupiah (terintegrasi dengan API Laba Rugi Curah).
- [x] Tambahkan **4 Tab Terpadu**:
  - **Tab 1: Transaksi Pakan Curah (Operasional Mbak Pakan)**:
    - Tombol cepat: `+ Jual Curah` dan `+ Beli Bahan Mentah` (terbuka langsung dengan prefill komoditas curah).
    - Filter cepat status pembayaran: `Semua`, `Tunai`, `Transfer Bank`, `Bon/Tempo`.
    - Tabel transaksi curah lengkap dengan rincian kg, harga, subtotal, tombol Detail, Edit, dan Hapus (dengan audit trail).
  - **Tab 2: Audit Kas (Tunai vs Transfer)**:
    - Kolom kiri: **Rincian Uang Tunai (Kas Toko)** untuk dicocokkan dengan uang fisik di laci kasir.
    - Kolom kanan: **Rincian Uang Transfer (Bank BCA/BRI/BNI)** untuk dicocokkan dengan mutasi rekening bank.
    - Rekap total uang masuk vs uang keluar untuk belanja bahan curah.
  - **Tab 3: Konversi & Racik Pakan**:
    - Form konversi cepat: Barang Asal (misal Jagung OC / Katul Mentah) $\rightarrow$ Barang Hasil (misal JGIL / Katul A / Katul B).
    - Tabel riwayat konversi pakan curah dengan nomor referensi, tanggal, kuantitas asal/hasil, nilai HPP, dan aksi.
  - **Tab 4: Stok Gudang & Laba Rugi Curah**:
    - Rincian stok fisik per barang curah (Kg sisa, harga rata-rata, total nilai rupiah).
    - Tabel Laba Rugi Curah (Penjualan, HPP, Laba Kotor, Margin %).
    - Tombol Export Excel & Cetak PDF untuk laporan ke Bpk. Supriyadi.

---

### Task 3: Navigation, Routing & Cross-Module Polish

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`
- Modify: `frontend/src/features/transaksi/PakanModulePage.tsx`

- [x] Di `frontend/src/components/layout/AppLayout.tsx`:
  - Tambahkan menu navigasi `Pakan Curah (Pak Pri)` di bawah `KOMODITAS OPERASIONAL` menuju `/curah-pak-pri` dengan icon `Wheat`, badge `Pak Pri`, warna amber.
  - Perbarui menu `Menu Pakan` menjadi `Pakan Pabrikan` dengan badge `Sentrat` agar tidak tertukar.
- [x] Di `frontend/src/App.tsx`:
  - Daftarkan route `/curah-pak-pri` dengan element `<CurahPakPriPage />`.
- [x] Di `frontend/src/features/transaksi/PakanModulePage.tsx`:
  - Batasi modul ini untuk fokus pada Sentrat Pabrikan: `jenisIds={[8, 10]}`.
  - Tambahkan banner notifikasi informatif di bagian atas: *"Ingin mengelola Pakan Curah (Bpk. Supriyadi)? Buka Portal Khusus Pakan Curah (Pak Pri) ➔"* dengan tombol link langsung ke `/curah-pak-pri`.

---

### Task 4: Build Verification & End-to-End Testing

**Files:**
- Test scripts & command line execution

- [x] Jalankan `npm run build` pada folder `backend` dan pastikan compile sukses tanpa error.
- [x] Jalankan `npm run build` pada folder `frontend` dan pastikan bundle compile sukses tanpa error.
- [x] Restart service daemon backend untuk memuat versi binary terbaru.
- [x] Verifikasi endpoint `/transaksi/curah/summary` mengembalikan data dengan benar.
- [x] Verifikasi navigasi dan seluruh tab di halaman `/curah-pak-pri` dapat dibuka dan berfungsi dengan lancar.
- [x] Lakukan uji coba input simulasi:
  - Pembelian bahan curah (Stok curah bertambah di akun 89).
  - Konversi bahan curah (Stok berpindah tanpa beban susut).
  - Penjualan curah tunai (Kas bertambah, omzet masuk Kategori 8).
  - Penjualan curah transfer (Bank bertambah, omzet masuk Kategori 8).
