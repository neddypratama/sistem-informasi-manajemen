# Bima Pratama ERP 2.0 - Frontend Web SPA

Aplikasi Single Page Application (SPA) antarmuka pengguna untuk **Bima Pratama ERP 2.0**, dibangun dengan **React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + TanStack Query**.

---

## 🚀 Fitur Utama Frontend

- **Manajemen Transaksi Komprehensif:** Modul Transaksi Penjualan, Pembelian, Retur, dan Bon Titipan Telur & Pakan.
- **Master Data Interaktif:** Searchable selector dengan caching cepat, modal validasi instan, dan datatable canggih.
- **Laporan Keuangan Real-Time:** Laporan Laba Rugi (Umum & Curah), Neraca Saldo, Laporan Kas, Laporan Aset, dan Jurnal Umum.
- **Ekspor Dokumen:** Ekspor laporan ke format Excel (`.xlsx`) dan PDF langsung dari browser.
- **cPanel Apache Ready:** Dilengkapi file `public/.htaccess` untuk memastikan routing React Router bekerja mulus tanpa error 404 saat refresh halaman.

---

## 🛠️ Perintah Pengembangan (Local Development)

```bash
# 1. Install dependensi
npm install

# 2. Jalankan development server (port 3000)
npm run dev

# 3. Kompilasi bundle produksi
npm run build
```

Hasil build tersimpan di folder `dist/` dan siap di-upload ke direktori web cPanel (`public_html`).

---

## ⚙️ Variabel Lingkungan (`.env`)

Konfigurasi URL Backend API diatur melalui file `.env`:

```env
# Mode Lokal:
VITE_API_URL=http://localhost:4000/api/v1

# Mode Produksi cPanel (Subdomain API):
# VITE_API_URL=https://api.bimapratama.com/api/v1
```
