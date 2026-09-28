# Buku Manual — SIM Stok

**Sistem Informasi Manajemen Bisnis & Akuntansi**

| | |
|---|---|
| **Nama aplikasi di layar** | SIM Stok |
| **Tagline** | Bisnis & Akuntansi |
| **Versi** | v1.0 |
| **Alamat produksi** | https://simv2.bimapratama.com |
| **Login** | https://simv2.bimapratama.com/login |
| **Bahasa antarmuka** | Indonesia |

---

## Daftar Isi

- [Bagian 0 — Pendahuluan](#bagian-0--pendahuluan)
- [Bagian 1 — Login & Navigasi](#bagian-1--login--navigasi)
- [Bagian 2 — Peran, User & Hak Akses](#bagian-2--peran-user--hak-akses)
- [Bagian 3 — Master Data](#bagian-3--master-data)
- [Bagian 4 — Pembelian & Penjualan](#bagian-4--pembelian--penjualan)
- [Bagian 5 — Retur](#bagian-5--retur)
- [Bagian 6 — Stok](#bagian-6--stok)
- [Bagian 7 — Akuntansi](#bagian-7--akuntansi)
- [Bagian 8 — Laporan](#bagian-8--laporan)
- [Bagian 9 — Dashboard](#bagian-9--dashboard)
- [Bagian 10 — Log Aktivitas](#bagian-10--log-aktivitas)
- [Bagian 11 — Tips, Fitur yang Belum Tersedia & Jebakan](#bagian-11--tips-fitur-yang-belum-tersedia--jebakan)
- [Bagian 12 — Lampiran Administrator](#bagian-12--lampiran-administrator)
- [Glosarium](#glosarium)

---

## Bagian 0 — Pendahuluan

### 0.1 Tentang aplikasi ini

SIM Stok adalah aplikasi **Sistem Informasi Manajemen** untuk usaha peternakan dan perdagangan pakan ternak. Aplikasi mencatat empat jenis barang utama:

| Kelompok | Contoh |
|---|---|
| **Telur** | Telur Bebek, Telur Horn, Telur Puyuh, Telur Arab, Telur Asin |
| **Pakan** | Pakan Sentrat/Pabrikan, Pakan Curah, Pakan Kucing |
| **Obat** | Obat-Obatan & vitamin ternak |
| **Tray** | Tray tempat telur |

Aplikasi ini mencakup: pengguna & hak akses, master data, pembelian & penjualan, retur, pengelolaan stok dengan metode **FIFO**, pembukuan akuntansi (jurnal, hutang, piutang, kas), serta laporan (buku besar, neraca, laba rugi).

### 0.2 Siapa pembaca manual ini

| Peran pembaca | Bagian yang paling relevan |
|---|---|
| **Operator harian** (pembelian, penjualan, kas) | Bagian 1, 4, 5, 6, 7 |
| **Admin aplikasi** (atur user, role, master data akun) | Bagian 2, 3, 7 |
| **Admin server** (deploy & pemeliharaan) | Bagian 12 |

### 0.3 Cara membaca dokumen ini

- Tabel **"Field"** berisi nama yang tampil di layar (label UI) dan nama kolom di sistem.
- Tabel **"Validasi"** berisi aturan yang diterapkan sistem saat menyimpan. Pelanggan akan memunculkan pesan error berwarna merah.
- Kata kunci **Penting:** menandai hal yang berdampak besar pada data atau akuntansi.

---

## Bagian 1 — Login & Navigasi

### 1.1 Masuk ke aplikasi

1. Buka browser (Chrome / Edge / Firefox) ke alamat **https://simv2.bimapratama.com/login**.
2. Isi **Username** dan **Password**.
3. Klik tombol **Masuk**.

> **Catatan:** Login memakai **username**, bukan email. Tidak ada tombol "Ingat saya" dan tidak ada fitur "Lupa password".

### 1.2 Pesan yang muncul saat login gagal

| Situasi | Pesan yang muncul |
|---|---|
| Username atau password salah | `Username atau password salah.` |
| Akun dinonaktifkan (status `inactive`) | `Akun Anda telah dinonaktifkan.` |
| Gangguan jaringan / server | `Login gagal. Periksa kembali kredensial Anda.` |

Pesan muncul dalam kotak merah di atas formulir.

### 1.3 Keluar dari aplikasi

Klik tombol **Keluar** di pojok kanan atas layar. Sesi Anda diakhiri dan Anda kembali ke halaman login.

### 1.4 Memahami tampilan utama

Setelah login, Anda melihat tiga area:

| Area | Isi |
|---|---|
| **Sidebar (kiri)** | Daftar menu, dikelompokkan per modul. Hanya menu yang sesuai hak akses Anda yang tampil. |
| **Header (atas)** | Sapaan `Selamat datang, <nama>`, avatar inisial, nama & role Anda, tombol **Keluar**. |
| **Konten (tengah)** | Halaman yang sedang dibuka. |

**Sidebar** dapat dilipat (ciutkan) dengan tombol di bagian atas sidebar. Saat dilipat, menu berubah menjadi ikon dan muncul menu mengambang (flyout) saat diklik. Di layar HP/tablet, sidebar tersembunyi dan dibuka lewat tombol garis tiga di kiri atas.

**Grup menu yang sedang aktif** terbuka otomatis, dan menu yang sedang Anda buka ditandai dengan warna hijau.

### 1.5 Peta menu lengkap

Menu hanya tampil bila Anda punya hak akses (permission) yang sesuai. Tabel berikut menampilkan seluruh menu, alamatnya, dan hak akses yang membukanya.

| Grup | Menu | Alamat | Hak akses |
|---|---|---|---|
| **Dashboard** | Dashboard | `/` | Semua user yang sudah login |
| **Master Data** | Jenis Barang | `/jenis-barang` | `menu.master.jenis_barang` |
| | Barang | `/barang` | `menu.master.barang` |
| | Client | `/client` | `menu.master.client` |
| **Pembelian** | Pembelian Telur | `/transaksi/pembelian/telur` | `menu.pembelian.telur` |
| | Pembelian Pakan | `/transaksi/pembelian/pakan` | `menu.pembelian.pakan` |
| | Pembelian Obat | `/transaksi/pembelian/obat` | `menu.pembelian.obat` |
| | Pembelian Tray | `/transaksi/pembelian/tray` | `menu.pembelian.tray` |
| **Penjualan** | Penjualan Telur | `/transaksi/penjualan/telur` | `menu.penjualan.telur` |
| | Penjualan Pakan | `/transaksi/penjualan/pakan` | `menu.penjualan.pakan` |
| | Penjualan Obat | `/transaksi/penjualan/obat` | `menu.penjualan.obat` |
| | Penjualan Tray | `/transaksi/penjualan/tray` | `menu.penjualan.tray` |
| **Retur & Riwayat** | Retur Penjualan | `/retur/penjualan` | `menu.retur.penjualan` |
| | Retur Pembelian | `/retur/pembelian` | `menu.retur.pembelian` |
| | Riwayat Transaksi | `/transaksi/riwayat` | `menu.transaksi.riwayat` **dan** role SuperAdmin/Admin |
| **Stok** | Stok Barang | `/stok` | `menu.stok.barang` |
| | FIFO | `/stok/fifo` | `menu.stok.fifo` |
| | Stok Opname | `/stok/opname` | `menu.stok.opname` |
| | Riwayat Stok | `/stok/riwayat` | `menu.stok.riwayat` |
| | Laporan Stok | `/stok/laporan` | `menu.stok.laporan` |
| **Akuntansi** | Saldo Per Client | `/akuntansi/saldo-client` | `menu.akuntansi.saldo_client` |
| | Hutang | `/akuntansi/hutang` | `menu.akuntansi.hutang` |
| | Piutang | `/akuntansi/piutang` | `menu.akuntansi.piutang` |
| | Jurnal Umum | `/akuntansi/jurnal` | `menu.akuntansi.jurnal` |
| | Monitoring Kas | `/akuntansi/kas` | `menu.akuntansi.kas` |
| **Entri Jurnal** | Kas | `/jurnal/kas` | `menu.jurnal.kas` |
| | Beban | `/jurnal/beban` | `menu.jurnal.beban` |
| | Pendapatan | `/jurnal/pendapatan` | `menu.jurnal.pendapatan` |
| | Akun | `/akun` | `menu.jurnal.akun` |
| | Kategori Akun | `/kategori` | `menu.jurnal.kategori` |
| **Laporan** | Buku Besar | `/laporan/buku-besar` | `menu.laporan.buku_besar` |
| | Neraca | `/laporan/neraca` | `menu.laporan.neraca` |
| | Laba Rugi | `/laporan/laba-rugi` | `menu.laporan.laba_rugi` |
| | Laba Rugi Pakan Curah | `/laporan/laba-rugi-curah` | `menu.laporan.laba_rugi_curah` |
| **Akses** | Role Permission | `/role` | `menu.akses.role` |
| | User | `/user` | `menu.akses.user` |
| | Log Aktivitas | `/akses/log-aktivitas` | `menu.akses.log` |

> **Catatan:** Menu **Akun** dan **Kategori Akun** berada di grup **Entri Jurnal**, bukan di Master Data.

### 1.6 Kalau halaman tidak bisa dibuka

Jika Anda membuka halaman tanpa hak akses, layar akan menampilkan kotak merah berisi:

```
Anda tidak memiliki izin untuk mengakses halaman ini.
```

atau pesan khusus per modul, misalnya `Anda tidak memiliki izin untuk mengelola transaksi.`

**Solusi:** minta admin aplikasi untuk menambahkan hak akses yang sesuai ke role Anda (lihat Bagian 2.6).

### 1.7 Menyegarkan halaman (refresh)

Aplikasi ini adalah aplikasi satu halaman (SPA). Menekan **F5** atau membuka ulang alamat halaman (misal `/transaksi/riwayat`) tetap akan menampilkan halaman yang benar — sistem membaca sesi Anda dari cookie. Alamat yang tidak dikenal akan diarahkan kembali ke Dashboard.

---

## Bagian 2 — Peran, User & Hak Akses

### 2.1 Konsep role dan permission

- **Permission** adalah izin untuk membuka sebuah menu. Ada **36** permission, semuanya berformat `menu.<grup>.<menu>`.
- **Role** adalah kumpulan permission. Setiap user punya satu role. Role menentukan menu apa saja yang bisa diakses.
- **Selain izin menu**, ada aturan **visibilitas data**: user biasa hanya melihat data yang ia buat sendiri. Role **SuperAdmin** dan **Admin** melihat seluruh data semua user.

### 2.2 Daftar role bawaan

| Role | Jumlah izin | Penjelasan |
|---|---|---|
| **SuperAdmin** | Semua (36) | Akses penuh ke semua menu, melihat semua data, dan tidak dapat dihapus/dinonaktifkan. |
| **Admin** | 34 | Semua modul, termasuk Log Aktivitas. Tidak bisa mengelola role/user (untuk mencegah eskalasi hak). |
| **Pembelian Telur** | 1 | Hanya menu Pembelian Telur. |
| **Penjualan Pakan dan Obat** | 2 | Hanya menu Penjualan Pakan & Obat. |
| **Kas Tunai** | 14 | Akuntansi, Entri Jurnal, dan Laporan (untuk pembukuan & pelunasan tunai). |
| **Kas Transfer** | 5 | Pembelian Pakan/Obat/Tray dan Penjualan Telur/Tray. |

### 2.3 User bawaan

Berikut akun yang otomatis dibuat saat aplikasi pertama kali di-install (diisi oleh *seeder*).

| No | Nama | Username | Role | Password |
|---|---|---|---|---|
| 1 | Super Administrator | `superadmin` | SuperAdmin | `1234` |
| 2 | Administrator | `admin` | Admin | `1234` |
| 3 | Petugas Pembelian Telur | `pembelian_telur` | Pembelian Telur | `1234` |
| 4 | Petugas Penjualan Pakan & Obat | `penjualan_pakan_obat` | Penjualan Pakan dan Obat | `1234` |
| 5 | Petugas Kas Tunai | `kas_tunai` | Kas Tunai | `1234` |
| 6 | Petugas Kas Transfer | `kas_transfer` | Kas Transfer | `1234` |

> **Penting:** password bawaan `1234` sangat lemah. Ganti password akun-akun ini segera setelah instalasi, lewat menu **Akses → User**.

### 2.4 Membuat user baru

1. Buka menu **Akses → User** (`/user`).
2. Klik tombol **+ User Baru**.
3. Isi formulir:

| Field | Keterangan | Aturan |
|---|---|---|
| Nama | Nama lengkap | Wajib diisi, maks. 255 karakter |
| Username | Nama pengguna untuk login | Wajib, unik, maks. 100 karakter |
| Email | Alamat email | Wajib, unik, maks. 255 karakter |
| Password | Kata sandi | Wajib, minimal **6 karakter** |
| Role | Peran | Wajib dipilih (hanya role aktif) |
| Status | `Active` / `Inactive` | Wajib, default `Active` |

4. Klik **Simpan**.

> **Catatan:** Saat **mengubah** user, kolom Password berubah label menjadi `Password (kosongkan bila tidak diubah)`. Kosongkan bila tidak ingin mengganti password.

### 2.5 Mengubah, menonaktifkan, atau menghapus user

Di halaman User, tiap baris punya tombol **Ubah** dan **Hapus**.

- **Ubah** — untuk mengganti nama, email, role, status, atau password.
- **Hapus** — untuk menghapus akun. Anda **tidak dapat menghapus akun sendiri**.

> **Penting:** user dengan status `Inactive` tidak dapat login (muncul pesan `Akun Anda telah dinonaktifkan.`).

### 2.6 Mengatur role dan permission

1. Buka menu **Akses → Role Permission** (`/role`).
2. Klik **+ Role Baru**, atau **Ubah** pada role yang sudah ada.
3. Isi:

| Field | Keterangan |
|---|---|
| Nama Role | Wajib, unik, maks. 100 karakter |
| Deskripsi | Opsional |
| Status | `Active` / `Inactive` |
| Hak Akses Menu & Feature Permission | Daftar 36 permission (checkbox). Centang izin yang ingin diberikan. |

4. Klik **Simpan**.

> **Penting:**
> - Daftar hak akses yang Anda atur **menggantikan seluruh** izin sebelumnya (bukan menambah).
> - Role **SuperAdmin** tidak dapat diubah namanya, tidak dapat dinonaktifkan, dan tidak dapat dihapus.
> - Role yang masih dipakai user **tidak dapat dihapus**.
> - Permission buatan sendiri hanya berlaku bila namanya sama persis dengan salah satu dari 36 permission bawaan.

### 2.7 Aturan khusus SuperAdmin

- **Semua permission** otomatis dimiliki SuperAdmin, meski di daftar checkbox tidak dicentang.
- SuperAdmin dan Admin adalah satu-satunya role yang bisa membuka **Riwayat Transaksi** dan melihat **Dashboard** lengkap.

---

## Bagian 3 — Master Data

Master data mencakup data referensi dasar yang digunakan dalam transaksi, pencatatan stok, dan akuntansi.

### 3.1 Jenis Barang

Dikelola melalui menu **Master Data → Jenis Barang** (`/jenis-barang`).

| Field | Tipe | Keterangan & Aturan Validasi |
|---|---|---|
| **Nama Jenis Barang** | Teks | Wajib diisi, unik, contoh: `Telur Bebek`, `Pakan Sentrat` |
| **Kelompok** | Pilihan | Wajib memilih salah satu: `Telur`, `Pakan`, `Obat`, `Tray` |
| **Keterangan** | Teks | Opsional |
| **Status** | Pilihan | `Aktif` / `Nonaktif` (default: `Aktif`) |

> **Catatan:** Mengubah status jenis barang menjadi `Nonaktif` membuat jenis barang tersebut tidak dapat dipilih saat membuat barang baru.

---

### 3.2 Barang

Dikelola melalui menu **Master Data → Barang** (`/barang`).

| Field | Tipe | Keterangan & Aturan Validasi |
|---|---|---|
| **Jenis Barang** | Pilihan | Wajib dipilih dari daftar jenis barang aktif |
| **Kode Barang** | Teks | Wajib diisi, unik, contoh: `TLR-BBK-01`, `PKN-CRH-01` |
| **Nama Barang** | Teks | Wajib diisi |
| **Satuan** | Teks | Wajib diisi, contoh: `kg`, `ikat`, `sak`, `dus`, `biji`, `ikat (30 biji)` |
| **Status** | Pilihan | `Aktif` / `Nonaktif` (default: `Aktif`) |

> **Penting Mengenai Harga & Stok:**
> - Master Barang **tidak menyimpan harga beli/jual**. Harga ditentukan secara dinamis pada saat formulir transaksi diisi.
> - Angka **Stok** di master barang dihitung otomatis dari total sisa stok FIFO (batch penerimaan).

---

### 3.3 Client (Pemasok & Pelanggan)

Dikelola melalui menu **Master Data → Client** (`/client`). Client mencakup pemasok (supplier) maupun pembeli (customer).

| Field | Tipe | Keterangan & Aturan Validasi |
|---|---|---|
| **Nama** | Teks | Wajib diisi, nama perorangan atau toko/peternakan |
| **Tipe** | Pilihan | `Supplier`, `Customer`, atau `Keduanya` |
| **Telepon** | Teks | Opsional, nomor kontak/WhatsApp |
| **Alamat** | Teks | Opsional |
| **Status** | Pilihan | `Aktif` / `Nonaktif` (default: `Aktif`) |

---

### 3.4 Kategori Akun

Dikelola melalui menu **Entri Jurnal → Kategori Akun** (`/kategori`).

| Field | Tipe | Keterangan & Aturan Validasi |
|---|---|---|
| **Kode Kategori** | Teks | Wajib diisi, unik, contoh: `1`, `1.1`, `2`, `4`, `5` |
| **Nama Kategori** | Teks | Wajib diisi, contoh: `Aset Lancar`, `Beban Operasional` |
| **Tipe** | Pilihan | `Pendapatan`, `Pengeluaran`, `Aset`, `Liabilitas`, `Ekuitas` |

> **Perilaku Tipe Kategori:**
> - `Aset` & `Pengeluaran` bertambah di Debit, berkurang di Kredit.
> - `Liabilitas`, `Ekuitas`, & `Pendapatan` bertambah di Kredit, berkurang di Debit.

---

### 3.5 Akun (Chart of Accounts)

Dikelola melalui menu **Entri Jurnal → Akun** (`/akun`).

| Field | Tipe | Keterangan & Aturan Validasi |
|---|---|---|
| **Kategori** | Pilihan | Wajib dipilih dari Kategori Akun |
| **Kode Akun** | Teks | Wajib diisi, unik, contoh: `1101`, `2101`, `5101` |
| **Nama Akun** | Teks | Wajib diisi, contoh: `Kas Tunai`, `Hutang Usaha`, `Penjualan Telur` |
| **Kode Sistem** | Teks | Opsional / Khusus Akun Sistem (misal `KAS_TUNAI`, `PAKANCURAH_PIUTANG`) |
| **Deskripsi** | Teks | Opsional |
| **Status** | Checkbox | Centang untuk mengaktifkan akun |

> **Jebakan Sistem (Penting!):**
> Beberapa akun memiliki **Kode Sistem (`system_code`)** yang diikat langsung ke logika aplikasi (seperti transaksi Pakan Curah otomatis, akun Kas default, dan HPP). **Jangan mengubah `system_code` atau menghapus akun sistem**, karena dapat menyebabkan kegagalan pencatatan jurnal otomatis saat transaksi.

---

## Bagian 4 — Pembelian & Penjualan

Aplikasi memisahkan formulir transaksi berdasarkan kelompok barang: **Telur**, **Pakan**, **Obat**, dan **Tray**.

### 4.1 Jenis Transaksi & Rutenya

| Kelompok | Alamat Pembelian | Alamat Penjualan |
|---|---|---|
| **Telur** | `/transaksi/pembelian/telur` | `/transaksi/penjualan/telur` |
| **Pakan** | `/transaksi/pembelian/pakan` | `/transaksi/penjualan/pakan` |
| **Obat** | `/transaksi/pembelian/obat` | `/transaksi/penjualan/obat` |
| **Tray** | `/transaksi/pembelian/tray` | `/transaksi/penjualan/tray` |

---

### 4.2 Formulir Transaksi & Validasi

Saat membuat transaksi baru (`+ Transaksi Baru`):

| Field | Keterangan & Validasi |
|---|---|
| **Nomor Faktur / Nota** | Otomatis dibuat sistem (format misal `TRX-BUY-YYYYMMDD-XXXX` atau `TRX-SELL-YYYYMMDD-XXXX`). Bisa diubah jika ada nomor nota fisik. |
| **Tanggal Transaksi** | Wajib diisi. Default: hari ini. |
| **Client** | Wajib dipilih. Untuk pembelian: supplier/keduanya. Untuk penjualan: customer/keduanya. |
| **Metode Pembayaran** | `Tunai` (Cash) atau `Kredit` (Hutang/Piutang). |
| **Akun Kas / Pembayaran** | Muncul jika metode = `Tunai`. Pilih akun Kas/Bank tempat dana keluar/masuk. |
| **Item Barang** | Minimal 1 barang. Pilih barang, isi jumlah (qty), dan harga satuan. |
| **Keterangan** | Catatan tambahan (opsional). |

---

### 4.3 Alur Otomatisasi Sistem saat Transaksi Disimpan

Ketika Pembelian atau Penjualan disimpan, sistem secara otomatis melakukan 3 hal sekaligus:

1. **Pencatatan Stok & FIFO:**
   - **Pembelian:** Membuka batch stok baru (FIFO) dengan stok awal = qty dan sisa = qty.
   - **Penjualan:** Memotong stok dari batch FIFO terlama yang masih memiliki sisa stok. Sistem menghitung **HPP (Harga Pokok Penjualan)** berdasarkan harga beli asli batch FIFO tersebut.
2. **Pencatatan Jurnal Akuntansi:**
   - **Pembelian Tunai:** Debit Persediaan / Beban, Kredit Kas/Bank.
   - **Pembelian Kredit:** Debit Persediaan / Beban, Kredit Hutang Usaha.
   - **Penjualan Tunai:** Debit Kas/Bank (sebesar total jual), Kredit Pendapatan. Plus Jurnal HPP: Debit HPP, Kredit Persediaan.
   - **Penjualan Kredit:** Debit Piutang Usaha (sebesar total jual), Kredit Pendapatan. Plus Jurnal HPP: Debit HPP, Kredit Persediaan.
3. **Pencatatan Cart/Tagihan (Hutang / Piutang):**
   - Jika pembayaran `Kredit`, sistem otomatis mencatat entri Hutang (pembelian) atau Piutang (penjualan) atas nama Client yang dipilih.

---

### 4.4 Kasus Khusus: Transaksi Pakan Curah

Kelompok Pakan memiliki perlakuan khusus untuk produk **Pakan Curah**:
- Jurnal Penjualan Pakan Curah diarahkan secara khusus ke akun Pendapatan Pakan Curah & Piutang Pakan Curah.
- Perhitungan Laba Rugi Pakan Curah dipisahkan pada laporan tersendiri (**Laporan → Laba Rugi Pakan Curah**).

---

## Bagian 5 — Retur

Aplikasi mendukung dua jenis retur: **Retur Penjualan** (barang dikembalikan oleh pembeli) dan **Retur Pembelian** (barang dikembalikan ke supplier).

### 5.1 Retur Penjualan (`/retur/penjualan`)

1. Buka menu **Retur & Riwayat → Retur Penjualan**.
2. Klik **+ Retur Penjualan Baru**.
3. Pilih transaksi penjualan asal yang akan diretur.
4. Pilih item dan tentukan jumlah (qty) barang yang dikembalikan.
5. Pilih perlakuan pengembalian dana: `Kembalikan Tunai` atau `Potong Piutang`.
6. Simpan.

**Dampak Sistem:**
- Stok barang **bertambah kembali** ke persediaan.
- Jurnal otomatis mencatat pembalik pendapatan dan penyesuaian HPP.
- Jika `Potong Piutang`, saldo piutang client berkurang.

---

### 5.2 Retur Pembelian (`/retur/pembelian`)

1. Buka menu **Retur & Riwayat → Retur Pembelian**.
2. Klik **+ Retur Pembelian Baru**.
3. Pilih transaksi pembelian asal yang akan diretur.
4. Pilih item dan tentukan jumlah barang yang dikembalikan.
5. Pilih perlakuan: `Terima Kas` atau `Potong Hutang`.
6. Simpan.

**Dampak Sistem:**
- Stok barang **berkurang** dari batch FIFO terkait.
- Jurnal otomatis mencatat pembalik pembelian/persediaan.
- Jika `Potong Hutang`, saldo hutang ke supplier berkurang.

---

## Bagian 6 — Stok

### 6.1 Stok Barang (`/stok`)

Menampilkan daftar seluruh barang beserta:
- Total Stok Fisik saat ini.
- Nilai Persediaan (Rp).
- Filter berdasarkan Jenis Barang dan Kelompok.

---

### 6.2 FIFO Batch (`/stok/fifo`)

Menampilkan rincian batch penerimaan stok barang:
- Tanggal Masuk & Nomor Transaksi Asal.
- Jumlah Awal.
- Jumlah Terpakai (Terjual/Diretur).
- Sisa Stok Batch.
- Harga Beli Per Unit (Harga Modal).

---

### 6.3 Stok Opname (`/stok/opname`)

Stok Opname digunakan untuk **penyesuaian (adjustment)** antara pencatatan sistem dan fisik gudang jika terjadi selisih (rusak, hilang, atau bonus).

1. Buka menu **Stok → Stok Opname**.
2. Klik **+ Stok Opname Baru**.
3. Pilih barang dan tanggal opname.
4. Isi **Stok Fisik** (jumlah barang riil di lapangan).
5. Sistem menampilkan **Selisih** (`Stok Fisik - Stok Sistem`).
6. Isi **Keterangan / Alasan** penyesuaian.
7. Simpan.

**Dampak Sistem:**
- Jika Stok Fisik > Stok Sistem: dibuatkan batch FIFO baru penyesuaian.
- Jika Stok Fisik < Stok Sistem: sisa batch FIFO dipotong.
- Jurnal penyesuaian persediaan dicatat otomatis ke akun Selisih Stok / Beban Kerusakan.

> **Jebakan:** Stok Opname **bukan** tempat menginput stok awal barang baru. Penginputan stok awal barang baru hendaknya dilakukan lewat Transaksi Pembelian Awal atau Jurnal Saldo Awal Persediaan.

---

### 6.4 Riwayat Stok & Laporan Stok

- **Riwayat Stok (`/stok/riwayat`):** Catatan log mutasi masuk/keluar untuk setiap unit barang (transaksi, retur, opname).
- **Laporan Stok (`/stok/laporan`):** Rekapitulasi pergerakan stok (Saldo Awal + Masuk - Keluar = Saldo Akhir) dalam rentang tanggal tertentu.

---

## Bagian 7 — Akuntansi

Modul Akuntansi mencatat seluruh transaksi keuangan perusahaan, baik yang tercipta otomatis dari Pembelian/Penjualan/Retur maupun yang diinput manual.

### 7.1 Jurnal Umum (`/akuntansi/jurnal`)

Menampilkan seluruh baris jurnal berpasangan (Debit & Kredit) dari seluruh aktivitas sistem.

> **Penting (Jebakan UI):**
> Halaman Jurnal Umum (`/akuntansi/jurnal`) **TIDAK MEMILIKI tombol "Tambah Jurnal Baru"**.
> Untuk menginput jurnal manual, Anda **harus menggunakan menu di bawah grup Entri Jurnal**, yaitu:
> - **Entri Jurnal → Kas** (`/jurnal/kas`)
> - **Entri Jurnal → Beban** (`/jurnal/beban`)
> - **Entri Jurnal → Pendapatan** (`/jurnal/pendapatan`)

---

### 7.2 Entri Jurnal Manual

Dipakai untuk mencatat transaksi keuangan di luar Pembelian/Penjualan barang (misal: bayar listrik, sewa, gaji, penerimaan lain, atau transfer antar kas).

1. Buka salah satu formulir di grup **Entri Jurnal** (`Kas`, `Beban`, atau `Pendapatan`).
2. Isi Tanggal, Akun Kas/Bank, Akun Lawan (Biaya/Pendapatan), Nominal, dan Keterangan.
3. Simpan. Jurnal berpasangan akan otomatis terbentuk.

---

### 7.3 Manajemen Hutang (`/akuntansi/hutang`)

Menampilkan daftar kewajiban pembayaran kepada Supplier/Client.

- **Bayar Hutang (Pelunasan):**
  1. Klik tombol **Bayar Hutang**.
  2. Pilih Client dan Akun Kas/Bank sumber dana.
  3. Isi Nominal Pembayaran dan Tanggal.
  4. Simpan. Jurnal otomatis: Debit Hutang Usaha, Kredit Kas/Bank. Saldo hutang client berkurang.

> **Jebakan Hitungan Sisa Hutang pada Modal Pembayaran:**
> Pada jendela popup modal pembayaran hutang, angka ringkasan "Total Sisa Hutang Client" dihitung **hanya dari baris data yang sedang tampil di halaman tabel saat itu (current page pagination)**. Jika client memiliki banyak nota hutang di halaman lain, gunakan filter Client terlebih dahulu agar seluruh nota client terkumpul di satu halaman sebelum melakukan verifikasi saldo.

- **Tambah Hutang Manual:**
  Digunakan jika ada klaim hutang di luar transaksi barang.
  > **Penting (Perilaku Jurnal):** Menggunakan fitur *Tambah Hutang Manual* akan membuat jurnal: Debit **Kas** dan Kredit **Hutang Usaha** (dianggap menerima pinjaman/tambahan kas dari pihak lain).

---

### 7.4 Manajemen Piutang (`/akuntansi/piutang`)

Menampilkan tagihan yang belum dilunasi oleh Customer.

- **Terima Piutang (Pelunasan):**
  1. Klik tombol **Terima Piutang**.
  2. Pilih Client, Akun Kas/Bank penerima dana, dan Nominal.
  3. Simpan. Jurnal otomatis: Debit Kas/Bank, Kredit Piutang Usaha. Saldo piutang client berkurang.

- **Tambah Piutang Manual:**
  Menambah catatan tagihan manual. Jurnal: Debit **Piutang Usaha**, Kredit **Pendapatan Lain-Lain**.

---

### 7.5 Saldo Per Client (`/akuntansi/saldo-client`)

Menampilkan rekapitulasi posisi keuangan tiap Client:
- Total Hutang Kita ke Client.
- Total Piutang Client ke Kita.
- Posisi Netto (apakah kita lebih banyak berhutang atau memegang piutang).

---

### 7.6 Monitoring Kas (`/akuntansi/kas`)

Menampilkan posisi saldo akhir dan rincian transaksi masuk/keluar pada seluruh akun yang berkategori Kas dan Bank.

---

## Bagian 8 — Laporan

### 8.1 Aturan Umum Membuka Laporan (Penting!)

> **Perhatian:** Seluruh halaman laporan (Buku Besar, Neraca, Laba Rugi, Laba Rugi Curah) **tidak langsung menampilkan data** saat dibuka.
> Anda **WAJIB** memilih tanggal awal, tanggal akhir, atau filter yang diinginkan, kemudian menekan tombol **"Tampilkan"** (atau **"Filter"**) agar sistem menghitung dan memunculkan angka laporan.

---

### 8.2 Buku Besar (`/laporan/buku-besar`)

Menampilkan rincian mutasi debit, kredit, dan saldo berjalan (running balance) untuk **satu akun tertentu** pada periode tanggal yang dipilih.

1. Buka **Laporan → Buku Besar**.
2. Pilih Akun yang ingin diperiksa.
3. Tentukan Rentang Tanggal.
4. Klik **Tampilkan**.

---

### 8.3 Laba Rugi (`/laporan/laba-rugi`)

Menampilkan ringkasan kinerja keuangan usaha pada rentang periode tertentu:
- **Total Pendapatan** (Penjualan Telur, Pakan, Obat, Tray, Pendapatan Lain).
- **Harga Pokok Penjualan (HPP)**.
- **Laba Kotor** = Pendapatan - HPP.
- **Beban Operasional** (Gaji, Listrik, Transport, Kerusakan, dll).
- **Laba Bersih** = Laba Kotor - Beban.

---

### 8.4 Laba Rugi Pakan Curah (`/laporan/laba-rugi-curah`)

Laporan khusus untuk memantau profitabilitas divisi Pakan Curah secara terpisah dari operasional utama. Menampilkan pendapatan, HPP pakan curah, serta margin bersih khusus unit bisnis pakan curah.

---

### 8.5 Neraca (`/laporan/neraca`)

Menampilkan posisi keuangan perusahaan (Aset = Kewajiban + Ekuitas) pada tanggal tertentu.

| Komponen | Isi |
|---|---|
| **Aset (Aktiva)** | Kas & Bank, Piutang Usaha, Persediaan Barang |
| **Kewajiban (Pasiva - Hutang)** | Hutang Usaha, Hutang Lainnya |
| **Ekuitas (Modal)** | Laba Tahun Berjalan |

> **Catatan Teknis Perhitungan Neraca di Aplikasi:**
> 1. Angka **Laba Tahun Berjalan** yang ditampilkan di Neraca dihitung sebagai **akumulasi total dari awal data hingga tanggal neraca** (bukan hanya dari 1 Januari tahun berjalan).
> 2. Total Pasiva pada Neraca menghitung penjumlahan `Total Kewajiban + Laba Tahun Berjalan`.

---

## Bagian 9 — Dashboard

Halaman Utama / Dashboard (`/`) memberikan gambaran kilat operasional bisnis harian.

### 9.1 Kartu Ringkasan (Ringkasan Kinerja)

- **Penjualan Hari Ini (Rp):** Total nominal penjualan yang terjadi pada hari ini.
- **Pembelian Hari Ini (Rp):** Total nominal belanja/pembelian barang pada hari ini.
- **Total Piutang (Rp):** Sisa seluruh tagihan kita ke customer yang belum terbayar.
- **Total Hutang (Rp):** Sisa seluruh kewajiban pembayaran kita ke supplier.

---

### 9.2 Tabel Ringkasan

1. **Peringatan Stok Menipis / Kritis:** Menampilkan daftar barang yang jumlah stok sisa FIFO-nya sudah mendekati atau sama dengan nol.
2. **Transaksi Terakhir:** Menampilkan 5-10 transaksi penjualan dan pembelian terbaru beserta status pembayarannya (Tunai / Kredit / Lunas).

> **Akses Dashboard:** Pengguna dengan role spesifik (misal *Pembelian Telur*) akan melihat dashboard yang disesuaikan atau diarahkan langsung ke modul kerjanya.

---

## Bagian 10 — Log Aktivitas

Dikelola melalui menu **Akses → Log Aktivitas** (`/akses/log-aktivitas`). Menu ini hanya dapat diakses oleh **SuperAdmin** dan **Admin**.

### 10.1 Fungsi Log Aktivitas

Log Aktivitas mencatat secara otomatis seluruh tindakan penting yang dilakukan pengguna di dalam sistem untuk keperluan audit dan keamanan.

### 10.2 Informasi yang Dicatat

Setiap baris log menyimpan:
- **Waktu:** Tanggal dan jam tindakan dilakukan.
- **User:** Nama dan Username pelaksana.
- **Aksi:** Jenis tindakan (misal: `CREATE_TRANSACTION`, `UPDATE_USER`, `DELETE_BARANG`, `LOGIN_SUCCESS`, `LOGOUT`).
- **Modul / Deskripsi:** Rincian objek yang diubah (misal: *Menambahkan transaksi penjualan TRX-SELL-20260928-0001*).
- **IP Address:** Alamat IP perangkat pengguna.

---

## Bagian 11 — Tips, Fitur yang Belum Tersedia & Jebakan

Bagian ini penting dibaca oleh seluruh pengguna dan administrator untuk menghindari kebingungan akibat perilaku aplikasi yang khusus atau batasan sistem yang ada.

### 11.1 Daftar Fitur yang Belum Tersedia di Versi 1.0

Aplikasi versi 1.0 sengaja dirancang ringkas dan terfokus. Fitur-fitur berikut **TIDAK ADA** di aplikasi:

1. **Diskon & PPN/Pajak pada Transaksi:** Tidak ada kolom penginputan persentase diskon, potongan harga, PPN 11%, atau pajak lainnya di formulir pembelian/penjualan.
2. **Status Draft / Simpan Sementara:** Seluruh transaksi yang disimpan langsung memotong stok dan membukukan jurnal (bersifat final).
3. **Edit / Ubah Retur:** Transaksi retur yang sudah disimpan tidak dapat diubah (edit). Jika ada kesalahan retur, harus dikoordinasikan dengan admin untuk penyesuaian jurnal/stok.
4. **Tanggal Kedaluwarsa (Expired Date) Per Batch:** Pembukuan stok FIFO hanya mencatat tanggal masuk dan harga modal, tidak mengelompokkan tanggal kedaluwarsa fisik barang.
5. **Cetak Nota / Struk Thermal Direct:** Aplikasi tidak menyediakan tombol cetak struk kasir thermal secara langsung. Print dilakukan via fitur print bawaan browser jika diperlukan.

---

### 11.2 Daftar Jebakan & Perilaku Khusus (Must-Know)

| No | Lokasi / Fitur | Perilaku Khusus & Solusinya |
|---|---|---|
| 1 | **Form Pembayaran Hutang** | Angka sisa hutang pada modal pembayaran dihitung **hanya dari baris yang tampil di halaman tabel aktif**. Selalu gunakan filter Client agar semua nota client terkumpul di 1 halaman. |
| 2 | **Menu Jurnal Umum** | Halaman `/akuntansi/jurnal` **tidak memiliki tombol "+ Jurnal Baru"**. Input jurnal manual harus dilakukan lewat grup menu **Entri Jurnal** (Kas, Beban, atau Pendapatan). |
| 3 | **Halaman Laporan** | Tabel Laporan tidak muncul otomatis saat dibuka. pengguna **wajib menekan tombol "Tampilkan"** setelah memilih tanggal. |
| 4 | **Ubah Master Akun Sistem** | Akun dengan `system_code` (seperti `KAS_TUNAI`, `HPP`, `PAKANCURAH_...`) jangan diubah kodenya karena digunakan oleh logika jurnal otomatis backend. |
| 5 | **Stok Opname** | Fitur ini digunakan untuk **penyesuaian selisih**, bukan untuk mengisi persediaan barang baru saat pertama kali setup aplikasi. |
| 6 | **Form Tambah Hutang Manual** | Fitur *Tambah Hutang* di menu Hutang menghasilkan jurnal Debit **Kas** dan Kredit **Hutang**. Gunakan ini hanya untuk penerimaan pinjaman dana tunai. |
| 7 | **Password Bawaan Seeder** | Seluruh akun bawaan (*superadmin*, *admin*, dll) memiliki password awal `1234`. Segera ubah password ini di lingkungan produksi! |

---

## Bagian 12 — Lampiran Administrator

Panduan teknis khusus untuk Admin Server, Webmaster, atau Technical Support yang mengelola instalasi dan pemeliharaan server.

### 12.1 Spesifikasi Server & Stack Teknologi

- **Backend:** Laravel 13.29.0, PHP 8.3.33.
- **Frontend:** Vue 3.5, vue-router 4.6, Pinia 4.0, Tailwind CSS 4.
- **Autentikasi:** Laravel Sanctum 4.3 (Stateful Cookie Session).
- **Database:** MySQL / MariaDB.
- **Session Cookie Name:** `sistem-informasi-manajemen-session`.

---

### 12.2 Konfigurasi Environment Produksi (`.env`)

Untuk memastikan fitur login cookie dan sesi berjalan lancar di lingkungan HTTPS / Shared Hosting, pastikan berkas `.env` pada server berisi pengaturan berikut:

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://simv2.bimapratama.com

# Domain Stateful Sanctum (PENTING: JANGAN gunakan https:// atau port)
SANCTUM_STATEFUL_DOMAINS=simv2.bimapratama.com

# Pengaturan Sesi
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null
SESSION_SECURE_COOKIE=true
```

> **Aturan Penting SANCTUM_STATEFUL_DOMAINS:**
> Pengaturan `SANCTUM_STATEFUL_DOMAINS` **hanya boleh berisi hostname** (misal: `simv2.bimapratama.com`). Jika diisi dengan `https://simv2.bimapratama.com`, permintaan login API akan dianggap sebagai request token biasa, bukan sesi cookie stateful, yang mengakibatkan pengguna tertahan di halaman login tanpa pesan error.

---

### 12.3 Perintah Pemeliharaan Rutin

Setiap kali melakukan perubahan pada `.env` atau pembaruan kode di server, jalankan perintah berikut lewat terminal:

```bash
# Clear seluruh cache konfigurasi dan rute
php artisan optimize:clear

# Re-cache rute dan konfigurasi untuk kecepatan produksi
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

### 12.4 Pembatasan Shared Hosting & Perintah Alternatif

Di sebagian besar lingkungan Shared Hosting (seperti cPanel / Cloud Hosting tertentu), fungsi PHP `eval()` dinonaktifkan demi keamanan (`DISEVAL - Use of eval is forbidden`).

- **Dampak:** Perintah `php artisan tinker` akan **gagal dan error**.
- **Solusi Alternatif:**
  Untuk memeriksa nilai konfigurasi aplikasi tanpa tinker, gunakan perintah `config:show`:

```bash
# Memeriksa daftar stateful domain Sanctum:
php artisan config:show sanctum.stateful

# Memeriksa driver sesi:
php artisan config:show session.driver

# Memeriksa URL aplikasi:
php artisan config:show app.url
```

---

### 12.5 Rincian Data Seeder Awal

#### A. Daftar 38 Kategori Akun Bawaan

1. Aktiva Lancar
2. Kas & Bank
3. Piutang Usaha
4. Persediaan
5. Biaya Dibayar Dimuka
6. Aktiva Tetap
7. Akumulasi Penyusutan
8. Aktiva Lain-Lain
9. Kewajiban Jangka Pendek
10. Hutang Usaha
11. Hutang Gaji
12. Hutang Pajak
13. Kewajiban Jangka Panjang
14. Hutang Bank / Jangka Panjang
15. Ekuitas / Modal
16. Pendapatan Penjualan
17. Pendapatan Jasa / Lain-Lain
18. Harga Pokok Penjualan (HPP)
19. Beban Gaji & Upah
20. Beban Operasional & Kantor
21. Beban Sewa
22. Beban Utilities (Air, Listrik, Internet)
23. Beban Transportasi & Logistik
24. Beban Pemasaran & Promosi
25. Beban Perbaikan & Pemeliharaan
26. Beban Penyusutan
27. Beban Kerusakan / Selisih Stok
28. Beban Bunga & Keuangan
29. Beban Lain-Lain
30. Beban Pajak
31. Pendapatan Non-Operasional
32. Beban Non-Operasional
33. Pendapatan Pakan Curah
34. Piutang Pakan Curah
35. Beban Pakan Curah
36. Kas Pakan Curah
37. Persediaan Pakan Curah
38. Penyesuaian Modal

#### B. Ringkasan Hak Akses (Permission) Per Role Bawaan

| Role | Total Izin | Daftar Izin Utama |
|---|---|---|
| **SuperAdmin** | 36 | Seluruh `menu.*` tanpa terkecuali |
| **Admin** | 34 | Seluruh `menu.*` kecuali `menu.akses.role` dan `menu.akses.user` |
| **Pembelian Telur** | 1 | `menu.pembelian.telur` |
| **Penjualan Pakan dan Obat** | 2 | `menu.penjualan.pakan`, `menu.penjualan.obat` |
| **Kas Tunai** | 14 | Modul `menu.akuntansi.*`, `menu.jurnal.*`, dan `menu.laporan.*` |
| **Kas Transfer** | 5 | `menu.pembelian.pakan`, `menu.pembelian.obat`, `menu.pembelian.tray`, `menu.penjualan.telur`, `menu.penjualan.tray` |

---

## Glosarium

- **SPA (Single Page Application):** Aplikasi web yang berjalan di satu halaman tanpa reload penuh setiap kali berpindah menu.
- **Sanctum Stateful:** Metode autentikasi Laravel yang memanfaatkan cookie sesi browser untuk keamanan transaksi API SPA.
- **FIFO (First-In, First-Out):** Metode penilaian persediaan di mana barang yang pertama kali masuk/dibeli adalah barang yang pertama kali dihitung keluar/terjual.
- **HPP (Harga Pokok Penjualan):** Total biaya modal asli dari barang yang berhasil dijual dalam suatu periode.
- **Client:** Istilah umum di aplikasi yang mencakup entitas Pemasok (Supplier) dan Pembeli (Customer).
- **Chart of Accounts (COA):** Daftar seluruh akun akuntansi yang digunakan untuk mengklasifikasikan transaksi keuangan.
- **Running Balance:** Perhitungan saldo akumulasi yang bertambah atau berkurang secara urut baris demi baris pada Buku Besar.

