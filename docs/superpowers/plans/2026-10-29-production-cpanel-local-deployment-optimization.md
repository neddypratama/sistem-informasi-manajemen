# Implementation Plan: Deployment cPanel & Local Optimization, Documentation & Cleanup

Dokumen ini memuat rencana kerja terstruktur untuk mempersiapkan repositori **Bima Pratama ERP 2.0** agar siap di-upload ke hosting **cPanel** dan dijalankan di **komputer lokal**, merapikan dokumentasi penting, serta membersihkan file sampah/cache yang membuat folder membengkak.

- **Tanggal:** 29 Oktober 2026
- **Target Platform:** cPanel (Shared Hosting / CloudLinux / VPS cPanel) & Local Windows (Laragon)

---

## 1. Analisis Masalah & Kebutuhan

1. **Ukuran Folder Terlalu Besar (888 MB):**
   - Folder `node_modules` (backend 676 MB + frontend 206 MB) memakan 99% ukuran folder.
   - Meng-upload `node_modules` dari Windows ke server Linux (cPanel) adalah **anti-pattern fatal** karena binary native C++ (Bcrypt, Prisma engine) tidak kompatibel lintas OS.
   - Terdapat cache compile `backend/tsconfig.build.tsbuildinfo` dan folder `dist` yang seharusnya di-build secara terisolasi.
   - Solusi: Bersihkan file build/cache, dan sediakan script otomatis 1-klik untuk mengekspor zip bersih (~3-5 MB) yang siap di-upload ke cPanel File Manager.

2. **Dokumentasi Tidak Sesuai Realita Teknis:**
   - `deployment.md` sebelumnya masih mengacu ke PostgreSQL 16 (padahal sistem 100% menggunakan MySQL 8.0 & Prisma MySQL).
   - Belum ada panduan khusus **cPanel** (Setup Node.js App, phpMyAdmin, `.htaccess` SPA React, Phusion Passenger).
   - `TUTORIAL_RUN_MANUAL.md` perlu diperbarui dan diselaraskan agar pemula dapat menjalankan lokal tanpa kendala.
   - File markdown arsitektur (`data.md`, `design.md`, `api_docs.md`, `model_card.md`, `migration_plan.md`, `changelog.md`) berserakan di root directory dan perlu dipindahkan ke folder `docs/`.

3. **Routing React SPA di cPanel:**
   - cPanel menggunakan Apache/LiteSpeed web server untuk static file di `public_html`.
   - Tanpa file `.htaccess`, setiap kali user me-refresh halaman (misal `/transaksi/penjualan` atau `/master/barang`), server akan mengeluarkan error **404 Not Found**.

4. **Konfigurasi API URL:**
   - `frontend/src/lib/api-client.ts` saat ini default ke `http://localhost:4000/api/v1`. Di cPanel, frontend perlu diarahkan ke URL backend cPanel (atau relative `/api/v1` jika di-proxy).

---

## 2. Struktur File Setelah Reorganisasi

```
erp-bimapratama/
├── backend/                        # Backend NestJS 11 + Prisma + MySQL
│   ├── src/
│   ├── prisma/
│   ├── .env.example                # Template ENV backend
│   └── README.md                   # Dokumentasi backend aktual
├── frontend/                       # Frontend React 19 + Vite + Tailwind
│   ├── src/
│   ├── public/
│   │   └── .htaccess               # Konfigurasi Apache rewrite untuk React Router di cPanel
│   ├── .env.example                # Template ENV frontend (VITE_API_URL)
│   └── README.md                   # Dokumentasi frontend aktual
├── docs/                           # Dokumentasi Lengkap & Arsitektur
│   ├── api_docs.md
│   ├── changelog.md
│   ├── data.md
│   ├── design.md
│   ├── migration_plan.md
│   ├── model_card.md
│   └── superpowers/plans/
├── .env.example                    # Template ENV Master
├── .gitignore                      # Git ignore rule
├── docker-compose.yml              # Deployment alternatif via Docker
├── export-clean-cpanel.bat         # Script 1-klik untuk membuat ZIP bersih (~3-5 MB) untuk cPanel
├── README.md                       # Master Readme terupdate
├── start-all.bat                   # Script 1-klik jalankan lokal
├── stop-all.bat                    # Script 1-klik hentikan lokal
├── TUTORIAL_DEPLOY_CPANEL.md       # [UTAMA] Panduan step-by-step deploy ke cPanel
└── TUTORIAL_RUN_MANUAL.md          # [UTAMA] Panduan step-by-step jalankan di komputer lokal
```

---

## 3. Tahapan Eksekusi

### Task 1: Reorganisasi File & Pembersihan File yang Tidak Diperlukan
- [ ] Pindahkan file arsitektur (`api_docs.md`, `changelog.md`, `data.md`, `design.md`, `migration_plan.md`, `model_card.md`) dari root ke folder `docs/`.
- [ ] Hapus `backend/tsconfig.build.tsbuildinfo` yang menyebabkan bug compile watch.
- [ ] Buat file `frontend/public/.htaccess` untuk menangani rewrite rules React Router SPA di cPanel.
- [ ] Buat file `frontend/.env.example` untuk panduan konfigurasi `VITE_API_URL`.

### Task 2: Pembuatan Panduan Deployment cPanel (`TUTORIAL_DEPLOY_CPANEL.md`)
- [ ] Tulis tutorial terperinci berbahasa Indonesia:
  - Persiapan Database di cPanel (MySQL Database Wizard, User & Password, Hak Akses).
  - Import Data via phpMyAdmin (file dump SQL).
  - Setup Frontend React di cPanel (`public_html` atau subdomain, build produksi, `.htaccess`).
  - Setup Backend NestJS di cPanel via **"Setup Node.js App"** (CloudLinux Passenger).
  - Konfigurasi file `.env` di cPanel.
  - Perintah `npm install` dan migrasi database via terminal cPanel.
  - Troubleshooting error umum cPanel (500 Internal Server Error, EADDRINUSE, Passenger Startup Error, 404 pada refresh halaman).

### Task 3: Pembaruan Panduan Lokal (`TUTORIAL_RUN_MANUAL.md`)
- [ ] Perbarui instruksi agar mencakup:
  - Persiapan Laragon (MySQL 3306, database `bimapratama_v2`).
  - Cara 1-klik menggunakan `start-all.bat` dan `stop-all.bat`.
  - Cara manual per terminal dengan perintah terkini.
  - Penanganan port 4000 yang bentrok / EADDRINUSE.

### Task 4: Pembaruan Master `README.md`, `backend/README.md`, dan `frontend/README.md`
- [ ] Perbaiki referensi stack di `README.md` (MySQL 8, Prisma, bukan Postgres).
- [ ] Perbaiki peta folder di `README.md` (hapus ghost folder `SIM_Bima_Pratama/` dan `docker/`, perbarui link ke `docs/`).
- [ ] Buat `backend/README.md` berisi instruksi teknis backend (Prisma, endpoint, skrip build).
- [ ] Buat `frontend/README.md` berisi instruksi teknis frontend (Vite build, environment variable).
- [ ] Perbarui `deployment.md` di `docs/` agar sinkron dengan stack MySQL dan Docker.

### Task 5: Pembuatan Script Otomatis Export ZIP untuk cPanel (`export-clean-cpanel.bat`)
- [ ] Buat script batch/PowerShell yang secara otomatis mem-pack seluruh file proyek penting ke dalam format `.zip` tanpa menyertakan `node_modules`, `dist`, `.git`, file `.env` lokal, maupun cache.
- [ ] Hasil zip dapat langsung di-upload oleh user ke cPanel File Manager dalam hitungan detik.

### Task 6: Verifikasi & Uji Coba Build
- [ ] Uji coba build backend: `npm run build` di folder `backend`.
- [ ] Uji coba build frontend: `npm run build` di folder `frontend`.
- [ ] Jalankan `export-clean-cpanel.bat` untuk memverifikasi zip berhasil dibuat dengan ukuran kecil (~3-5 MB).
