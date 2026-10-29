# Panduan Cara Menjalankan Sistem Secara Manual (Local Dev & Production)
## Bima Pratama ERP 2.0 (React 19 + NestJS 11 + MySQL)

Dokumen ini berisi tutorial lengkap langkah demi langkah untuk menjalankan sistem Bima Pratama ERP 2.0 di komputer lokal Anda (Windows).

---

## 1. Persiapan Awal (Prerequisites)

Sebelum menjalankan aplikasi, pastikan:
1. **Database MySQL Aktif:**
   - Jika menggunakan **Laragon**: Buka aplikasi Laragon, lalu klik tombol **"Start All"** (pastikan MySQL port 3306 menyala).
   - Database yang digunakan adalah `bimapratama_v2` (data migrasi 83.614 transaksi sudah siap di dalamnya).
2. **Node.js Terinstal:**
   - Node.js v20 atau v22 LTS terpasang di sistem (`node -v`).

---

## 2. Cara 1: Menjalankan Menggunakan 1-Click Script (Paling Mudah) 🌟

Kami telah membuatkan script otomatis agar Anda tidak perlu membuka banyak terminal manual:

1. Buka folder proyek di File Explorer: `c:\laragon\www\erp-bimapratama`
2. Klik ganda (*double-click*) file:
   👉 **`start-all.bat`**
3. Script otomatis akan:
   - Membuka terminal untuk Backend API (port 4000).
   - Membuka terminal untuk Frontend SPA (port 3000).
   - Membuka browser langsung ke `http://localhost:3000`.

> **Untuk menghentikan sistem:** Cukup klik ganda file **`stop-all.bat`**.

---

## 3. Cara 2: Menjalankan Manual Melalui Terminal / Command Prompt

Jika Anda ingin melihat log proses secara langsung atau sedang melakukan modifikasi kode (*coding*), jalankan melalui **2 jendela Terminal terpisah** (PowerShell, Command Prompt, atau Git Bash):

### Langkah A: Jalankan Backend API (Terminal 1)
1. Buka Terminal / PowerShell baru.
2. Pindah ke direktori backend:
   ```powershell
   cd c:\laragon\www\erp-bimapratama\backend
   ```
3. *(Opsional - hanya jika ada perubahan schema)* Generate Prisma Client:
   ```powershell
   npx prisma generate
   ```
4. Jalankan backend dalam mode development (*hot-reload*):
   ```powershell
   npm run start:dev
   ```
   *(Atau jalankan versi build produksi yang super cepat: `node dist/main.js`)*
5. Tunggu hingga muncul pesan log:
   ```
   🚀 Bima Pratama ERP 2.0 API is running on: http://localhost:4000/api/v1
   ```

---

### Langkah B: Jalankan Frontend Web (Terminal 2)
1. Buka Terminal / PowerShell kedua.
2. Pindah ke direktori frontend:
   ```powershell
   cd c:\laragon\www\erp-bimapratama\frontend
   ```
3. Jalankan Vite development server:
   ```powershell
   npm run dev
   ```
4. Terminal akan menampilkan:
   ```
   VITE v6.1.0  ready in 300 ms

   ➜  Local:   http://localhost:3000/
   ➜  Network: use --host to expose
   ```
5. Buka browser Anda dan kunjungi: **[http://localhost:3000](http://localhost:3000)**.

---

## 4. Cara 3: Menjalankan Menggunakan Docker (Mode Produksi Lengkap)

Jika Anda ingin menjalankan seluruh ekosistem (MySQL 8 + Redis 7 + Backend NestJS + Frontend Nginx) dalam kontainer Docker:

1. Pastikan Docker Desktop sedang aktif di Windows.
2. Buka terminal di root direktori proyek:
   ```powershell
   cd c:\laragon\www\erp-bimapratama
   ```
3. Jalankan Docker Compose:
   ```powershell
   docker compose up -d --build
   ```
4. Cek status seluruh kontainer:
   ```powershell
   docker compose ps
   ```
5. Buka web di `http://localhost:3000`.

---

## 5. Kredensial Login

Gunakan akun berikut untuk masuk ke aplikasi:
- **URL Login:** `http://localhost:3000/login`
- **Username:** `admin`
- **Password:** `password`

---

## 6. Troubleshooting (Penyelesaian Masalah)

### Masalah 1: `Error: listen EADDRINUSE: address already in use :::4000`
**Penyebab:** Ada proses backend lama yang masih berjalan di latar belakang.  
**Solusi:**
1. Klik ganda file `stop-all.bat`, ATAU
2. Jalankan perintah ini di PowerShell:
   ```powershell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force
   ```

### Masalah 2: `Database connection failed / Can't connect to MySQL server on 'localhost:3306'`
**Penyebab:** Laragon MySQL belum dinyalakan.  
**Solusi:**
Buka jendela aplikasi Laragon, lalu klik tombol **Start All**. Pastikan service MySQL berstatus *Running*.

### Masalah 3: Ingin Melakukan Build Ulang Frontend
Jika Anda mengubah kode frontend dan ingin membuat bundle produksi baru:
```powershell
cd c:\laragon\www\erp-bimapratama\frontend
npm run build
```
Hasil kompilasi optimal akan tersimpan di folder `frontend/dist`.
