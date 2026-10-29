# Bima Pratama ERP 2.0 (Modernized Architecture)

> **Enterprise Resource Planning (ERP) System Modernization**  
> Usaha Peternakan & Perdagangan Telur, Pakan, Obat Ternak, dan Egg Tray.  
> Migrasi dari Legacy Monolith (Laravel 12 + Livewire Volt) ke **Decoupled Architecture (NestJS + React SPA + PostgreSQL/MySQL 8 + Redis)**.  
> Dirancang untuk skalabilitas performa tinggi dengan ketahanan data **5–10 tahun ke depan**.

---

## 📌 Daftar Dokumen Arsitektur

Dokumentasi lengkap modernisasi sistem telah disusun secara komprehensif pada file-file berikut:

| Dokumen | Deskripsi & Isi Pokok |
| :--- | :--- |
| 📘 [**`design.md`**](./design.md) | **Spesifikasi Arsitektur Sistem Baru**: Desain modular NestJS, React SPA architecture, concurrency management, algoritma FIFO atomik, dan caching layer. |
| 🗄️ [**`data.md`**](./data.md) | **Arsitektur Database & Relasi**: Normalisasi skema, penghapusan *triple-invoicing*, General Ledger (Jurnal Berpasangan), strategi Indexing, Partitioning, dan Snapshot Saldo Bulanan. |
| 📋 [**`model_card.md`**](./model_card.md) | **Domain Models & Business Invariants**: Definisi lengkap entitas data, tipe data, validasi, state machine transaksi, dan aturan integritas bisnis. |
| 🔌 [**`api_docs.md`**](./api_docs.md) | **Spesifikasi REST API v1**: Dokumentasi endpoint, format response terstandarisasi, RBAC permissions, payload request/response, dan background export jobs. |
| 🚀 [**`deployment.md`**](./deployment.md) | **Panduan Deployment & Infrastruktur**: Setup Docker & Docker Compose, Nginx Reverse Proxy, Redis caching, backup otomatis, dan monitoring performa. |
| 📜 [**`changelog.md`**](./changelog.md) | **Riwayat Perubahan & Migrasi**: Evolusi dari v1.0.0 (Legacy Livewire) ke v2.0.0 (Modern Stack), catatan breaking changes, dan roadmap rilis. |
| 🔄 [**`migration_plan.md`**](./migration_plan.md) | **Strategi Migrasi Data**: Rencana ETL data lama 1 tahun ke skema baru, cleansing invoice ganda, rekonsiliasi saldo historis, dan skenario cutover. |

---

## 🎯 Latar Belakang & Masalah Sistem Lama (v1.0)

Sistem legacy yang berada pada folder `SIM_Bima_Pratama` dibangun dengan stack **Laravel 12 + Livewire 3 Volt + Mary UI + MySQL**. Meskipun baru berjalan selama **1 tahun**, sistem sudah mengalami kelambatan (*sluggish/lemot*). 

Berdasarkan audit teknis, akar permasalahannya adalah:
1. **Pola *Triple Invoicing***: Satu kali transaksi penjualan telur menghasilkan 3 record transaksi (`INV-...-BON`, `INV-...-TLR`, `INV-...-HPP`). Volume data membengkak 300%–400% lebih cepat dari seharusnya.
2. **Ketiadaan Database Indexing yang Tepat**: Kolom filter kritis seperti `tanggal`, `type`, dan `status` tidak diindeks. Query menggunakan fungsi `whereDate()` yang mematikan kinerja index (*index suppression*).
3. **Livewire Server-Side Morphing Overhead**: Setiap interaksi filter dan pencarian memicu re-render Blade HTML utuh di server serta melakukan `SELECT *` tabel master (barang, client) secara berulang.
4. **Kalkulasi Laporan Tanpa Snapshot**: Laporan Laba Rugi dan Neraca Aset menghitung seluruh baris transaksi historis secara dinamis melalui loop PHP dan *correlated subqueries* bertingkat. Untuk rentang 5–10 tahun, pendekatan ini dipastikan memicu PHP memory exhaustion dan execution timeout.

---

## 🏗️ Gambaran Arsitektur Baru (v2.0)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER (Browser)                         │
│  React 19 + TypeScript + Vite + Tailwind CSS + Shadcn UI + TanStack     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTPS / JSON REST API
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    GATEWAY & REVERSE PROXY LAYER                        │
│             Nginx / Caddy (SSL, Gzip, Rate Limiter, Cache)              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND APPLICATION LAYER                          │
│               NestJS (Fastify/Express) + TypeScript                     │
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
│   PostgreSQL 16 / MySQL 8.0     │   │               Redis               │
│ - B-Tree Composite Indexes      │   │ - Session & Auth Cache            │
│ - Monthly Balance Snapshots     │   │ - Master Data In-Memory Cache     │
│ - Yearly Table Partitioning     │   │ - BullMQ Asynchronous Jobs       │
└─────────────────────────────────┘   └───────────────────────────────────┘
```

---

## 💻 Tech Stack Ringkasan

| Komponen | Teknologi Terpilih | Versi Target |
| :--- | :--- | :--- |
| **Frontend Framework** | React + Vite + TypeScript | React 19, TypeScript 5.x |
| **UI Components** | Tailwind CSS v4 + Shadcn UI / Radix | Tailwind CSS, Lucide Icons |
| **State & Data Table** | TanStack Query v5 + TanStack Table v8 | Client-side virtualization |
| **Backend Framework** | NestJS (Modular Architecture) | NestJS 11+, Node.js 22 LTS |
| **Database ORM** | Prisma ORM / Kysely Query Builder | Type-safe SQL query engine |
| **Database Engine** | PostgreSQL 16+ (atau MySQL 8.0+) | InnoDB / Relational ACID |
| **Cache & Message Queue**| Redis 7.x + BullMQ | Fast In-memory cache & worker |
| **Container & Ops** | Docker & Docker Compose | Containerized Multi-Service |

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Struktur Folder Workspace Baru
```
erp-bimapratama/
├── SIM_Bima_Pratama/       # Legacy Codebase (Archive/Reference)
├── backend/                # NestJS API Application
├── frontend/               # React SPA Application
├── docker/                 # Konfigurasi Docker & Nginx
├── docs/                   # Dokumen Arsitektur & Spesifikasi
├── README.md               # Master Readme (File ini)
├── design.md               # Technical Design
├── data.md                 # Data Architecture
├── model_card.md           # Domain Models
├── api_docs.md             # API Documentation
├── deployment.md           # Deployment Guide
├── changelog.md            # Version History
└── migration_plan.md       # Data Migration Plan
```

### 2. Menjalankan Lingkungan Pengembangan (Development)

Lihat instruksi detail pada [**`deployment.md`**](./deployment.md) untuk setup Docker Compose satu perintah:
```bash
# Menjalankan database PostgreSQL dan Redis
docker compose -f docker/docker-compose.dev.yml up -d

# Menjalankan Backend API (Port 4000)
cd backend && npm install && npm run start:dev

# Menjalankan Frontend SPA (Port 3000)
cd frontend && npm install && npm run dev
```

---

## 📞 Tim & Pengembang
* **Project Name**: Bima Pratama ERP 2.0
* **Target Scale**: 5–10 Years operational life, 10,000,000+ transaction rows.
* **Architecture Review**: Professional Modernization by Lead Architect.
