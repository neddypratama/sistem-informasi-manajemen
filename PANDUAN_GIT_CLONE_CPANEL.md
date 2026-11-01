# 🚀 Panduan Lengkap Hosting Bima Pratama ERP di cPanel dengan Git Clone

Dokumen ini memandu Anda melakukan deployment dan hosting **Bima Pratama ERP 2.0 (NestJS + React Vite + MySQL)** di server hosting berbasis **cPanel** menggunakan metode **Git Clone**.

Metode Git Clone adalah cara paling direkomendasikan karena:
1. **Bersih:** Tidak membawa sampah folder `node_modules` atau binary Windows.
2. **Cepat:** File ditransfer langsung dari GitHub ke server berkecepatan tinggi data center.
3. **Praktis:** Setiap kali ada update kode di kemudian hari, Anda cukup menjalankan 1 perintah `git pull` atau menggunakan script `./deploy.sh`.

---

## 📋 Daftar Isi
1. [Arsitektur & Kebutuhan Server cPanel](#1-arsitektur--kebutuhan-server-cpanel)
2. [Langkah 1: Setup Database MySQL di cPanel](#langkah-1-setup-database-mysql-di-cpanel)
3. [Langkah 2: Menghubungkan GitHub ke cPanel (SSH Deploy Key)](#langkah-2-menghubungkan-github-ke-cpanel-ssh-deploy-key)
4. [Langkah 3: Melakukan Git Clone di cPanel](#langkah-3-melakukan-git-clone-di-cpanel)
5. [Langkah 4: Konfigurasi & Menjalankan Backend API (NestJS)](#langkah-4-konfigurasi--menjalankan-backend-api-nestjs)
6. [Langkah 5: Konfigurasi & Build Frontend (React Vite)](#langkah-5-konfigurasi--build-frontend-react-vite)
7. [Langkah 6: Pasang SSL HTTPS (AutoSSL)](#langkah-6-pasang-ssl-https-autossl)
8. [Langkah 7: Cara Update Kode di Kemudian Hari (CI/CD Praktis)](#langkah-7-cara-update-kode-di-kemudian-hari-cicd-praktis)
9. [Troubleshooting Masalah Umum](#troubleshooting-masalah-umum)

---

## 1. Arsitektur & Kebutuhan Server cPanel

### Kebutuhan Server:
- **cPanel Hosting** (Shared Hosting, CloudLinux, atau VPS cPanel).
- Fitur cPanel:
  - **Setup Node.js App** (Node.js versi **20.x atau 22.x LTS**).
  - **Terminal** atau akses SSH.
  - **MySQL Database Wizard** & **phpMyAdmin**.
- Rekomendasi Domain / Subdomain:
  - **Frontend Web:** `erp.domainanda.com` (atau domain utama `domainanda.com`).
  - **Backend API:** `api.domainanda.com`.

### Skema Direktori di cPanel:
```text
/home/usernamecpanel/
├── erp-bimapratama/          <-- Hasil Git Clone
│   ├── backend/              <-- Didaftarkan di "Setup Node.js App"
│   ├── frontend/             <-- Sumber kode React Vite
│   └── deploy.sh             <-- Script otomatis update 1-klik
└── public_html/              <-- Document root web frontend (hasil copy build frontend)
    ├── index.html
    ├── assets/
    └── .htaccess             <-- Routing React SPA agar tidak 404 saat refresh
```

---

## Langkah 1: Setup Database MySQL di cPanel

1. Login ke cPanel Anda.
2. Buka menu **MySQL® Database Wizard**:
   - **Step 1 (Create A Database):** Beri nama database, misal `bimapratama`.  
     *(Nama lengkap akan menjadi: `usernamecpanel_bimapratama`)*. Klik **Next Step**.
   - **Step 2 (Create Database Users):** Masukkan nama user, misal `bimauser`, dan buat password yang kuat. Catat password ini. Klik **Create User**.
   - **Step 3 (Add User to Database):** Centang **ALL PRIVILEGES**. Klik **Make Changes**.
3. Buka menu **phpMyAdmin** di cPanel:
   - Pilih database `usernamecpanel_bimapratama`.
   - Klik menu **Import**.
   - Upload file database SQL terbaru Anda (`bimapratama_v2.sql` atau file zip-nya).
   - Klik **Go** / **Kirim** dan tunggu hingga proses import tabel selesai.

---

## Langkah 2: Menghubungkan GitHub ke cPanel (SSH Deploy Key)

Jika repository GitHub Anda bersifat **Private** (paling umum), Anda perlu memberikan izin akses ke cPanel menggunakan SSH Deploy Key:

1. Di cPanel, buka menu **Terminal** (atau **SSH Access**).
2. Buat pasangan kunci SSH baru dengan perintah:
   ```bash
   ssh-keygen -t ed25519 -C "cpanel-erp" -f ~/.ssh/id_github -N ""
   ```
3. Konfigurasikan SSH agar otomatis memakai kunci ini saat menghubungi GitHub:
   ```bash
   cat << 'EOF' >> ~/.ssh/config
   Host github.com
       IdentityFile ~/.ssh/id_github
       StrictHostKeyChecking no
   EOF
   chmod 600 ~/.ssh/config ~/.ssh/id_github
   ```
4. Tampilkan Public Key yang baru dibuat:
   ```bash
   cat ~/.ssh/id_github.pub
   ```
   *Salin seluruh teks yang muncul (dimulai dari `ssh-ed25519 ...`).*
5. Buka halaman repository proyek Anda di **GitHub**:
   - Klik tab **Settings** > **Deploy keys**.
   - Klik **Add deploy key**.
   - **Title:** `cPanel Hosting Server`.
   - **Key:** Tempelkan Public Key yang disalin dari cPanel tadi.
   - Klik **Add key**.

> 💡 *Jika repository Anda Public, Anda dapat langsung melakukan clone tanpa perlu konfigurasi SSH key di atas.*

---

## Langkah 3: Melakukan Git Clone di cPanel

1. Buka menu **Terminal** di cPanel.
2. Masuk ke direktori home akun Anda:
   ```bash
   cd ~
   ```
3. Lakukan clone repository:
   - **Jika menggunakan SSH (Private Repo):**
     ```bash
     git clone git@github.com:USERNAME_GITHUB/NAMA_REPO.git erp-bimapratama
     ```
   - **Jika menggunakan HTTPS:**
     ```bash
     git clone https://github.com/USERNAME_GITHUB/NAMA_REPO.git erp-bimapratama
     ```
4. Masuk ke folder proyek dan beri izin eksekusi script deploy:
   ```bash
   cd ~/erp-bimapratama
   chmod +x deploy.sh
   ```

---

## Langkah 4: Konfigurasi & Menjalankan Backend API (NestJS)

### A. Buat File Environment (`.env`) Backend
1. Masuk ke folder backend:
   ```bash
   cd ~/erp-bimapratama/backend
   nano .env
   ```
   *(Atau buat file `.env` melalui File Manager cPanel di folder `erp-bimapratama/backend`)*.
2. Isi dengan variabel berikut (sesuaikan nama database, user, dan domain Anda):
   ```env
   PORT=4000
   NODE_ENV=production

   # Koneksi Database MySQL cPanel
   DATABASE_URL="mysql://usernamecpanel_bimauser:PasswordDatabaseAnda@localhost:3306/usernamecpanel_bimapratama"

   # Keamanan Token JWT (Gunakan karakter acak panjang)
   JWT_SECRET="kunci-rahasia-bima-pratama-erp-super-aman-minimal-32-karakter"
   JWT_EXPIRES_IN="1d"
   JWT_REFRESH_SECRET="kunci-rahasia-refresh-token-bima-pratama-erp-2026-sangat-rahasia"
   JWT_REFRESH_EXPIRES_IN="7d"

   # Domain Frontend yang diizinkan mengakses API (CORS)
   CORS_ORIGIN="https://erp.domainanda.com"

   # Redis (Opsional, kosongkan jika tidak ada)
   REDIS_HOST="127.0.0.1"
   REDIS_PORT=6379
   REDIS_PASSWORD=""
   ```
3. Simpan file (`Ctrl + O`, lalu `Enter`, lalu `Ctrl + X` jika memakai nano).

---

### B. Daftarkan Aplikasi di "Setup Node.js App"
1. Di cPanel, buka menu **Setup Node.js App** (atau *Node.js Selector*).
2. Klik tombol **Create Application**:
   - **Node.js version:** Pilih **20.x** atau **22.x** (LTS).
   - **Application mode:** Pilih **Production**.
   - **Application root:** Masukkan `erp-bimapratama/backend`.
   - **Application URL:** Pilih domain/subdomain backend (misal: `api.domainanda.com`).
   - **Application startup file:** Masukkan `app.js`.
3. Klik **Create** di pojok kanan atas.
4. Salin perintah **Command for entering to the virtual environment** yang muncul di bagian atas halaman (contoh: `source /home/user/nodevenv/erp-bimapratama/backend/20/bin/activate && cd /home/user/erp-bimapratama/backend`).

---

### C. Install Dependencies & Build Backend
1. Buka menu **Terminal** di cPanel.
2. Tempelkan perintah virtual environment tadi, lalu tekan Enter:
   ```bash
   source /home/usernamecpanel/nodevenv/erp-bimapratama/backend/20/bin/activate && cd /home/usernamecpanel/erp-bimapratama/backend
   ```
3. Jalankan instalasi library dan build NestJS:
   ```bash
   npm install --production=false
   npx prisma generate
   npm run build
   ```
4. Kembali ke menu **Setup Node.js App**, lalu klik tombol **Restart**.
5. **Uji Backend:** Buka browser dan buka:
   👉 `https://api.domainanda.com/api/v1/health`  
   Jika muncul respon JSON status `"OK"`, backend sudah aktif 100%!

---

## Langkah 5: Konfigurasi & Build Frontend (React Vite)

### A. Buat File Environment Frontend
1. Buka folder frontend di Terminal cPanel:
   ```bash
   cd ~/erp-bimapratama/frontend
   nano .env.production
   ```
2. Isi alamat API backend Anda:
   ```env
   VITE_API_URL=https://api.domainanda.com/api/v1
   ```
3. Simpan file.

---

### B. Install Dependencies & Build Frontend
Jalankan di Terminal:
```bash
npm install
npm run build
```
Proses ini akan menghasilkan folder `dist/` yang memuat `index.html`, bundle CSS/JS, dan file `.htaccess`.

---

### C. Sambungkan Hasil Build ke Folder Web Publik
Pindahkan/Copy seluruh isi folder `dist/` ke direktori domain frontend Anda:
- **Jika domain utama:** Ke `~/public_html/`
  ```bash
  cp -r ~/erp-bimapratama/frontend/dist/* ~/public_html/
  cp ~/erp-bimapratama/frontend/dist/.htaccess ~/public_html/.htaccess
  ```
- **Jika subdomain (`erp.domainanda.com`):** Ke folder subdomain tersebut (misal `~/public_html/erp/`):
  ```bash
  cp -r ~/erp-bimapratama/frontend/dist/* ~/public_html/erp/
  cp ~/erp-bimapratama/frontend/dist/.htaccess ~/public_html/erp/.htaccess
  ```

---

## Langkah 6: Pasang SSL HTTPS (AutoSSL)

Untuk keamanan data dan menghindari blokir CORS di browser:
1. Di cPanel, cari menu **SSL/TLS Status**.
2. Centang domain frontend (`erp.domainanda.com`) dan backend (`api.domainanda.com`).
3. Klik tombol **Run AutoSSL**.
4. Tunggu 1–3 menit hingga sertifikat SSL terpasang (ikon gembok hijau muncul).
5. Pastikan opsi **Force HTTPS Redirect** diaktifkan pada menu **Domains** di cPanel.

---

## Langkah 7: Cara Update Kode di Kemudian Hari (CI/CD Praktis)

Kapan saja Anda melakukan perbaikan kode di komputer lokal dan telah melakukan `git push` ke GitHub, cara meng-updatenya di server cPanel sangat mudah:

1. Buka menu **Terminal** di cPanel.
2. Masuk ke folder proyek dan jalankan script deploy:
   ```bash
   cd ~/erp-bimapratama
   ./deploy.sh
   ```
Script ini akan otomatis:
1. Menjalankan `git pull` dari GitHub.
2. Meng-update dependensi dan me-rebuild backend.
3. Me-restart service Node.js Passenger secara otomatis.
4. Meng-compile ulang frontend React Vite.
5. Menyalin file dist ke `public_html`.

---

## Troubleshooting Masalah Umum

### 1. Error 404 Not Found Saat Refresh Halaman Web
- **Penyebab:** Web server Apache tidak menemukan rute React Router.
- **Solusi:** Pastikan file `.htaccess` dari `frontend/dist/.htaccess` sudah berada di `public_html`. Jika tidak kelihatan di File Manager, aktifkan opsi *Show Hidden Files (dotfiles)* di setting pojok kanan atas File Manager.

### 2. Error 503 / 500 Service Unavailable pada Backend
- **Penyebab:** Konfigurasi koneksi MySQL salah atau file `dist/main.js` belum terbentuk.
- **Solusi:**
  1. Periksa file `~/erp-bimapratama/backend/stderr.log` untuk melihat detail error Node.js.
  2. Pastikan `DATABASE_URL` di `.env` sudah memakai user, password, dan nama database cPanel yang benar.
  3. Pastikan sudah menjalankan `npm run build` di folder backend.

### 3. Masalah CORS (Cross-Origin Resource Sharing)
- **Penyebab:** Domain frontend belum didaftarkan di variabel `CORS_ORIGIN` backend.
- **Solusi:** Buka file `.env` di backend, pastikan `CORS_ORIGIN="https://erp.domainanda.com"`, lalu klik tombol **Restart** di menu Setup Node.js App.

---
Semoga panduan ini membantu! Sistem ERP Bima Pratama kini siap digunakan secara online dan mudah dirawat via Git. 🚀
