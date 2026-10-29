# Panduan Lengkap Deployment Bima Pratama ERP 2.0 ke cPanel Hosting

Dokumen ini memandu Anda langkah demi langkah meng-upload dan mengonfigurasi **Bima Pratama ERP 2.0 (React 19 + NestJS 11 + MySQL)** pada server hosting berbasis **cPanel** (Shared Hosting, CloudLinux, atau VPS dengan cPanel).

---

## 📋 Daftar Isi
1. [Arsitektur Deployment di cPanel](#1-arsitektur-deployment-di-cpanel)
2. [Persiapan Awal](#2-persiapan-awal)
3. [Langkah 1: Setup Database MySQL di cPanel](#langkah-1-setup-database-mysql-di-cpanel)
4. [Langkah 2: Menyiapkan File Proyek (Ekspor Bersih Tanpa node_modules)](#langkah-2-menyiapkan-file-proyek-ekspor-bersih-tanpa-node_modules)
5. [Langkah 3: Deploy Backend API (NestJS) Menggunakan "Setup Node.js App"](#langkah-3-deploy-backend-api-nestjs-menggunakan-setup-nodejs-app)
6. [Langkah 4: Deploy Frontend SPA (React Vite) ke `public_html`](#langkah-4-deploy-frontend-spa-react-vite-ke-public_html)
7. [Langkah 5: Konfigurasi SSL (HTTPS Gratis Let's Encrypt)](#langkah-5-konfigurasi-ssl-https-gratis-lets-encrypt)
8. [Troubleshooting & Solusi Error Umum cPanel](#troubleshooting--solusi-error-umum-cpanel)

---

## 1. Arsitektur Deployment di cPanel

Di lingkungan cPanel, sistem dipisahkan menjadi dua bagian utama demi keamanan dan performa maksimal:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AKUN CPANEL ANDA                              │
│                                                                         │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────┐  │
│  │   FRONTEND (React SPA)          │   │   BACKEND API (NestJS)      │  │
│  │   Folder: /public_html          │   │   Folder: /api-bimapratama  │  │
│  │   Domain: erp.domainanda.com    │   │   (Di luar public_html)     │  │
│  │   Dilengkapi: .htaccess (SPA)   │   │   Domain: api.domainanda.com│  │
│  └────────────────┬────────────────┘   └──────────────┬──────────────┘  │
│                   │                                   │                 │
│                   │ HTTPS REST API Request            │                 │
│                   └───────────────────────────────────┤                 │
│                                                       ▼                 │
│                                        ┌─────────────────────────────┐  │
│                                        │   DATABASE MySQL CPANEL     │  │
│                                        │   Port: 3306 (localhost)    │  │
│                                        │   Kelola via phpMyAdmin     │  │
│                                        └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Frontend (React):** Merupakan file HTML/JS/CSS statis hasil build. Ditempatkan di folder web publik (misal: `public_html` atau folder subdomain `erp.domainanda.com`). Dilengkapi file `.htaccess` agar navigasi React Router tidak mengalami error 404 saat halaman di-refresh.
- **Backend (NestJS API):** Ditempatkan di folder privat di luar `public_html` (misal: `/home/username/api-bimapratama`) dan dijalankan melalui modul cPanel **Setup Node.js App** (Phusion Passenger).
- **Database (MySQL):** Dibuat melalui menu cPanel **MySQL® Database Wizard**.

---

## 2. Persiapan Awal

Sebelum memulai, pastikan hosting cPanel Anda memiliki:
1. **Fitur "Setup Node.js App"** (CloudLinux / cPanel Node.js Selector) dengan versi **Node.js 20.x atau 22.x LTS**.
2. **Fitur "Terminal"** di cPanel (atau akses SSH). Jika tidak ada, instalasi dependensi tetap dapat dilakukan melalui tombol *"Run NPM Install"* di menu Node.js App.
3. Domain atau Subdomain:
   - Frontend: `erp.domainanda.com` (atau domain utama `domainanda.com`).
   - Backend: `api.domainanda.com` (disarankan menggunakan subdomain terpisah).

---

## Langkah 1: Setup Database MySQL di cPanel

1. Login ke dashboard cPanel Anda.
2. Cari dan klik menu **MySQL® Database Wizard**:
   - **Langkah 1 (Create A Database):** Beri nama database, misal `bimapratama`.  
     *(Nama lengkap database akan menjadi: `usernamecpanel_bimapratama`)*. Klik **Next Step**.
   - **Langkah 2 (Create Database Users):** Masukkan nama pengguna (misal `bimauser`) dan buat password yang kuat. Catat password ini. Klik **Create User**.
   - **Langkah 3 (Add User to Database):** Centang pilihan **ALL PRIVILEGES**. Klik **Make Changes**.
3. Buka menu **phpMyAdmin** dari cPanel untuk memastikan database sudah muncul.

> 📝 **Catatan Kredensial Database:**
> - Database Name: `usernamecpanel_bimapratama`
> - Database User: `usernamecpanel_bimauser`
> - Database Password: `PasswordKuatAnda123!`
> - Database Host: `localhost` (atau `127.0.0.1`)
> - Database Port: `3306`

---

## Langkah 2: Menyiapkan File Proyek di cPanel (Pilih Opsi A atau B)

> [!CAUTION]
> **JANGAN PERNAH meng-upload folder `node_modules` dari Windows ke cPanel!**  
> Library seperti `@prisma/client` dan `bcrypt` menggunakan file binary native C++ yang berbeda antara Windows (.dll) dan Linux (.so). Folder `node_modules` juga berukuran sangat besar (~880 MB). Dependensi wajib di-install langsung di dalam server cPanel.

### 🌟 Opsi A: Clone Langsung dari GitHub (Sangat Direkomendasikan & Paling Praktis)
Jika Anda sudah meng-upload repository ke GitHub:

#### Cara 1: Menggunakan Terminal cPanel
1. Buka menu **Terminal** di cPanel Anda.
2. Pindah ke direktori home akun Anda:
   ```bash
   cd ~
   ```
3. Lakukan clone repository:
   ```bash
   git clone https://github.com/username-anda/nama-repo.git erp-bimapratama
   ```
   *(Jika repo bersifat Private, Anda akan diminta memasukkan username GitHub dan Personal Access Token sebagai password)*.
4. Selesai! Semua file proyek sudah berada di folder `/home/usernamecpanel/erp-bimapratama` tanpa membawa sampah `node_modules`.

#### Cara 2: Menggunakan Menu GUI "Git™ Version Control" di cPanel
1. Di beranda cPanel, cari dan buka menu **Git™ Version Control**.
2. Klik tombol **Create**:
   - **Clone URL:** Masukkan link repository GitHub Anda (contoh: `https://github.com/username-anda/nama-repo.git`).
   - **Repository Path:** `erp-bimapratama` (akan otomatis dibuat di `/home/usernamecpanel/erp-bimapratama`).
   - **Repository Name:** `erp-bimapratama`.
3. Klik **Create**. cPanel akan mengunduh repository secara otomatis.
4. *Keuntungan fitur ini:* Kapan saja Anda melakukan update di GitHub, Anda cukup mengklik tombol **"Update from Remote"** di menu ini untuk menarik pembaruan kode terbaru secara instan!

---

### Opsi B: Upload Manual via File ZIP Ringan (Jika Tanpa Git)
1. Buka folder proyek di komputer Anda: `c:\laragon\www\erp-bimapratama`.
2. Klik ganda file:
   👉 **`export-clean-cpanel.bat`**
3. Script akan otomatis menghasilkan file zip:
   👉 **`erp-bimapratama-cpanel.zip`** *(Ukuran hanya ~0.45 MB, selesai upload dalam 2 detik!)*.
4. Upload dan ekstrak file zip tersebut di File Manager cPanel.

---

## Langkah 3: Deploy Backend API (NestJS) Menggunakan "Setup Node.js App"

### A. Lokasi Folder Backend
- **Jika menggunakan Git Clone (Opsi A):** Folder backend Anda otomatis sudah berada di `/home/usernamecpanel/erp-bimapratama/backend`. Anda tidak perlu memindahkan file apapun!
- **Jika menggunakan Upload ZIP (Opsi B):** Buat folder `/home/usernamecpanel/api-bimapratama`, upload file zip, ekstrak, dan pastikan seluruh isi folder `backend` berada di dalamnya.

### B. Konfigurasi File `.env` Backend di cPanel
1. Buka folder backend Anda (misal: `erp-bimapratama/backend` atau `api-bimapratama`).
2. Buat file baru bernama **`.env`** (klik tombol **+ File** di pojok kiri atas File Manager cPanel).
2. Isi file `.env` dengan konfigurasi berikut (sesuaikan nama database & user):
   ```env
   PORT=4000
   NODE_ENV=production

   # Koneksi Database MySQL cPanel
   DATABASE_URL="mysql://usernamecpanel_bimauser:PasswordKuatAnda123!@localhost:3306/usernamecpanel_bimapratama"

   # Keamanan JWT (Gunakan karakter acak panjang)
   JWT_SECRET="kunci-rahasia-bima-pratama-erp-super-aman-2026-minimal-32-karakter"
   JWT_EXPIRES_IN="1d"
   JWT_REFRESH_SECRET="kunci-rahasia-refresh-token-bima-pratama-erp-2026-sangat-rahasia"
   JWT_REFRESH_EXPIRES_IN="7d"

   # Domain Frontend yang diizinkan (CORS)
   CORS_ORIGIN="https://erp.domainanda.com,http://localhost:3000"

   # Redis (Kosongkan jika paket hosting tidak menyediakan Redis port 6379)
   REDIS_HOST="127.0.0.1"
   REDIS_PORT=6379
   REDIS_PASSWORD=""
   ```
3. Klik **Save Changes**.

### C. Daftarkan Aplikasi di "Setup Node.js App"
1. Kembali ke beranda cPanel, lalu klik menu **Setup Node.js App** (atau *Node.js Selector*).
2. Klik tombol **Create Application**:
   - **Node.js version:** Pilih **20.x** atau **22.x** (versi LTS terbaru).
   - **Application mode:** Pilih **Production**.
   - **Application root:** Masukkan `erp-bimapratama/backend` (jika pakai Git Clone) atau `api-bimapratama` (jika upload zip).
   - **Application URL:** Pilih subdomain backend, misal `api.domainanda.com`.
   - **Application startup file:** Masukkan `app.js` (atau `dist/main.js`).
3. Klik **Create** di kanan atas.

### D. Install Dependencies & Build di Server
1. Setelah aplikasi terbuat, cPanel akan menampilkan perintah untuk masuk ke virtual environment, contohnya:
   ```bash
   source /home/usernamecpanel/nodevenv/api-bimapratama/20/bin/activate && cd /home/usernamecpanel/api-bimapratama
   ```
2. Buka menu **Terminal** di cPanel:
   - Salin dan tempel perintah `source ...` di atas, lalu tekan Enter.
   - Install dependensi:
     ```bash
     npm install
     ```
   - Generate Prisma Client:
     ```bash
     npx prisma generate
     ```
   - Sinkronisasi struktur tabel ke database:
     ```bash
     npx prisma db push
     ```
     *(Perintah ini akan membuat seluruh tabel ERP secara otomatis di database MySQL Anda)*.
   - Lakukan build NestJS:
     ```bash
     npm run build
     ```
3. Kembali ke menu **Setup Node.js App**, lalu klik tombol **Restart**.
4. **Verifikasi:** Buka browser dan akses:  
   👉 `https://api.domainanda.com/api/v1/health`  
   Jika keluar response JSON status sukses, backend API telah aktif 100%!

---

## Langkah 4: Deploy Frontend SPA (React Vite) ke `public_html`

Karena frontend menggunakan Vite (React SPA), cara terbaik dan tercepat adalah **melakukan build di komputer lokal**, kemudian meng-upload hasil foldernya ke cPanel.

### A. Konfigurasi API URL & Build Frontend di Lokal
1. Buka folder `frontend` di komputer lokal Anda:
   `c:\laragon\www\erp-bimapratama\frontend`
2. Buat file `.env.production` di dalam folder `frontend`:
   ```env
   VITE_API_URL=https://api.domainanda.com/api/v1
   ```
   *(Ganti dengan URL subdomain backend Anda yang sudah aktif di Langkah 3)*.
3. Buka Terminal / PowerShell di folder frontend, lalu jalankan:
   ```powershell
   cd c:\laragon\www\erp-bimapratama\frontend
   npm run build
   ```
4. Folder `frontend/dist` akan terbuat. Di dalamnya sudah otomatis terpasang:
   - File `.htaccess` (untuk routing React SPA).
   - File `index.html`.
   - Folder `assets/` (berisi bundle JavaScript dan CSS terkompresi).

### B. Upload Hasil Build ke cPanel
1. Kompres seluruh isi folder `frontend/dist/` menjadi file zip, misal **`frontend-dist.zip`**.  
   *(Catatan: kompres **isi** foldernya, bukan foldernya, agar `index.html` langsung berada di root zip)*.
2. Buka **File Manager** cPanel.
3. Masuk ke direktori web frontend Anda:
   - Jika domain utama: Masuk ke **`public_html`**.
   - Jika subdomain (`erp.domainanda.com`): Masuk ke folder subdomain tersebut (biasanya `/public_html/erp` atau `/erp.domainanda.com`).
4. Pastikan folder bersih dari file lama (hapus `cgi-bin` jika ada).
5. Klik **Upload** dan pilih file `frontend-dist.zip`.
6. Klik kanan file yang sudah di-upload, lalu pilih **Extract**.
7. Pastikan file `.htaccess` terlihat di dalam folder tersebut (jika tidak terlihat, klik menu *Settings* di pojok kanan atas File Manager dan centang *Show Hidden Files / dotfiles*).

---

## Langkah 5: Konfigurasi SSL (HTTPS Gratis Let's Encrypt)

Agar komunikasi antara browser, frontend, dan backend aman dan tidak terblokir oleh *mixed-content security browser*:

1. Di cPanel, cari menu **SSL/TLS Status**.
2. Centang domain frontend (`erp.domainanda.com`) dan domain backend (`api.domainanda.com`).
3. Klik tombol **Run AutoSSL**.
4. Tunggu beberapa menit hingga sertifikat SSL terpasang (ikon gembok hijau akan muncul).
5. Pastikan fitur **Force HTTPS Redirect** aktif di menu *Domains* cPanel.

---

## 🔑 Kredensial Default Login Pertama Kali

Setelah seluruh proses selesai, buka browser Anda ke `https://erp.domainanda.com/login`:
- **Username:** `admin`
- **Password:** `password` *(atau password yang Anda atur saat seed database)*

---

## Troubleshooting & Solusi Error Umum cPanel

### 1. Error 404 Not Found Saat Refresh Halaman Web
- **Gejala:** Buka `https://erp.domainanda.com` berhasil, tapi saat klik menu lain lalu tekan F5/Refresh muncul error 404.
- **Penyebab:** Web server Apache tidak menemukan file fisik untuk rute React Router.
- **Solusi:** Pastikan file `.htaccess` dari `frontend/public/.htaccess` sudah berada di direktori web frontend di cPanel.

### 2. Error 503 / 500 Service Unavailable pada Backend
- **Gejala:** URL `https://api.domainanda.com/api/v1/health` menampilkan error 503 atau Internal Server Error.
- **Penyebab:** Aplikasi NestJS gagal menyala (biasanya salah konfigurasi `DATABASE_URL` atau file `dist/main.js` belum di-build).
- **Solusi:**
  1. Buka File Manager cPanel, masuk ke folder `api-bimapratama`.
  2. Buka file log: `stderr.log` untuk melihat pesan error spesifik Node.js.
  3. Pastikan `DATABASE_URL` di file `.env` sudah sesuai dengan user dan password database MySQL cPanel.
  4. Pastikan perintah `npm run build` sudah dijalankan sehingga folder `dist/` tersedia.

### 3. Error CORS (Cross-Origin Resource Sharing)
- **Gejala:** Di browser console muncul pesan: `Access to XMLHttpRequest at 'https://api...' blocked by CORS policy`.
- **Penyebab:** Domain frontend belum didaftarkan di variabel `CORS_ORIGIN`.
- **Solusi:** Buka file `.env` di folder backend, tambahkan domain frontend Anda pada `CORS_ORIGIN`:
  ```env
  CORS_ORIGIN="https://erp.domainanda.com"
  ```
  Lalu klik tombol **Restart** di menu *Setup Node.js App*.

### 4. Database Gagal Terhubung (`ECONNREFUSED` / `Access denied for user`)
- **Penyebab:** User database belum diberi privilege atau password salah.
- **Solusi:**
  1. Di cPanel, buka **MySQL® Databases**.
  2. Scroll ke bagian **Add User To Database**, pilih user dan database Anda, klik **Add**, lalu pastikan **ALL PRIVILEGES** dicentang dan disimpan.
  3. Pastikan host adalah `localhost` (bukan IP eksternal).

---

Selamat! Sistem Bima Pratama ERP 2.0 kini telah online dan beroperasi penuh di server cPanel Anda. 🚀
