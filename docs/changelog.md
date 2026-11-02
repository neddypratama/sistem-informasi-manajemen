# Riwayat Perubahan & Migrasi (Changelog.md)
## Bima Pratama ERP System

Dokumen ini mencatat seluruh riwayat perubahan arsitektur, fitur, dan evolusi teknologi sistem sesuai kaidah [Semantic Versioning (SemVer)](https://semver.org/).

---

## [2.1.0] - Pembaruan Fitur Operasional & Hak Akses Granular (November 2026)

### 🚀 Ditambahkan (Added)
* **Matriks Hak Akses Granular (CRUD per Sub-Fitur):** Pembagian izin Create, Read, Update, Delete secara terpisah untuk setiap sub-fitur komoditas (Telur, Pakan Pabrikan, Pakan Curah, Obat, Tray, Stok, Keuangan, Laporan, Master).
* **Search Select Retur Transaksi Pintar:** Komponen `SearchableTransactionSelect` yang memungkinkan pencarian nota asal saat retur berdasarkan nomor invoice, nama mitra, tanggal, maupun nama produk dalam nota.
* **Modul Terpadu Pakan Curah (Pak Pri):** Portal khusus `/curah-pak-pri` yang mengintegrasikan 4 kartu KPI modal talangan dan stok, 3 tab fungsional (Operasional Mbak Pakan, Audit Kas & Belanja Bahan Pak Pri, dan Konversi Racik Pakan).
* **Konversi Barang & Reproses Persediaan:** Fitur peracikan dan transformasi produk lintas komoditas dengan kalkulasi rendemen dan susut otomatis.
* **Filter Periode Tanggal Terpadu:** Quick date filter (Hari Ini, Bulan Ini, Bulan Lalu, Semua, Custom Date) di seluruh modul transaksi dan audit.

### 🔄 Diubah (Changed)
* **Penyelarasan Menu Komoditas di Sidebar:** Pemisahan navigasi menjadi `Menu Telur`, `Pakan Pabrikan`, `Pakan Curah (Pak Pri)`, `Menu Obat`, dan `Menu Tray`.
* **Clean UI & Form Refinement:** Menghilangkan teks petunjuk manual metode akuntansi yang membebani tampilan modal transaksi dan retur.
* **Pembaruan Buku Panduan Penggunaan:** Dokumen resmi User Manual diperbarui dalam 3 format (Word .docx, HTML, dan PDF) yang otomatis disinkronkan ke root dan folder `/docs`.

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
