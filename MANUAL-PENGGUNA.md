# Panduan Penggunaan Modul Operasional — SIM Stok

**Dokumen Khusus Tata Cara Penggunaan & Alur Kerja Operasional Harian**

---

## Daftar Isi Panduan

1. [Alur Kerja Operasional Harian (Skenario Ringkas)](#1-alur-kerja-operasional-harian-skenario-ringkas)
2. [Modul Master Data](#2-modul-master-data)
   - [2.1 Mengelola Jenis Barang](#21-mengelola-jenis-barang)
   - [2.2 Mengelola Data Barang](#22-mengelola-data-barang)
   - [2.3 Mengelola Client (Supplier & Customer)](#23-mengelola-client-supplier--customer)
3. [Modul Pembelian](#3-modul-pembelian)
   - [3.1 Pembelian Barang (Telur, Pakan, Obat, Tray)](#31-pembelian-barang-telur-pakan-obat-tray)
   - [3.2 Pembelian Tunai vs Kredit](#32-pembelian-tunai-vs-kredit)
4. [Modul Penjualan](#4-modul-penjualan)
   - [4.1 Penjualan Barang (Telur, Pakan, Obat, Tray)](#41-penjualan-barang-telur-pakan-obat-tray)
   - [4.2 Penjualan Pakan Curah](#42-penjualan-pakan-curah)
5. [Modul Retur Transaksi](#5-modul-retur-transaksi)
   - [5.1 Retur Penjualan (Pengembalian dari Pelanggan)](#51-retur-penjualan-pengembalian-dari-pelanggan)
   - [5.2 Retur Pembelian (Pengembalian ke Pemasok)](#52-retur-pembelian-pengembalian-ke-pemasok)
6. [Modul Stok & Opname](#6-modul-stok--opname)
   - [6.1 Memeriksa Stok & Batch FIFO](#61-memeriksa-stok--batch-fifo)
   - [6.2 Melakukan Stok Opname (Penyesuaian Fisik)](#62-melakukan-stok-opname-penyesuaian-fisik)
   - [6.3 Mengunduh / Memeriksa Laporan Stok](#63-mengunduh--memeriksa-laporan-stok)
7. [Modul Keuangan, Hutang & Piutang](#7-modul-keuangan-hutang--piutang)
   - [7.1 Melakukan Pembayaran Hutang ke Pemasok](#71-melakukan-pembayaran-hutang-ke-pemasok)
   - [7.2 Menerima Pelunasan Piutang dari Pelanggan](#72-menerima-pelunasan-piutang-dari-pelanggan)
   - [7.3 Memantau Saldo Per Client & Kas](#73-memantau-saldo-per-client--kas)
8. [Modul Entri Jurnal Manual](#8-modul-entri-jurnal-manual)
   - [8.1 Mencatat Pengeluaran Beban (Operasional/Gaji/Listrik)](#81-mencatat-pengeluaran-beban-operasionalgajilistrik)
   - [8.2 Mencatat Penerimaan Kas Non-Transaksi](#82-mencatat-penerimaan-kas-non-transaksi)
   - [8.3 Transfer / Pindah Buka Kas](#83-transfer--pindah-buka-kas)
9. [Modul Laporan Keuangan](#9-modul-laporan-keuangan)
   - [9.1 Membuka & Mencetak Laporan Laba Rugi](#91-membuka--mencetak-laporan-laba-rugi)
   - [9.2 Membuka Buku Besar Per Akun](#92-membuka-buku-besar-per-akun)
   - [9.3 Membuka Neraca Keuangan](#93-membuka-neraca-keuangan)

---

## 1. Alur Kerja Operasional Harian (Skenario Ringkas)

| Jam / Urutan | Aktivitas | Modul yang Digunakan |
|---|---|---|
| **Awal Pagi** | 1. Cek stok fisik menipis di Dashboard<br>2. Cek saldo Kas di Monitoring Kas | Dashboard (`/`)<br>Monitoring Kas (`/akuntansi/kas`) |
| **Siang (Penerimaan)** | 1. Input pembelian barang dari supplier (Tunai / Kredit)<br>2. Verifikasi penambahan stok di FIFO | Pembelian (`/transaksi/pembelian/*`)<br>FIFO (`/stok/fifo`) |
| **Sepanjang Hari** | 1. Input penjualan barang ke customer<br>2. Terima pembayaran piutang atau bayar hutang | Penjualan (`/transaksi/penjualan/*`)<br>Piutang (`/akuntansi/piutang`) |
| **Akhir Hari** | 1. Catat beban harian (bensin/konsumsi/operasional)<br>2. Cek Laporan Laba Rugi Harian | Entri Jurnal Beban (`/jurnal/beban`)<br>Laba Rugi (`/laporan/laba-rugi`) |

---

## 2. Modul Master Data

Petunjuk penginputan data dasar sebelum transaksi dapat dilakukan.

### 2.1 Mengelola Jenis Barang

1. Buka menu **Master Data → Jenis Barang** (`/jenis-barang`).
2. **Menambah Jenis Barang Baru:**
   - Klik tombol **+ Tambah Jenis Barang** di kanan atas.
   - Isi **Nama Jenis Barang** (contoh: `Telur Bebek Grade A`).
   - Pilih **Kelompok**: `Telur`, `Pakan`, `Obat`, atau `Tray`.
   - Isi **Keterangan** (opsional).
   - Pastikan **Status** terpilih `Aktif`.
   - Klik **Simpan**.
3. **Mengubah / Menonaktifkan:**
   - Klik tombol **Ubah** di baris barang yang ingin diedit.
   - Jika jenis barang sudah tidak dijual, ubah status menjadi `Nonaktif` agar tidak membingungkan kasir saat membuat barang baru.

---

### 2.2 Mengelola Data Barang

1. Buka menu **Master Data → Barang** (`/barang`).
2. **Menambah Barang Baru:**
   - Klik tombol **+ Tambah Barang**.
   - Pilih **Jenis Barang** (harus dibuat terlebih dahulu di menu Jenis Barang).
   - Isi **Kode Barang** (harus unik, contoh: `TLR-BBK-001`).
   - Isi **Nama Barang** (contoh: `Telur Bebek Fresh`).
   - Isi **Satuan** (contoh: `kg`, `ikat`, `dus`, `sak`).
   - Klik **Simpan**.

> **Tips Kasir:** Jangan mencari tempat menginput "Harga Beli" atau "Harga Jual" di menu ini. Harga diinput secara dinamis sewaktu Anda membuat nota Pembelian atau Penjualan.

---

### 2.3 Mengelola Client (Supplier & Customer)

1. Buka menu **Master Data → Client** (`/client`).
2. **Menambah Client Baru:**
   - Klik tombol **+ Tambah Client**.
   - Isi **Nama** (nama toko, peternak, atau pembeli perorangan).
   - Pilih **Tipe**:
     - `Supplier` : Untuk pihak penyedia/pemasok barang.
     - `Customer` : Untuk pihak pembeli.
     - `Keduanya` : Jika pihak tersebut bisa bertindak sebagai pembeli sekaligus penyedia barang.
   - Isi **Telepon / WhatsApp** dan **Alamat**.
   - Klik **Simpan**.

---

## 3. Modul Pembelian

Digunakan saat menerima pasokan barang baru dari supplier.

### 3.1 Pembelian Barang (Telur, Pakan, Obat, Tray)

1. Buka menu sesuai kelompok barang yang dibeli:
   - **Pembelian → Pembelian Telur** (`/transaksi/pembelian/telur`)
   - **Pembelian → Pembelian Pakan** (`/transaksi/pembelian/pakan`)
   - **Pembelian → Pembelian Obat** (`/transaksi/pembelian/obat`)
   - **Pembelian → Pembelian Tray** (`/transaksi/pembelian/tray`)
2. Klik tombol **+ Transaksi Pembelian Baru**.
3. **Mengisi Header Nota:**
   - Nomor Faktur akan terisi otomatis oleh sistem.
   - Pilih **Tanggal Transaksi**.
   - Pilih nama **Client / Supplier**.
   - Pilih **Metode Pembayaran**:
     - `Tunai` : Pembayaran langsung saat itu juga.
     - `Kredit` : Pembayaran ditangguhkan (menjadi Hutang Usaha).
   - Jika memilih `Tunai`, pilih **Akun Pembayaran** (misal: *Kas Tunai* atau *Bank BCA*).
4. **Mengisi Rincian Barang (Item):**
   - Pilih **Barang** dari daftar.
   - Isi **Jumlah (Qty)** barang yang diterima.
   - Isi **Harga Satuan (Beli)** per unit.
   - Total harga per baris akan dihitung otomatis.
   - Klik **+ Tambah Item** jika ada lebih dari 1 barang dalam 1 nota.
5. Klik **Simpan Transaksi**.

> **Efek Otomatis Sistem:**
> Stok fisik barang bertambah, batch FIFO baru tercipta dengan harga beli tersebut, dan jurnal keuangan otomatis tercatat.

---

## 4. Modul Penjualan

Digunakan saat melayani transaksi penjualan barang kepada pembeli/pelanggan.

### 4.1 Penjualan Barang (Telur, Pakan, Obat, Tray)

1. Buka menu sesuai barang yang dijual:
   - **Penjualan → Penjualan Telur** (`/transaksi/penjualan/telur`)
   - **Penjualan → Penjualan Pakan** (`/transaksi/penjualan/pakan`)
   - **Penjualan → Penjualan Obat** (`/transaksi/penjualan/obat`)
   - **Penjualan → Penjualan Tray** (`/transaksi/penjualan/tray`)
2. Klik tombol **+ Transaksi Penjualan Baru**.
3. Pilih **Client / Pembeli**.
4. Pilih **Metode Pembayaran**:
   - `Tunai` : Uang langsung diterima masuk ke Kas/Bank.
   - `Kredit` : Dicatat sebagai Piutang pelanggan.
5. Isi **Item Barang**, **Qty Penjualan**, dan **Harga Jual Satuan**.
6. Periksa total akhir, lalu klik **Simpan Transaksi**.

> **Efek Otomatis Sistem:**
> Stok terpotong dari batch FIFO terlama, HPP dihitung otomatis berdasarkan modal asli batch tersebut, dan saldo Kas/Piutang bertambah.

---

### 4.2 Penjualan Pakan Curah

Khusus untuk transaksi produk Pakan Curah:
1. Buka **Penjualan → Penjualan Pakan** (`/transaksi/penjualan/pakan`).
2. Pilih barang kategori Pakan Curah.
3. Transaksi akan otomatis membukukan Pendapatan & Piutang ke akun khusus Pakan Curah agar dapat dipantau di **Laporan Laba Rugi Pakan Curah**.

---

## 5. Modul Retur Transaksi

### 5.1 Retur Penjualan (Pengembalian dari Pelanggan)

Digunakan saat pembeli mengembalikan barang karena rusak atau tidak sesuai.

1. Buka **Retur & Riwayat → Retur Penjualan** (`/retur/penjualan`).
2. Klik tombol **+ Retur Penjualan Baru**.
3. Pilih **Nota Penjualan Asal** yang ingin diretur.
4. Tentukan item barang dan jumlah (Qty) yang dikembalikan.
5. Pilih perlakuan pengembalian dana:
   - `Kembalikan Tunai` : Kasir menyerahkan uang tunai kembali ke pelanggan.
   - `Potong Piutang` : Memotong sisa tagihan/piutang pelanggan tersebut.
6. Klik **Simpan Retur**. (Stok akan otomatis dikembalikan ke gudang).

---

### 5.2 Retur Pembelian (Pengembalian ke Pemasok)

Digunakan saat kita mengembalikan barang ke supplier.

1. Buka **Retur & Riwayat → Retur Pembelian** (`/retur/pembelian`).
2. Klik **+ Retur Pembelian Baru**.
3. Pilih **Nota Pembelian Asal**.
4. Isi item dan Qty yang dikembalikan.
5. Pilih perlakuan: `Terima Kas` atau `Potong Hutang`.
6. Klik **Simpan Retur**. (Stok gudang akan berkurang otomatis).

---

## 6. Modul Stok & Opname

### 6.1 Memeriksa Stok & Batch FIFO

1. **Memeriksa Total Stok:** Buka menu **Stok → Stok Barang** (`/stok`). Cari nama barang untuk melihat sisa stok fisik saat ini.
2. **Memeriksa Rincian Batch FIFO:** Buka menu **Stok → FIFO** (`/stok/fifo`).
   - Anda dapat melihat modal harga beli tiap batch penerimaan dan sisa unit yang tersisa pada batch tersebut.

---

### 6.2 Melakukan Stok Opname (Penyesuaian Fisik)

Lakukan prosedur ini saat menghitung ulang fisik barang di gudang (misal akhir bulan).

1. Buka menu **Stok → Stok Opname** (`/stok/opname`).
2. Klik tombol **+ Stok Opname Baru**.
3. Pilih **Barang** yang dihitung.
4. Masukkan **Stok Fisik Real** (hasil hitungan nyata di gudang).
5. Sistem akan menghitung otomatis **Selisih** (`Stok Fisik - Stok Sistem`).
6. Tuliskan **Keterangan / Alasan Selisih** (contoh: *Telur pecah 5 butir* atau *Pakan rusak terkena air*).
7. Klik **Simpan**.

> **Pemberitahuan:** Sistem akan otomatis membukukan selisih stok tersebut ke Beban Kerusakan / Selisih Stok dan menyesuaikan jumlah stok sistem agar sesuai dengan fisik gudang.

---

## 7. Modul Keuangan, Hutang & Piutang

### 7.1 Melakukan Pembayaran Hutang ke Pemasok

1. Buka menu **Akuntansi → Hutang** (`/akuntansi/hutang`).
2. Gunakan **Filter Client** untuk memilih nama Supplier yang ingin dibayar.
3. Klik tombol **Bayar Hutang**.
4. Pilih **Client / Supplier**.
5. Pilih **Akun Pembayaran** (Kas Tunai / Bank tempat uang keluar).
6. Isi **Nominal Pembayaran** yang disetorkan.
7. Isi Tanggal dan Keterangan, lalu klik **Simpan Pembayaran**.

---

### 7.2 Menerima Pelunasan Piutang dari Pelanggan

1. Buka menu **Akuntansi → Piutang** (`/akuntansi/piutang`).
2. Filter nama Customer jika diperlukan.
3. Klik tombol **Terima Piutang**.
4. Pilih **Client / Customer**.
5. Pilih **Akun Penerima** (Kas / Bank tempat uang masuk).
6. Isi **Nominal Pelunasan** yang diterima.
7. Klik **Simpan Penerimaan**.

---

### 7.3 Memantau Saldo Per Client & Kas

- **Monitoring Kas (`/akuntansi/kas`):** Buka menu ini untuk melihat sisa uang tunai di brankas dan saldo di masing-masing rekening bank.
- **Saldo Per Client (`/akuntansi/saldo-client`):** Buka menu ini untuk melihat rekapitulasi siapa saja pelanggan yang masih berhutang dan supplier mana saja yang belum kita lunasi.

---

## 8. Modul Entri Jurnal Manual

Digunakan oleh bagian keuangan untuk mencatat transaksi non-operasional barang.

### 8.1 Mencatat Pengeluaran Beban (Operasional/Gaji/Listrik)

1. Buka menu **Entri Jurnal → Beban** (`/jurnal/beban`).
2. Klik **+ Jurnal Beban Baru**.
3. Pilih **Akun Beban** (contoh: *Beban Listrik & Air*, *Beban Gaji*, *Beban Bensin*).
4. Pilih **Akun Kas/Bank** yang digunakan untuk membayar.
5. Isi **Nominal (Rp)** dan **Keterangan**.
6. Klik **Simpan**.

---

### 8.2 Mencatat Penerimaan Kas Non-Transaksi

1. Buka menu **Entri Jurnal → Pendapatan** (`/jurnal/pendapatan`).
2. Klik **+ Jurnal Pendapatan Baru**.
3. Pilih **Akun Kas/Bank** penerima.
4. Pilih **Akun Pendapatan Lawan** (contoh: *Pendapatan Lain-Lain*).
5. Isi Nominal dan Keterangan, lalu klik **Simpan**.

---

## 9. Modul Laporan Keuangan

### 9.1 Membuka & Mencetak Laporan Laba Rugi

1. Buka menu **Laporan → Laba Rugi** (`/laporan/laba-rugi`).
2. Pilih **Tanggal Awal** dan **Tanggal Akhir** periode laporan (misal: `01/09/2026` s/d `30/09/2026`).
3. **WAJIB KLIK TOMBOL "Tampilkan"** agar data dihitung.
4. Laporan akan menampilkan Pendapatan Bersih, Total HPP, Laba Kotor, Rincian Beban, dan Laba Bersih Akhir.
5. Gunakan tombol Cetak browser (`Ctrl + P`) jika ingin mencetak ke kertas atau PDF.

---

### 9.2 Membuka Buku Besar Per Akun

1. Buka menu **Laporan → Buku Besar** (`/laporan/buku-besar`).
2. Pilih **Akun** yang ingin diperiksa mutasinya (misal: *Kas Tunai* atau *Hutang Usaha*).
3. Pilih Rentang Tanggal.
4. Klik **Tampilkan**. Anda dapat melihat riwayat setiap rupiah yang masuk dan keluar beserta running balance-nya.

---

### 9.3 Membuka Neraca Keuangan

1. Buka menu **Laporan → Neraca** (`/laporan/neraca`).
2. Pilih **Per Tanggal** Neraca.
3. Klik **Tampilkan**.
4. Sistem menampilkan keseimbangan posisi Aktiva (Aset) dan Pasiva (Kewajiban + Laba Tahun Berjalan).

