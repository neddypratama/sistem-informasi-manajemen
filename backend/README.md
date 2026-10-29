# Bima Pratama ERP 2.0 - Backend API

Modul backend RESTful API untuk **Bima Pratama ERP 2.0**, dibangun dengan **NestJS 11 + Prisma ORM + MySQL 8.0 + Redis 7**.

---

## 🚀 Fitur Utama Backend

- **Modular Architecture:** Auth, Master Data (Barang, Client, Kategori), Transaksi (Penjualan, Pembelian, Titipan), Keuangan (Piutang, Hutang, Beban, Jurnal Umum, Neraca, Laba Rugi), Inventory & Stok Opname (FIFO valuation), Activity Log, dan ETL Migration.
- **Prisma ORM:** Skema type-safe dengan koneksi ke database MySQL 8.0.
- **JWT & RBAC:** Role-based access control terperinci untuk Kasir, Admin, dan Akuntansi.
- **Phusion Passenger Ready:** Dilengkapi file `app.js` untuk kemudahan deploy di hosting cPanel ("Setup Node.js App").

---

## 🛠️ Perintah Pengembangan (Local Development)

```bash
# 1. Install dependensi
npm install

# 2. Sinkronisasi skema database Prisma (MySQL)
npx prisma generate
npx prisma db push

# 3. Jalankan server dalam mode development (hot-reload)
npm run start:dev

# 4. Build bundle produksi
npm run build

# 5. Jalankan bundle hasil build produksi
node dist/main.js
```

---

## ⚙️ Variabel Lingkungan (`.env`)

Buat file `.env` di folder ini dengan konfigurasi berikut:

```env
PORT=4000
NODE_ENV=development

# Database Connection (MySQL / MariaDB via Laragon)
DATABASE_URL="mysql://root:@localhost:3306/bimapratama_v2"

# JWT Authentication
JWT_SECRET="super-secret-jwt-key-for-bima-pratama-erp-modernization-2026"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_SECRET="super-secret-refresh-jwt-key-2026"
JWT_REFRESH_EXPIRES_IN="7d"

# Allowed CORS Origins
CORS_ORIGIN="http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

# Redis Cache & Queue (Opsional di Lokal)
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
REDIS_PASSWORD=""
```

---

## 🧪 Pengujian (Testing)

```bash
# Unit test
npm run test

# End-to-End (E2E) test
npm run test:e2e
```
