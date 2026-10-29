# Riwayat Perubahan & Migrasi (Changelog.md)
## Bima Pratama ERP System

Dokumen ini mencatat seluruh riwayat perubahan arsitektur, fitur, dan evolusi teknologi sistem sesuai kaidah [Semantic Versioning (SemVer)](https://semver.org/).

---

## [2.0.0] - Modernisasi Arsitektur Skala 5–10 Tahun (Masa Sekarang)

### 🚀 Ditambahkan (Added)
* **Decoupled Architecture:** Pemisahan total frontend client (React 19 + TypeScript + Vite) dan backend API (NestJS 11 + Fastify/Node.js 22 LTS).
* **Double-Entry General Ledger (Buku Besar):** Modul akuntansi berpasangan (`jurnal_umums` dan `jurnal_details`) yang mencatat debit dan kredit secara atomik.
* **Monthly Balance Snapshotting:** Tabel `monthly_account_balances` untuk menyimpan posisi saldo akhir bulanan, memangkas waktu kalkulasi laporan tahunan dari >15 detik menjadi <35 milidetik.
* **Atomic FIFO Engine:** Alokasi batch stok telur, pakan, obat, dan tray berbasis transaksi database terkunci (`SELECT ... FOR UPDATE`), mencegah *race condition* dan minus stok.
* **Virtual Data Table:** Implementasi TanStack Table v8 dengan virtual scrolling pada antarmuka kasir dan laporan, mampu menampilkan puluhan ribu baris transaksi tanpa membebani browser pengguna.
* **Background Export Queue:** Modul antrean asynchronous menggunakan Redis dan BullMQ untuk ekspor laporan Excel ribuan baris tanpa membuat web freeze.
* **Dokumentasi Lengkap:** Penambahan file master `README.md`, `design.md`, `data.md`, `model_card.md`, `api_docs.md`, `deployment.md`, dan `migration_plan.md`.

### 🔄 Diubah (Changed)
* **Penghentian Pola Triple-Invoicing:** Satu transaksi penjualan telur kini hanya menghasilkan 1 baris header `transaksis` dan item `detail_transaksis`, bukan 3 invoice terpisah (`INV-BON`, `INV-TLR`, `INV-HPP`).
* **Optimasi Index Database:** Penambahan B-Tree composite indexes pada kolom-kolom filter utama: `(tanggal, status, type)`, `(barang_id, qty_sisa, tanggal)`, dan `(client_id, tanggal)`.
* **State Management:** Penggantian Livewire server-state dengan kombinasi TanStack Query v5 (server-cache) dan Zustand (client UI state).
* **Standarisasi API:** Penggunaan format response JSON terstandarisasi `{ success, message, data, meta }`.

### ❌ Dihapus / Deprecated (Removed)
* **Livewire Volt & Mary UI:** Seluruh komponen server-rendered Blade Volt dihentikan demi menghilangkan beban re-render server.
* **Tabel `stoks` Lama:** Log stok lama yang tidak terhubung dengan batch harga dihentikan dan digantikan sepenuhnya oleh `stok_batches` dan `stok_keluar_batches`.
* **Database Session Driver:** Penggunaan tabel MySQL sebagai session store dan cache dihapus, dialihkan ke Redis In-Memory.

---

## [1.0.0] - Legacy SIM Bima Pratama (Arsip)

### 📌 Ringkasan Sistem Awal
* **Teknologi:** Laravel 12 + PHP 8.2 + Livewire 3 Volt + Mary UI (DaisyUI) + MySQL.
* **Fitur Utama yang Berhasil Dibangun:**
  * Pencatatan transaksi Telur Masuk, Telur Keluar, Telur Kembali (Retur).
  * Manajemen stok pakan sentrat, obat-obatan ternak, dan egg tray.
  * Pencatatan kas tunai, bank transfer, dan kas Deby.
  * Manajemen bon piutang pedagang dan hutang peternak.
  * Laporan Laba Rugi, Neraca Saldo, Laporan Aset, dan Laporan Pakan Curah.
  * Ekspor Excel menggunakan Maatwebsite Excel.

### ⚠️ Masalah & Bottleneck Teknis yang Muncul Setelah 1 Tahun:
1. **Kelemotan UI:** Re-render Livewire di setiap ketikan pencarian dan pagination membebani CPU server dan latensi jaringan.
2. **Penggelembungan Data 3x–4x:** Setiap penjualan memicu pembuatan 3 invoice terpisah di tabel yang sama, menyebabkan ukuran tabel membengkak drastis.
3. **Index Suppression:** Penggunaan `whereDate('tanggal', ...)` dan `whereHas('details.kategori', ...)` yang memicu *full-table scan* di database.
4. **Kalkulasi Laporan Tanpa Snapshot:** Laporan Neraca dan Aset meloop seluruh relasi client di memori PHP secara berulang, memicu kelambatan berat saat transaksi menumpuk.
