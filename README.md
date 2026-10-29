# Bima Pratama ERP 2.0 (Modernized Architecture)

> **Enterprise Resource Planning (ERP) System**  
> Usaha Peternakan & Perdagangan Telur, Pakan, Obat Ternak, dan Egg Tray.  
> Arsitektur Terpisah (*Decoupled Architecture*): **React 19 SPA + NestJS 11 REST API + Prisma ORM + MySQL 8.0 + Redis 7**.  
> Dirancang untuk skalabilitas transaksi tinggi dengan ketahanan data 5–10 tahun ke depan.

---

## ⚡ Panduan Cepat (Pilih Sesuai Kebutuhan)

| Kebutuhan | Dokumen Panduan | Keterangan |
| :--- | :--- | :--- |
| 🌐 **Upload & Hosting ke cPanel** | [**`TUTORIAL_DEPLOY_CPANEL.md`**](./TUTORIAL_DEPLOY_CPANEL.md) | **Langkah step-by-step deploy ke cPanel**, setup database via phpMyAdmin, "Setup Node.js App", dan upload React SPA. |
| 💻 **Menjalankan di Komputer Lokal** | [**`TUTORIAL_RUN_MANUAL.md`**](./TUTORIAL_RUN_MANUAL.md) | Panduan menjalankan aplikasi di Windows menggunakan Laragon (MySQL) & skrip 1-klik `start-all.bat`. |
| 🐳 **Deployment Server VPS / Docker** | [**`docs/deployment.md`**](./docs/deployment.md) | Panduan deployment kontainer penuh (Docker Compose) & instalasi mandiri di VPS Ubuntu (PM2 + Nginx). |

---

## 📦 Ekspor Cepat Tanpa `node_modules` (Untuk Upload ke Hosting)

Folder `node_modules` berukuran besar (~880 MB) dan **tidak boleh** di-upload langsung ke hosting Linux karena binary native-nya berbeda. Kami telah menyediakan skrip otomatis untuk membuat arsip siap upload:

1. Klik ganda file:
   👉 **`export-clean-cpanel.bat`**
2. Skrip akan secara otomatis memaketkan seluruh kode sumber penting ke dalam file:
   👉 **`erp-bimapratama-cpanel.zip`** *(Hanya ~3 - 5 MB, siap di-upload ke File Manager cPanel).*

---

## 📌 Daftar Dokumen Arsitektur & Spesifikasi

Dokumentasi teknis lengkap sistem tersimpan rapi di dalam folder [**`docs/`**](./docs):

| Dokumen | Deskripsi & Isi Pokok |
| :--- | :--- |
| 📘 [**`docs/design.md`**](./docs/design.md) | **Spesifikasi Arsitektur Sistem Baru**: Desain modular NestJS, React SPA architecture, concurrency management, algoritma FIFO atomik, dan caching layer. |
| 🗄️ [**`docs/data.md`**](./docs/data.md) | **Arsitektur Database & Relasi**: Normalisasi skema, penghapusan *triple-invoicing*, General Ledger (Jurnal Berpasangan), strategi Indexing, Partitioning, dan Snapshot Saldo Bulanan. |
| 📋 [**`docs/model_card.md`**](./docs/model_card.md) | **Domain Models & Business Invariants**: Definisi lengkap entitas data, tipe data, validasi, state machine transaksi, dan aturan integritas bisnis. |
| 🔌 [**`docs/api_docs.md`**](./docs/api_docs.md) | **Spesifikasi REST API v1**: Dokumentasi endpoint, format response terstandarisasi, RBAC permissions, payload request/response, dan background export jobs. |
| 🚀 [**`docs/deployment.md`**](./docs/deployment.md) | **Panduan Infrastruktur Server & VPS**: Setup Docker & Docker Compose, Nginx Reverse Proxy, Redis caching, backup otomatis, dan monitoring performa. |
| 📜 [**`docs/changelog.md`**](./docs/changelog.md) | **Riwayat Perubahan & Migrasi**: Evolusi arsitektur ke Modern Stack (v2.0), catatan breaking changes, dan roadmap rilis. |
| 🔄 [**`docs/migration_plan.md`**](./docs/migration_plan.md) | **Strategi Migrasi Data**: Rencana ETL data lama ke skema baru, cleansing invoice ganda, dan rekonsiliasi saldo historis. |

---

## 🏗️ Gambaran Arsitektur Sistem (v2.0)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (Browser)                         │
│  React 19 + TypeScript + Vite + Tailwind CSS + Shadcn UI + TanStack     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / JSON REST API
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    GATEWAY & REVERSE PROXY LAYER                        │
│          cPanel Apache (.htaccess) / Nginx (SSL, Gzip, Cache)           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND APPLICATION LAYER                          │
│                   NestJS 11 + Node.js 20/22 LTS                         │
│  ┌─────────────────┬──────────────────┬────────────────┬──────────────┐ │
│  │ Auth & RBAC     │ Master Data      │ Inventory/FIFO │ Transaksi    │ │
│  ├─────────────────┼──────────────────┼────────────────┼──────────────┤ │
│  │ General Ledger  │ Piutang & Hutang │ Reporting Eng. │ Export Queue │ │
│  └─────────────────┴──────────────────┴────────────────┴──────────────┘ │
└────────────────────────┬───────────────────────┬────────────────────────┘
                         │                       │
                         ▼                       ▼
┌─────────────────────────────────┐   ┌───────────────────────────────────┐
│      DATABASE LAYER             │   │        CACHE & QUEUE LAYER        │
│          MySQL 8.0              │   │               Redis 7             │
│ - Prisma ORM (Type-safe)        │   │ - Session & Auth Cache            │
│ - B-Tree Composite Indexes      │   │ - Master Data In-Memory Cache     │
│ - Monthly Balance Snapshots     │   │ - BullMQ Asynchronous Jobs       │
└─────────────────────────────────┘   └───────────────────────────────────┘
```

---

## 💻 Tech Stack Ringkasan

| Komponen | Teknologi Terpilih | Versi Target |
| :--- | :--- | :--- |
| **Frontend Framework** | React + Vite + TypeScript | React 19, TypeScript 5.x |
| **UI Components** | Tailwind CSS + Lucide Icons | Responsive & Fast |
| **State & Data Table** | TanStack Query v5 + TanStack Table v8 | Client-side virtualization |
| **Backend Framework** | NestJS (Modular Architecture) | NestJS 11+, Node.js 20/22 LTS |
| **Database ORM** | Prisma ORM | Type-safe SQL query engine |
| **Database Engine** | MySQL 8.0+ | InnoDB, ACID compliant |
| **Cache & Message Queue**| Redis 7.x + BullMQ | Fast In-memory cache & worker |
| **Container & Ops** | Docker & Docker Compose / cPanel Passenger | Portabel & Cloud-ready |

---

## 📁 Struktur Folder Workspace

```
erp-bimapratama/
├── backend/                        # Backend NestJS API
│   ├── src/                        # Source code NestJS
│   ├── prisma/                     # Schema Prisma & migrasi MySQL
│   ├── app.js                      # Entry point untuk Phusion Passenger cPanel
│   └── .env.example                # Template konfigurasi backend
├── frontend/                       # Frontend React SPA
│   ├── src/                        # Source code UI & Components
│   ├── public/                     # Asset publik & .htaccess untuk routing cPanel
│   └── .env.example                # Template konfigurasi frontend
├── docs/                           # Dokumentasi Arsitektur & Rencana Kerja
│   ├── api_docs.md                 # Spesifikasi REST API
│   ├── data.md                     # Skema database & GL
│   ├── design.md                   # Desain sistem modular
│   ├── deployment.md               # Panduan deployment VPS & Docker
│   ├── migration_plan.md           # Rencana migrasi data
│   └── model_card.md               # Domain models & aturan bisnis
├── docker-compose.yml              # Konfigurasi container lokal / VPS
├── export-clean-cpanel.bat         # Skrip 1-klik export zip bersih untuk cPanel
├── start-all.bat                   # Skrip 1-klik jalankan lokal
├── stop-all.bat                    # Skrip 1-klik hentikan lokal
├── TUTORIAL_DEPLOY_CPANEL.md       # Panduan deploy cPanel hosting
├── TUTORIAL_RUN_MANUAL.md          # Panduan jalankan di Windows lokal
└── README.md                       # Master dokumentasi proyek (file ini)
```

---

## 🔑 Kredensial Default Login

- **URL Web:** `http://localhost:3000/login` *(atau domain hosting Anda)*
- **Username:** `admin`
- **Password:** `password`
