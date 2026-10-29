# Kartu Model Domain & Aturan Bisnis (Model_Card.md)
## Bima Pratama ERP 2.0 (Domain Entities & Business Invariants)

---

## 1. Ikhtisar Model Domain

Dokumen ini mendefinisikan seluruh **Entitas Domain**, aturan validasi, *invariants* (kondisi yang tidak boleh dilanggar), serta *state machine* dari sistem ERP Bima Pratama.

---

## 2. Spesifikasi Entitas Utama

### A. Entitas `Transaksi` (Transaction Header)
* **Deskripsi:** Titik masuk utama seluruh kegiatan operasional (penjualan produk peternakan, pembelian bahan pakan/obat/tray, retur, dan pengeluaran kas).
* **Atribut Utama:**
  * `id`: BigInt (Primary Key, Auto-increment)
  * `invoice`: String(60), Unique, Format: `INV-{YYYYMMDD}-{KODE_JENIS}-{NOMOR_URUT}` (contoh: `INV-20261015-TLR-0001`).
  * `tanggal`: Timestamptz (Waktu pencatatan transaksi).
  * `type`: Enum (`PENJUALAN`, `PEMBELIAN`, `RETUR_PENJUALAN`, `RETUR_PEMBELIAN`, `KAS_MASUK`, `KAS_KELUAR`).
  * `status`: Enum (`DRAFT`, `SELESAI`, `BATAL`).
  * `payment_method`: Enum (`TUNAI`, `TRANSFER`, `KREDIT_BON`).
  * `client_id`: Integer, Nullable (Wajib diisi jika Penjualan/Pembelian/Bon).
  * `user_id`: Integer (Petugas kasir/admin yang menginput).
  * `subtotal`: Decimal(15,2)
  * `diskon`: Decimal(15,2), Default 0
  * `total`: Decimal(15,2), Invariant: `subtotal - diskon`.
* **State Machine Transaksi:**
```
       [ Input Baru ]
             │
             ▼
       ┌───────────┐
       │   DRAFT   │ ◄─── (Dapat diedit atau dihapus item)
       └─────┬─────┘
             │
       [ Selesaikan ] ──► (Validasi Stok, Alokasi FIFO, Posting Jurnal Akuntansi)
             │
             ▼
       ┌───────────┐
       │  SELESAI  │ ◄─── (Terkunci permanen, tidak bisa diedit langsung)
       └─────┬─────┘
             │
         [ Batal ] ──────► (Rollback stok batch, Reversal jurnal debet/kredit)
             │
             ▼
       ┌───────────┐
       │   BATAL   │ ◄─── (Arsip pembatalan untuk audit trail)
       └───────────┘
```

---

### B. Entitas `DetailTransaksi` (Line Items)
* **Deskripsi:** Baris rincian barang per transaksi.
* **Atribut Utama:**
  * `transaksi_id`: Foreign Key ke `transaksis`.
  * `barang_id`: Foreign Key ke `barangs`.
  * `qty`: Decimal(12,2), Wajib > 0.
  * `harga_satuan`: Decimal(15,2), Wajib >= 0.
  * `subtotal`: Decimal(15,2), Invariant: `qty * harga_satuan`.
  * `hpp_satuan`: Decimal(15,2), Nilai rata-rata tertimbang FIFO dari batch yang terpakai.
  * `total_hpp`: Decimal(15,2), Invariant: `qty * hpp_satuan`.
* **Atribut Khusus Telur (Grading Fisik):**
  * `telur_bentes`: Decimal(10,2) — Telur retak/pecah halus.
  * `telur_kotor`: Decimal(10,2) — Telur bernoda/kotoran kandang.
  * `telur_ceplok`: Decimal(10,2) — Telur pecah sebagian.
  * `telur_jumbo`: Decimal(10,2) — Ukuran di atas standar.

---

### C. Entitas `StokBatch` (FIFO Batch Engine)
* **Deskripsi:** Melacak setiap kelompok stok yang masuk dari peternak/supplier beserta harga perolehannya.
* **Atribut Utama:**
  * `barang_id`: Foreign Key ke `barangs`.
  * `detail_transaksi_id`: Foreign Key ke transaksi pembelian (jika ada).
  * `tanggal`: Timestamptz (Tanggal masuk barang).
  * `qty_masuk`: Decimal(12,2), Wajib > 0.
  * `qty_sisa`: Decimal(12,2), Invariant: `0 <= qty_sisa <= qty_masuk`.
  * `harga_beli`: Decimal(15,2) (HPP dasar per unit untuk batch ini).
* **Aturan FIFO (First-In, First-Out):**
  * Saat barang keluar/dijual, sistem wajib memotong `qty_sisa` dari batch yang memiliki `tanggal` terlama (`ORDER BY tanggal ASC, id ASC`).
  * Transaksi tidak boleh diselesaikan jika total `qty_sisa` seluruh batch barang tersebut kurang dari `qty` yang diminta (`InsufficientStockException`).

---

### D. Entitas `Client` (Partner Relasi Usaha)
* **Deskripsi:** Entitas master yang mengelola data Pedagang telur, Peternak supplier, Supplier pakan/obat, dan Karyawan.
* **Tipe:**
  1. `Pedagang`: Memiliki aliran transaksi Penjualan Telur/Tray dan saldo Piutang (Bon).
  2. `Peternak`: Memiliki aliran Pembelian Telur dan saldo Hutang usaha.
  3. `Supplier`: Distributor pabrikan pakan sentrat dan obat-obatan.
  4. `Karyawan`: Penerima kas bon atau operasional armada.
* **Saldo Cache:**
  * `saldo_piutang`: Total piutang yang belum terbayar oleh client.
  * `saldo_hutang`: Total hutang usaha perusahaan kepada client.

---

### E. Entitas `JurnalUmum` & `JurnalDetail` (Akuntansi Double-Entry)
* **Deskripsi:** Pencatatan buku besar akuntansi otomatis untuk setiap transaksi.
* **Aturan Akuntansi (Invariants):**
  $$\sum \text{Debit} = \sum \text{Kredit}$$
* **Mapping Standar Transaksi Penjualan Telur Kredit (Bon):**
  1. **Debit:** Piutang Usaha (Akun Aset) sebesar `total_transaksi`
  2. **Kredit:** Pendapatan Penjualan Telur (Akun Pendapatan) sebesar `total_transaksi`
  3. **Debit:** Harga Pokok Penjualan (HPP Telur) sebesar `total_hpp`
  4. **Kredit:** Persediaan Stok Telur (Akun Aset) sebesar `total_hpp`

---

## 3. Invariants & Validasi Bisnis Kritis

| Invariant | Deskripsi & Penegakan Teknis |
| :--- | :--- |
| **Atomic FIFO Integrity** | `qty_sisa` pada tabel `stok_batches` tidak boleh negatif (`CHECK (qty_sisa >= 0)`). Jika dua kasir memproses bersamaan, *database row lock* mencegah terjadinya minus stok (*race condition*). |
| **Strict Invoice Sequence** | Nomor invoice di-generate dari sequence atomik di PostgreSQL/Redis, mencegah timbulnya nomor invoice kembar atau lompat. |
| **Zero Triple-Invoicing** | Satu transaksi bisnis hanya diwakili satu entitas `Transaksi`. Laporan piutang dan HPP dibaca langsung dari jurnal detail dan relasi transaksi. |
| **Historical Immortality** | Transaksi yang statusnya `SELESAI` tidak boleh diubah (immutable). Jika terjadi kesalahan data kasir, harus diterbitkan transaksi `KOREKSI` atau `RETUR` untuk menjaga jejak audit (*audit trail*). |
| **Period Closing Lock** | Transaksi tidak dapat diinput dengan tanggal yang masuk ke dalam periode bulan yang sudah di-*closing* di tabel `monthly_account_balances`. |

---

## 4. Validasi DTO (Data Transfer Object) Contoh

```typescript
// Contoh DTO Validasi Transaksi Penjualan (Backend NestJS)
import { IsEnum, IsNotEmpty, IsNumber, IsPositive, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateItemPenjualanDto {
  @IsNumber()
  @IsPositive()
  barang_id: number;

  @IsNumber()
  @IsPositive()
  qty: number;

  @IsNumber()
  @IsPositive()
  harga_satuan: number;
}

export class CreateTransaksiPenjualanDto {
  @IsNotEmpty()
  client_id: number;

  @IsEnum(['TUNAI', 'TRANSFER', 'KREDIT_BON'])
  payment_method: 'TUNAI' | 'TRANSFER' | 'KREDIT_BON';

  @IsNotEmpty()
  tanggal: string; // ISO-8601

  @ValidateNested({ each: true })
  @Type(() => CreateItemPenjualanDto)
  @ArrayMinSize(1, { message: 'Transaksi minimal harus memiliki 1 barang' })
  items: CreateItemPenjualanDto[];
}
```
