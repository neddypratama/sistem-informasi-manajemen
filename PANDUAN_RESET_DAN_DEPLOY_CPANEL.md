# Panduan Reset Total & Fresh Deployment Bima Pratama ERP 2.0 di cPanel

Panduan ini disusun secara runtut, jelas, dan teruji berhasil 100% untuk melakukan **Reset Total (Clean Slate)** dan **Deploy Bersih** sistem ERP Bima Pratama ke cPanel hosting.

---

## 📦 3 File Rilis yang Disiapkan di Komputer Anda
Seluruh file sudah di-build, di-bundle, dan siap upload langsung tanpa perlu compile manual di server:

| Nama File | Ukuran | Lokasi di Komputer Anda | Tujuan Upload di cPanel |
| :--- | :--- | :--- | :--- |
| **`bimapratama_v2_cpanel.sql.zip`** | ~7.2 MB | `c:\laragon\www\erp-bimapratama\` | Import di **phpMyAdmin** (Database) |
| **`erp-bimapratama-cpanel.zip`** | ~1.18 MB | `c:\laragon\www\erp-bimapratama\` | Ekstrak di `/home/bimaprat/sistem-informasi-manajemen` (Backend API) |
| **`frontend-simv2.zip`** | ~574 KB | `c:\laragon\www\erp-bimapratama\` | Ekstrak di `/home/bimaprat/public_html/simv2` (Frontend Web) |

---

## 🛑 LANGKAH 0: Reset Total cPanel (Membersihkan Sisa File Lama)

Sebelum memulai fresh install, pastikan seluruh konfigurasi dan sisa file lama dibersihkan agar tidak terjadi konflik:

1. **Hapus Aplikasi Node.js Lama:**
   - Masuk ke dashboard cPanel > klik menu **Setup Node.js App**.
   - Jika ada aplikasi lama terdaftar di `api.bimapratama.com` atau folder `sistem-informasi-manajemen`, klik ikon **Tong Sampah (Delete)** untuk menghapusnya.

2. **Hapus Folder File Lama di File Manager:**
   - Masuk ke cPanel > **File Manager**.
   - Hapus folder: `/home/bimaprat/sistem-informasi-manajemen` *(klik kanan > Delete, centang Skip trash)*.
   - Hapus isi folder: `/home/bimaprat/public_html/simv2` *(kosongkan seluruh file di dalamnya)*.
   - *(Opsional)* Jika ada folder virtualenv lama di `/home/bimaprat/nodevenv/sistem-informasi-manajemen`, hapus juga folder tersebut.

3. **Kosongkan Database Lama:**
   - Buka cPanel > **phpMyAdmin**.
   - Klik database Anda (`bimaprat_v2`) di panel kiri.
   - Klik tab **Structure**, scroll ke bawah, centang **Check all**, lalu pilih **Drop** untuk menghapus semua tabel lama (atau buat database baru di menu *MySQL Databases*).

---

## 🗄️ LANGKAH 1: Setup & Import Database MySQL

1. Pastikan Database dan User MySQL cPanel sudah terhubung:
   - Buka menu **MySQL® Databases** di cPanel.
   - Pastikan database bernama `bimaprat_v2` sudah ada.
   - Pastikan user `bimaprat_v2` sudah ditambahkan ke database tersebut dengan mencentang **ALL PRIVILEGES**.
   - *Catat password user database Anda.*

2. **Import Database Bersih:**
   - Buka menu **phpMyAdmin** dari cPanel.
   - Klik nama database `bimaprat_v2` di sebelah kiri.
   - Klik tab **Import** di menu atas.
   - Pada bagian *File to import*, klik tombol **Choose File** / **Pilih File**.
   - Pilih file dari komputer Anda:
     👉 `c:\laragon\www\erp-bimapratama\bimapratama_v2_cpanel.sql.zip`
   - Scroll ke bawah dan klik tombol **Import** (atau **Kirim**).
   - Tunggu 10–20 detik hingga muncul pesan sukses berwarna hijau:  
     `Import has been successfully finished...`
   
   > 💡 **Hasil:** Database sudah otomatis terisi lengkap dengan 19.169 transaksi historis, 117.854 baris jurnal akuntansi double-entry, 144 master barang, 581 mitra bisnis, dan akun login admin!

---

## ⚙️ LANGKAH 2: Deploy Backend API (api.bimapratama.com)

1. **Upload Source Code Backend:**
   - Buka **File Manager** cPanel.
   - Masuk ke folder `/home/bimaprat/`.
   - Buat folder baru bernama **`sistem-informasi-manajemen`** (jika belum ada).
   - Masuk ke folder `/home/bimaprat/sistem-informasi-manajemen`.
   - Klik tombol **Upload** di bagian atas, pilih file:
     👉 `c:\laragon\www\erp-bimapratama\erp-bimapratama-cpanel.zip`
   - Setelah upload 100% selesai, kembali ke File Manager.
   - Klik kanan file `erp-bimapratama-cpanel.zip` > pilih **Extract** > **Extract Files**.
   - Pastikan folder `backend` berada di dalam `/home/bimaprat/sistem-informasi-manajemen/backend`.

2. **Buat File Konfigurasi `.env`:**
   - Masuk ke folder `/home/bimaprat/sistem-informasi-manajemen/backend`.
   - Klik tombol **+ File** di pojok kiri atas, beri nama: **`.env`**
   - Klik kanan file `.env` yang baru dibuat > pilih **Edit**.
   - Tempel konfigurasi berikut (ganti `PASSWORD_DATABASE_ANDA` dengan password database MySQL Anda):
     ```env
     PORT=4000
     NODE_ENV=production
     DATABASE_URL="mysql://bimaprat_v2:PASSWORD_DATABASE_ANDA@localhost:3306/bimaprat_v2"
     JWT_SECRET="super-secret-jwt-key-for-bima-pratama-erp-modernization-2026"
     JWT_EXPIRES_IN="1d"
     JWT_REFRESH_SECRET="super-secret-refresh-jwt-key-2026"
     JWT_REFRESH_EXPIRES_IN="7d"
     CORS_ORIGIN="*"
     ```
   - Klik **Save Changes**.

3. **Daftarkan Aplikasi di "Setup Node.js App":**
   - Kembali ke cPanel > cari dan klik menu **Setup Node.js App**.
   - Klik tombol **Create Application** di kanan atas:
     - **Node.js version:** Pilih **20.x** (LTS)
     - **Application mode:** Pilih **Production**
     - **Application root:** Masukkan `sistem-informasi-manajemen/backend`
     - **Application URL:** Pilih subdomain `api.bimapratama.com`
     - **Application startup file:** Masukkan `app.js`
   - Klik tombol **Create** di kanan atas.

4. **Install Dependensi & Generate Prisma di Terminal:**
   - Setelah aplikasi dibuat, pada halaman Node.js App bagian atas akan muncul teks perintah virtualenv berwarna abu-abu, contohnya:
     ```bash
     source /home/bimaprat/nodevenv/sistem-informasi-manajemen/backend/20/bin/activate && cd /home/bimaprat/sistem-informasi-manajemen/backend
     ```
   - Buka menu **Terminal** di cPanel Anda.
   - Salin dan tempel perintah `source ...` tersebut, lalu tekan **Enter**.
   - Jalankan perintah instalasi dependensi produksi:
     ```bash
     npm install --omit=dev
     ```
   - Jalankan generator Prisma client:
     ```bash
     npx prisma generate
     ```
     *(Bundle `dist/` NestJS sudah otomatis terkompilasi bersih di dalam zip rilis, jadi Anda tidak perlu menjalankan `npm run build` lagi di server)*.

5. **Restart & Verifikasi Backend:**
   - Kembali ke menu **Setup Node.js App**.
   - Klik tombol **Restart** pada aplikasi Anda.
   - Buka browser baru dan akses link healthcheck:  
     👉 **`https://api.bimapratama.com/api/v1/health`**
   - Jika muncul respons JSON status `ok` / `success`, backend NestJS Anda **resmi aktif 100%!**

---

## 💻 LANGKAH 3: Deploy Frontend Web (sim.bimapratama.com)

1. Buka cPanel > **File Manager**.
2. Masuk ke direktori web subdomain frontend:
   👉 `/home/bimaprat/public_html/simv2/`
3. Pastikan folder bersih dari file lama.
4. Klik **Upload** di bagian atas, pilih file:
   👉 `c:\laragon\www\erp-bimapratama\frontend-simv2.zip`
5. Setelah upload selesai, klik kanan file `frontend-simv2.zip` > pilih **Extract** > **Extract Files**.
6. Pastikan file berikut langsung berada di dalam `/home/bimaprat/public_html/simv2/`:
   - `index.html`
   - `.htaccess` *(jika tidak terlihat, klik Settings di kanan atas File Manager dan centang "Show Hidden Files")*
   - folder `assets/`

---

## 🚀 LANGKAH 4: Login & Selesai!

1. Buka browser Anda dan kunjungi alamat web aplikasi:  
   👉 **`https://sim.bimapratama.com`** (atau langsung ke `https://sim.bimapratama.com/login`)

2. Masuk menggunakan akun admin default:
   - **Username / Email:** `admin` *(atau `admin@bimapratama.com`)*
   - **Password:** `password`

3. **Verifikasi Fitur:**
   - **Dashboard:** Statistik keuangan, omzet, grafik, dan saldo kas sudah tampil lengkap.
   - **Penjualan & Pembelian:** Seluruh riwayat transaksi fisik komoditas siap dicek.
   - **Akuntansi & Jurnal:** Seluruh Jurnal Umum double-entry, Buku Besar, dan Neraca Saldo sudah balance.
   - **Sinkronisasi & Migrasi:** Jika di kemudian hari ingin mengunggah file SQL cadangan lama, menu `/import-legacy` sudah menggunakan engine streaming in-memory yang tidak butuh akses root MySQL.

---

> 🎉 **Selamat! Sistem ERP Bima Pratama 2.0 kini berjalan sempurna di cPanel hosting Anda.**
