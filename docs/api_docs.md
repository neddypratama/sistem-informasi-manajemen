# Spesifikasi REST API v1 (Api_Docs.md)
## Bima Pratama ERP 2.0 (NestJS REST Endpoints)

---

## 1. Standar & Konvensi API

* **Base URL:** `https://api.erp-bimapratama.com/api/v1` (atau `http://localhost:4000/api/v1` saat development).
* **Format Data:** JSON (`Content-Type: application/json; charset=utf-8`).
* **Autentikasi:** HTTP Bearer JWT Token (`Authorization: Bearer <access_token>`).
* **Format Response Sukses Terstandarisasi:**
```json
{
  "success": true,
  "message": "Data transaksi berhasil diambil",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 1420,
    "totalPages": 57
  }
}
```
* **Format Response Error Terstandarisasi:**
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "items.0.qty must be a positive number",
    "client_id should not be empty"
  ],
  "timestamp": "2026-10-15T15:20:00.000Z"
}
```

---

## 2. Modul Autentikasi (`/api/v1/auth`)

### `POST /auth/login`
* **Deskripsi:** Autentikasi pengguna sistem (Kasir, Admin, Akuntansi).
* **Request Body:**
```json
{
  "username": "admin",
  "password": "SuperSecretPassword123"
}
```
* **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 1,
      "name": "Budi Santoso",
      "username": "admin",
      "role": "Admin",
      "permissions": ["transaksi:read", "transaksi:write", "laporan:read"]
    }
  }
}
```

### `POST /auth/refresh`
* **Deskripsi:** Refresh access token menggunakan refresh token via HTTP-only cookie.

---

## 3. Modul Master Data (`/api/v1/master`)

### `GET /master/barangs`
* **Query Params:** `jenis_id` (optional), `search` (optional), `page` (default: 1), `limit` (default: 50).
* **Response:** Daftar barang beserta jenis dan satuan.

### `GET /master/clients`
* **Query Params:** `type` (`Pedagang` | `Peternak` | `Supplier` | `Karyawan`), `search`.
* **Response:** Daftar client beserta ringkasan saldo piutang dan hutang.

---

## 4. Modul Transaksi (`/api/v1/transaksi`)

### `GET /transaksi`
* **Query Params:**
  * `type`: `PENJUALAN` | `PEMBELIAN` | `RETUR_PENJUALAN` | `RETUR_PEMBELIAN`
  * `status`: `DRAFT` | `SELESAI` | `BATAL`
  * `startDate`: `2026-10-01`
  * `endDate`: `2026-10-15`
  * `clientId`: 12
  * `page`: 1
  * `limit`: 25
* **Response (200 OK):** Menampilkan daftar transaksi yang diindeks secara cepat tanpa N+1 query.

### `POST /transaksi/penjualan`
* **Deskripsi:** Membuat transaksi penjualan baru (Status awal: `SELESAI` atau `DRAFT`).
* **Request Body:**
```json
{
  "client_id": 4,
  "tanggal": "2026-10-15T09:30:00Z",
  "payment_method": "KREDIT_BON",
  "items": [
    {
      "barang_id": 1,
      "qty": 500.5,
      "harga_satuan": 24500,
      "telur_bentes": 2.5,
      "telur_kotor": 1.0
    },
    {
      "barang_id": 8,
      "qty": 100,
      "harga_satuan": 2200
    }
  ],
  "diskon": 0,
  "keterangan": "Pengiriman pedagang Pasar Legi",
  "status": "SELESAI"
}
```
* **Proses Otomatis di Backend:**
  1. Validasi saldo dan ketersediaan stok barang.
  2. Alokasi FIFO terhadap `stok_batches` secara berurutan.
  3. Perhitungan total HPP barang.
  4. Pembuatan 1 header `transaksis` dan item `detail_transaksis`.
  5. Posting otomatis ke `jurnal_umums` dan `jurnal_details` (Piutang vs Pendapatan, HPP vs Persediaan).
  6. Update saldo piutang client secara atomik.

---

## 5. Modul Inventory & Batch FIFO (`/api/v1/inventory`)

### `GET /inventory/stok-telur`
* **Deskripsi:** Mengambil posisi stok telur real-time beserta rincian kondisi (Utuh, Bentes, Kotor, Ceplok, Jumbo).

### `GET /inventory/batches`
* **Deskripsi:** Menampilkan rincian batch aktif (`qty_sisa > 0`) per barang dan tanggal masuk.

### `POST /inventory/opname`
* **Deskripsi:** Melakukan penyesuaian stok fisik (Stock Opname) jika ditemukan selisih riil di gudang.

---

## 6. Modul Keuangan & Piutang / Hutang (`/api/v1/keuangan`)

### `GET /keuangan/piutang`
* **Deskripsi:** Menampilkan daftar saldo piutang (bon) per pedagang/client beserta umur piutang (*aging report*).

### `POST /keuangan/piutang/pelunasan`
* **Deskripsi:** Mencatat pelunasan bon oleh pedagang.
* **Request Body:**
```json
{
  "client_id": 4,
  "tanggal": "2026-10-15T14:00:00Z",
  "nominal": 5000000,
  "payment_method": "TRANSFER",
  "rekening_bank": "BCA - 0182938123",
  "keterangan": "Pelunasan bon nota INV-20261012-004"
}
```

---

## 7. Modul Pelaporan Keuangan (`/api/v1/reports`)

### `GET /reports/laba-rugi`
* **Query Params:** `startDate=2026-10-01&endDate=2026-10-31`
* **Kinerja:** Membaca data jurnal yang sudah diindeks, respons dalam <35ms.
* **Response:**
```json
{
  "success": true,
  "data": {
    "periode": { "start": "2026-10-01", "end": "2026-10-31" },
    "pendapatan": {
      "penjualanTelur": 450250000,
      "penjualanPakan": 85000000,
      "penjualanObat": 12400000,
      "penjualanTray": 6800000,
      "pendapatanLain": 1500000,
      "total": 555950000
    },
    "hpp": {
      "hppTelur": 395000000,
      "hppPakan": 74000000,
      "hppObat": 9800000,
      "hppTray": 5200000,
      "total": 484000000
    },
    "labaKotor": 71950000,
    "bebanOperasional": {
      "gajiKaryawan": 18000000,
      "bbmArmada": 5400000,
      "pemeliharaan": 2200000,
      "total": 25600000
    },
    "labaBersih": 46350000
  }
}
```

### `GET /reports/neraca` & `GET /reports/aset`
* Membaca posisi aset lancar (Kas, Bank, Piutang, Persediaan Stok) dan liabilitas (Hutang Peternak/Supplier) dari snapshot bulanan + mutasi periode.

---

## 8. Background Export Engine (BullMQ)

### `POST /reports/export-excel`
* **Deskripsi:** Menjadwalkan generate file Excel laporan transaksi/stok besar tanpa blocking web server.
* **Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Permintaan export sedang diproses di latar belakang",
  "jobId": "job-export-9481"
}
```

### `GET /reports/export-status/:jobId`
* **Response saat selesai:**
```json
{
  "success": true,
  "status": "COMPLETED",
  "downloadUrl": "https://api.erp-bimapratama.com/downloads/laporan-penjualan-202610.xlsx"
}
```
