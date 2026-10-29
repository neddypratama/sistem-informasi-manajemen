# Panduan Menjalankan Sistem di Komputer Lokal (Windows / Laragon)
## Bima Pratama ERP 2.0 (React 19 + NestJS 11 + MySQL 8)

Dokumen ini berisi panduan praktis dan teruji untuk menjalankan sistem **Bima Pratama ERP 2.0** secara lokal di komputer Windows Anda (menggunakan Laragon atau XAMPP).

> 💡 **Mau meng-upload ke server cPanel?**  
> Silakan ikuti panduan khusus hosting di: [**`TUTORIAL_DEPLOY_CPANEL.md`**](./TUTORIAL_DEPLOY_CPANEL.md).

---

## 1. Persiapan Awal (Prerequisites)

Sebelum menjalankan aplikasi, pastikan:
1. **Database MySQL Aktif:**
   - Buka aplikasi **Laragon** (atau XAMPP), lalu klik tombol **"Start All"**.
   - Pastikan service **MySQL (Port 3306)** berstatus *Running*.
   - Database yang digunakan adalah `bimapratama_v2`.
2. **Node.js Terinstal:**
   - Node.js v20 atau v22 LTS terpasang di sistem (`node -v`).

---

## 2. Cara 1: Menjalankan Menggunakan 1-Click Script (Paling Praktis) 🌟

Kami telah menyediakan script otomatis agar Anda tidak perlu membuka banyak terminal secara manual:

1. Buka folder proyek di File Explorer: `c:\laragon\www\erp-bimapratama`
2. Klik ganda (*double-click*) file:
   👉 **`start-all.bat`**
3. Script otomatis akan:
   - Membuka terminal untuk Backend API (port `4000`).
   - Membuka terminal untuk Frontend SPA (port `3000`).
   - Membuka browser langsung ke `http://localhost:3000`.

> 🛑 **Untuk Menghentikan Sistem:**  
> Cukup klik ganda file **`stop-all.bat`** untuk menutup seluruh service dan membebaskan port 4000 & 3000 secara bersih.

---

## 3. Cara 2: Menjalankan Manual Melalui Terminal (Untuk Development)

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
5. Tunggu hingga muncul pesan log sukses:
   ```text
   [NestApplication] Nest application successfully started
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
   ```text
   VITE v6.1.0  ready in 300 ms

   ➜  Local:   http://localhost:3000/
   ➜  Network: use --host to expose
   ```
5. Buka browser Anda dan kunjungi: **[http://localhost:3000](http://localhost:3000)**.

---

## 4. Cara 3: Menjalankan Menggunakan Docker Compose (Full Stack Isolated)

Jika komputer Anda memiliki Docker Desktop dan ingin menjalankan MySQL 8 + Redis 7 + Backend + Frontend dalam kontainer terisolasi:

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
5. Akses sistem di `http://localhost:3000`.

---

## 5. Kredensial Login Default

Gunakan akun berikut untuk masuk ke aplikasi:
- **URL Login:** `http://localhost:3000/login`
- **Username:** `admin`
- **Password:** `password`

---

## 6. Troubleshooting Masalah Lokal

### Masalah 1: `Error: listen EADDRINUSE: address already in use :::4000`
- **Penyebab:** Ada proses backend node lama yang masih tertinggal berjalan di latar belakang.
- **Solusi Cepat:**
  1. Klik ganda file **`stop-all.bat`**, ATAU
  2. Buka PowerShell dan jalankan perintah satu baris berikut:
     ```powershell
     Stop-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess -Force
     ```

### Masalah 2: `Cannot find module '.../backend/dist/main'` saat `npm run start:dev`
- **Penyebab:** File cache TypeScript `tsbuildinfo` konflik dengan pembersihan folder `dist`.
- **Solusi:**
  Pastikan opsi `"incremental": false` aktif di [backend/tsconfig.json](file:///c:/laragon\www\erp-bimapratama\backend\tsconfig.json#L16), lalu hapus file `backend/tsconfig.build.tsbuildinfo` jika ada.

### Masalah 3: `Database connection failed / Can't connect to MySQL server on 'localhost:3306'`
- **Penyebab:** Laragon MySQL belum dinyalakan atau nama database belum ada.
- **Solusi:**
  1. Buka jendela aplikasi Laragon, lalu klik tombol **Start All**. Pastikan service MySQL berstatus *Running*.
  2. Pastikan database `bimapratama_v2` sudah dibuat di Laragon (bisa dicek lewat HeidiSQL di Laragon).
