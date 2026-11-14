# Multi-Commodity Single Nota (Pakan Pabrikan & Curah) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memungkinkan kasir/admin mencatat penjualan dan pembelian gabungan dalam 1 nota/faktur (misal pelanggan membeli Pakan Pabrikan dan Pakan Curah sekaligus), dengan penjurnalan akuntansi multi-COA otomatis yang memisahkan omzet, HPP, dan persediaan secara presisi antara Bima Pratama dan Bpk. Supriyadi (Pak Pri), serta tampilan tabel modul yang cerdas dan proporsional.

**Architecture:**
1. Backend: Refactor posting jurnal di `transaksi.service.ts` (`createPenjualan`, `createPembelian`, `createReturPenjualan`, `createReturPembelian`) dari yang sebelumnya mengasumsikan 1 komoditas dari `firstItem`, menjadi **Multi-COA Split Journal per Baris Barang**. Setiap barang dipetakan ke akun Pendapatan, HPP, dan Persediaannya masing-masing (Sentrat: Ktg 6/95/60; Curah: Ktg 8/96/89; Telur: Ktg 1-5/90-94/59; Obat: Ktg 9/98/61; Tray: Ktg 10/99/62).
2. Frontend: Perbarui `CommodityTransactionPage.tsx` agar pada halaman komoditas tertentu (seperti `/pakan` atau `/curah-pak-pri`), transaksi multi-komoditas menampilkan kuantitas dan nominal yang sesuai dengan porsi komoditas tersebut, dilengkapi indikator badge `(Nota Gabungan)` dan modal rincian utuh. Pastikan dropdown pemilihan barang di modal input transaksi pakan dapat memilih barang pabrikan maupun curah.

**Tech Stack:** NestJS, Prisma ORM, MySQL, TypeScript, React 18, TanStack Query, Tailwind CSS.

**Spec:** Kebutuhan operasional kasir: peternak membeli Pakan Pabrikan (Sentrat) dan Pakan Curah (Katul/Jagung) dalam 1 struk/nota fisik yang sama. Sistem harus mencatatnya dalam 1 transaksi terpadu (1 nomor invoice, 1 saldo piutang/pembayaran), namun pembukuan finansial, laba rugi, dan stok terpisah sempurna antara BP dan Pak Pri.

---

## Global Constraints

- Standar Akuntansi: Double-entry journal balance (Total Debit === Total Kredit).
- Metode Persediaan: FIFO (First-In, First-Out) dengan tracking batch persediaan (`stok_batches`).
- Integritas Data: Satu transaksi menghasilkan 1 invoice unik (`INV-...`) dan 1 nomor jurnal (`JUR-...`), dengan detail jurnal mencerminkan pembagian pendapatan/HPP/persediaan per komoditas.
- Laporan Keuangan:
  - Laporan Laba Rugi BP (`getLabaRugi`) tetap hanya menghitung omzet & HPP BP (Ktg 6 & 95 untuk sentrat, dsb., mengecualikan 8 & 96).
  - Laporan Laba Rugi Curah Pak Pri (`getLabaRugiCurah`) & Portal Pak Pri (`/curah-pak-pri`) tetap hanya menghitung omzet & HPP Curah (Ktg 8 & 96).
  - Laporan Aset BP (`getLaporanAset`) tetap mengecualikan Stok Curah (Ktg 89 / DK 40).

## Review Focus

1. **Jurnal Seimbang (Zero Discrepancy)**: Saat terdapat diskon pada nota gabungan, alokasi nilai pendapatan per komoditas harus proporsional sehingga Total Debit (Kas/Bank/Piutang) sama persis dengan Total Kredit (Pendapatan).
2. **Pemisahan Akun Persediaan & HPP**: Barang Sentrat mengkredit Stok Pakan Sentrat (60) dan mendebit HPP Sentrat (95); barang Curah mengkredit Stok Curah (89) dan mendebit HPP Curah (96).
3. **Pembelian Multi-Komoditas**: Pembelian gabungan bahan curah dan pakan mendebit akun persediaan masing-masing sesuai subtotal barang.
4. **Display Proporsional di Tabel Komoditas**: Modul `/pakan` hanya menghitung total nominal Sentrat di tabel & summary-nya, dan `/curah-pak-pri` hanya menghitung total nominal Curah.
5. **Detail Transaksi Utuh**: Tombol Lihat Detail (Eye) dan Cetak Nota tetap menampilkan seluruh barang belanjaan dalam 1 nota utuh.

---

## Tasks

### Task 1: Helper Pemetaan COA Multi-Komoditas di Backend

**Files:**
- Modify: `backend/src/modules/transaksi/transaksi.service.ts`

**Interfaces:**
- Produces: Helper internal `getItemCoaMapping(barang: any)` yang mengembalikan `{ akunPendapatanId: bigint, akunHppId: bigint, akunPersediaanId: bigint }` berdasarkan jenis & nama barang.

- [ ] **Step 1: Definisikan helper fungsi pemetaan akun COA di `transaksi.service.ts`**
```typescript
private getBarangCoaMapping(barang: any): { akunPendapatanId: bigint; akunHppId: bigint; akunPersediaanId: bigint } {
  const jenisId = barang?.jenisId ? BigInt(barang.jenisId) : 0n;
  const jenisName = (barang?.jenis?.name || '').toLowerCase();
  const barangName = (barang?.name || '').toLowerCase();

  const isCurah = jenisId === 9n || jenisName.includes('curah') || barangName.includes('curah');
  if (isCurah) {
    return {
      akunPendapatanId: 8n,  // Penjualan Pakan Curah
      akunHppId: 96n,         // HPP Pakan Curah
      akunPersediaanId: 89n,  // Stok Curah
    };
  }
  // Toko items
  if ((jenisId >= 11n && jenisId <= 17n) || jenisName.includes('konsentrat') || jenisName.includes('hijauan') || jenisName.includes('premix') || jenisName.includes('bahan baku') || jenisName.includes('rmn')) {
    let pId = 107n;
    let hId = 114n;
    let sId = 124n;
    if (jenisName.includes('hijauan') || jenisId === 11n) { pId = 101n; hId = 108n; sId = 117n; }
    else if (jenisName.includes('konsentrat') || jenisId === 12n) { pId = 102n; hId = 109n; sId = 118n; }
    else if (jenisName.includes('bahan baku') || jenisId === 13n) { pId = 103n; hId = 110n; sId = 119n; }
    else if (jenisName.includes('premix') || jenisId === 14n) { pId = 104n; hId = 111n; sId = 120n; }
    else if (jenisId === 10n || barangName.includes('kucing')) { pId = 7n; hId = 97n; sId = 121n; }
    else if (jenisName.includes('rmn') || jenisId === 15n) { pId = 105n; hId = 112n; sId = 122n; }
    else if (jenisId === 17n) { pId = 106n; hId = 113n; sId = 123n; }
    return { akunPendapatanId: pId, akunHppId: hId, akunPersediaanId: sId };
  }
  // Pakan Sentrat / Pabrikan
  if (jenisName.includes('pakan') || jenisName.includes('sentrat') || jenisId === 8n) {
    if (barangName.includes('kucing') || jenisId === 10n) {
      return { akunPendapatanId: 7n, akunHppId: 97n, akunPersediaanId: 60n };
    }
    return { akunPendapatanId: 6n, akunHppId: 95n, akunPersediaanId: 60n };
  }
  // Obat
  if (jenisName.includes('obat') || jenisId === 18n) {
    return { akunPendapatanId: 9n, akunHppId: 98n, akunPersediaanId: 61n };
  }
  // Tray
  if (jenisName.includes('tray') || jenisId === 19n) {
    return { akunPendapatanId: 10n, akunHppId: 99n, akunPersediaanId: 62n };
  }
  // Telur
  let pId = 1n;
  let hId = 90n;
  if (barangName.includes('bebek')) { pId = 2n; hId = 91n; }
  else if (barangName.includes('puyuh')) { pId = 3n; hId = 92n; }
  else if (barangName.includes('arab')) { pId = 4n; hId = 93n; }
  else if (barangName.includes('asin')) { pId = 5n; hId = 94n; }
  return { akunPendapatanId: pId, akunHppId: hId, akunPersediaanId: 59n };
}
```

---

### Task 2: Refactor `createPenjualan` untuk Multi-COA Split Journal

**Files:**
- Modify: `backend/src/modules/transaksi/transaksi.service.ts:350-515`

- [ ] **Step 1: Kumpulkan agregat pendapatan, HPP, dan persediaan saat iterasi items**
Hitung subtotal kotor total `subtotal` dan alokasikan diskon proporsional jika ada:
```typescript
const pendapatanMap = new Map<bigint, number>();
const hppMap = new Map<bigint, number>();
const persediaanMap = new Map<bigint, number>();

// Untuk setiap item:
// netItemSubtotal = subtotal > 0 ? itemSubtotal - (itemSubtotal / subtotal) * diskon : itemSubtotal;
// pendapatanMap: tambah netItemSubtotal ke mapping.akunPendapatanId
// hppMap: tambah fifoResult.totalHpp ke mapping.akunHppId
// persediaanMap: tambah fifoResult.totalHpp ke mapping.akunPersediaanId
```
- [ ] **Step 2: Buat detail jurnal multi-baris yang seimbang**
Debit akun pembayaran (Kas/Bank/Piutang) sebesar `total`, lalu buat baris kredit untuk masing-masing akun pendapatan yang terlibat, debit untuk masing-masing akun HPP, dan kredit untuk masing-masing akun persediaan.
Pastikan selisih pembulatan desimal diskon (jika ada) disesuaikan ke item terbesar agar `Sum(Kredit Pendapatan) === total`.

---

### Task 3: Refactor `createPembelian`, `createReturPenjualan`, & `createReturPembelian`

**Files:**
- Modify: `backend/src/modules/transaksi/transaksi.service.ts:660-850`

- [ ] **Step 1: Update `createPembelian` untuk split persediaan per komoditas**
Jika nota pembelian berisi bahan curah dan pakan sentrat, debit persediaan dialokasikan ke masing-masing akun persediaan (Kategori 89 untuk Curah, Kategori 60 untuk Sentrat).
- [ ] **Step 2: Update `createReturPenjualan` dan `createReturPembelian`**
Dukung multi-baris retur dengan alokasi akun persediaan, HPP, dan retur yang sesuai.

---

### Task 4: Frontend UI Enhancement di `CommodityTransactionPage.tsx` & `PakanModulePage.tsx`

**Files:**
- Modify: `frontend/src/features/transaksi/PakanModulePage.tsx`
- Modify: `frontend/src/features/transaksi/CommodityTransactionPage.tsx`

- [ ] **Step 1: Izinkan pemilihan barang pakan pabrikan & curah di modal transaksi**
Di `PakanModulePage.tsx`, sediakan parameter `allowedBarangJenisIds={[8, 9, 10]}` agar form input modal pakan dapat memilih barang curah maupun sentrat.
- [ ] **Step 2: Perbarui perhitungan kolom nominal dan footer pada tabel transaksi komoditas**
Di `CommodityTransactionPage.tsx`:
Hitung `commodityTotal` dari item-item yang cocok dengan `jenisIds` halaman aktif.
Jika transaksi memiliki item dari komoditas lain (multi-komoditas):
Tampilkan nominal porsi komoditas tersebut, disertai teks/badge informatif `dari total nota Rp ...`.
- [ ] **Step 3: Pastikan Modal Detail Transaksi (Eye) menampilkan seluruh item dengan pengelompokan yang jelas**

---

### Task 5: Kompilasi, Verifikasi End-to-End, & Pengujian Transaksi Nyata

**Files:**
- Test scripts: `backend/scripts/test_multi_commodity_transaction.cjs`

- [ ] **Step 1: Jalankan `npm run build --prefix backend` dan pastikan sukses (exit code 0)**
- [ ] **Step 2: Jalankan `npm run build --prefix frontend` dan pastikan sukses (exit code 0)**
- [ ] **Step 3: Buat script simulasi transaksi nota gabungan (1 Sak Sentrat + 50 Kg Katul Curah)**
Verifikasi:
1. Jurnal umum seimbang sempurna (Total Debit === Total Kredit).
2. Omzet Sentrat masuk ke Kategori 6; Omzet Curah masuk ke Kategori 8.
3. HPP Sentrat masuk ke Kategori 95; HPP Curah masuk ke Kategori 96.
4. Stok Sentrat berkurang di Kategori 60; Stok Curah berkurang di Kategori 89.
5. Laba Rugi Bima Pratama hanya mencatat Sentrat.
6. Laba Rugi & Portal Pak Pri hanya mencatat Curah.
7. Laporan Aset Bima Pratama tidak terkontaminasi stok curah.
- [ ] **Step 4: Restart backend service daemon dan konfirmasi kesiapan sistem.**
