# Arsitektur Data & Skema Database (Data.md)
## Bima Pratama ERP 2.0 (PostgreSQL / MySQL 8.0)

---

## 1. Prinsip Desain Data & Normalisasi

Sistem lama mengalami penurunan performa drastis karena **data tidak ternormalisasi dengan benar**, menggunakan relasi string `LIKE '%...'`, dan menduplikasi data transaksi hingga 3–4 kali lipat untuk satu aktivitas penjualan.

Pada ERP 2.0, skema didesain ulang dengan prinsip:
1. **Third Normal Form (3NF) & ACID Compliant:** Data transaksi header dan item dipisahkan dengan relasi foreign key yang terdefinisi ketat.
2. **Double-Entry General Ledger (Buku Besar Akuntansi):** Setiap transaksi keuangan secara otomatis membentuk pasangan jurnal umum debit dan kredit tanpa membuat transaksi fiktif.
3. **Optimasi Index Komposit:** Setiap kolom yang digunakan untuk penyaringan (*filtering*), pengurutan (*sorting*), atau pengelompokan (*grouping*) memiliki B-Tree Index yang terukur.
4. **Snapshot Saldo Periodik:** Tabel `monthly_account_balances` menyimpan posisi saldo akhir setiap bulan sehingga pelaporan tahun ke-5 hingga ke-10 tidak membebani komputasi database.

---

## 2. Diagram Relasi Entitas (Entity-Relationship Diagram)

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│     CLIENTS     │        │    TRANSAKSIS    │        │      USERS      │
│─────────────────│        │──────────────────│        │─────────────────│
│ id (PK)         │◄───────┤ client_id (FK)   ├───────►│ id (PK)         │
│ code            │        │ user_id (FK)     │        │ username        │
│ name            │        │ invoice          │        │ role_id (FK)    │
│ type (Pedagang/ │        │ tanggal          │        └─────────────────┘
│       Peternak) │        │ type (Jual/Beli) │
└─────────────────┘        │ total            │
                           │ status           │
                           └────────┬─────────┘
                                    │ 1
                                    │
                                    │ N
                           ┌────────┴─────────┐
                           │ DETAIL_TRANSAKSI │
                           │──────────────────│
                           │ id (PK)          │
                     ┌────►│ transaksi_id(FK) │
                     │     │ barang_id (FK)   ├───────►┌─────────────────┐
                     │     │ qty              │        │     BARANGS     │
                     │     │ harga_satuan     │        │─────────────────│
                     │     │ subtotal         │        │ id (PK)         │
                     │     │ total_hpp        │        │ name            │
                     │     └────────┬─────────┘        │ jenis_id (FK)   │
                     │              │                  │ satuan_id (FK)  │
                     │              │ 1                └─────────────────┘
                     │              │
                     │              │ N
┌─────────────────┐  │     ┌────────┴──────────┐       ┌─────────────────┐
│  STOK_BATCHES   │  │     │STOK_KELUAR_BATCHES│       │  JURNAL_UMUMS   │
│─────────────────│  │     │───────────────────│       │─────────────────│
│ id (PK)         │  │     │ id (PK)           │       │ id (PK)         │
│ barang_id (FK)  │  │     │ detail_trans_id   │◄──────┤ transaksi_id    │
│ detail_trans_id ├──┘     │ stok_batch_id (FK)├──────►│ tanggal         │
│ qty_masuk       │        │ qty               │       │ nomor_jurnal    │
│ qty_sisa        │        │ harga_beli        │       └────────┬────────┘
│ harga_beli      │        └───────────────────┘                │ 1
│ tanggal         │                                             │ N
└─────────────────┘                                    ┌────────┴────────┐
                                                       │ JURNAL_DETAILS  │
                                                       │─────────────────│
                                                       │ id (PK)         │
                                                       │ jurnal_id (FK)  │
                                                       │ coa_id (FK)     │
                                                       │ debit / kredit  │
                                                       └─────────────────┘
```

---

## 3. Definisi Skema Tabel Inti (DDL SQL)

### A. Tabel Master & Pengguna
```sql
-- 1. Roles & Users
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Barang & Kategori
CREATE TABLE jenis_barangs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- 'Telur', 'Pakan Sentrat', 'Obat', 'Egg Tray'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE satuans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Kg', 'Butir', 'Sak', 'Ikat', 'Botol', 'Pcs'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE barangs (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    jenis_id INT NOT NULL REFERENCES jenis_barangs(id),
    satuan_id INT NOT NULL REFERENCES satuans(id),
    stok_minimum DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Master Client (Pedagang, Peternak, Supplier, Karyawan)
CREATE TYPE client_type AS ENUM ('Pedagang', 'Peternak', 'Supplier', 'Karyawan');

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    type client_type NOT NULL,
    phone VARCHAR(30),
    alamat TEXT,
    saldo_piutang DECIMAL(15,2) DEFAULT 0, -- Denormalized cache balance
    saldo_hutang DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### B. Tabel Transaksi & Detail
```sql
CREATE TYPE transaksi_type AS ENUM (
    'PENJUALAN', 
    'PEMBELIAN', 
    'RETUR_PENJUALAN', 
    'RETUR_PEMBELIAN', 
    'KAS_MASUK', 
    'KAS_KELUAR'
);

CREATE TYPE transaksi_status AS ENUM ('DRAFT', 'SELESAI', 'BATAL');
CREATE TYPE payment_method AS ENUM ('TUNAI', 'TRANSFER', 'KREDIT_BON');

CREATE TABLE transaksis (
    id BIGSERIAL PRIMARY KEY,
    invoice VARCHAR(60) NOT NULL UNIQUE,
    tanggal TIMESTAMPTZ NOT NULL,
    type transaksi_type NOT NULL,
    status transaksi_status DEFAULT 'DRAFT',
    payment_method payment_method NOT NULL,
    client_id INT REFERENCES clients(id),
    user_id INT NOT NULL REFERENCES users(id),
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    diskon DECIMAL(15,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detail_transaksis (
    id BIGSERIAL PRIMARY KEY,
    transaksi_id BIGINT NOT NULL REFERENCES transaksis(id) ON DELETE CASCADE,
    barang_id INT NOT NULL REFERENCES barangs(id),
    qty DECIMAL(12,2) NOT NULL,
    harga_satuan DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    hpp_satuan DECIMAL(15,2) DEFAULT 0, -- Nilai HPP dari perhitungan FIFO
    total_hpp DECIMAL(15,2) DEFAULT 0,
    
    -- Khusus grading telur (jika relevan)
    telur_bentes DECIMAL(10,2) DEFAULT 0,
    telur_kotor DECIMAL(10,2) DEFAULT 0,
    telur_ceplok DECIMAL(10,2) DEFAULT 0,
    telur_jumbo DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### C. Tabel Manajemen Batch & FIFO Inventory
```sql
CREATE TABLE stok_batches (
    id BIGSERIAL PRIMARY KEY,
    barang_id INT NOT NULL REFERENCES barangs(id),
    detail_transaksi_id BIGINT REFERENCES detail_transaksis(id) ON DELETE SET NULL,
    user_id INT NOT NULL REFERENCES users(id),
    tanggal TIMESTAMPTZ NOT NULL,
    qty_masuk DECIMAL(12,2) NOT NULL,
    qty_sisa DECIMAL(12,2) NOT NULL,
    harga_beli DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_qty_sisa CHECK (qty_sisa >= 0)
);

CREATE TABLE stok_keluar_batches (
    id BIGSERIAL PRIMARY KEY,
    detail_transaksi_id BIGINT NOT NULL REFERENCES detail_transaksis(id) ON DELETE CASCADE,
    stok_batch_id BIGINT NOT NULL REFERENCES stok_batches(id),
    qty DECIMAL(12,2) NOT NULL,
    harga_beli DECIMAL(15,2) NOT NULL,
    returned_qty DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### D. Tabel Akuntansi & General Ledger (Double-Entry)
```sql
CREATE TYPE coa_type AS ENUM ('Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban', 'HPP');

CREATE TABLE chart_of_accounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE, -- '1-1000' Kas, '1-1200' Piutang Usaha
    name VARCHAR(150) NOT NULL,
    type coa_type NOT NULL,
    normal_balance VARCHAR(6) NOT NULL, -- 'DEBIT' atau 'KREDIT'
    parent_id INT REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jurnal_umums (
    id BIGSERIAL PRIMARY KEY,
    transaksi_id BIGINT REFERENCES transaksis(id) ON DELETE CASCADE,
    nomor_jurnal VARCHAR(60) NOT NULL UNIQUE,
    tanggal TIMESTAMPTZ NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jurnal_details (
    id BIGSERIAL PRIMARY KEY,
    jurnal_id BIGINT NOT NULL REFERENCES jurnal_umums(id) ON DELETE CASCADE,
    coa_id INT NOT NULL REFERENCES chart_of_accounts(id),
    debit DECIMAL(15,2) DEFAULT 0,
    kredit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Snapshot Saldo Bulanan untuk Laporan Cepat
CREATE TABLE monthly_account_balances (
    id BIGSERIAL PRIMARY KEY,
    coa_id INT NOT NULL REFERENCES chart_of_accounts(id),
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_kredit DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_period_coa UNIQUE (coa_id, period_year, period_month)
);
```

---

## 4. Strategi Indexing untuk Skala 5–10 Tahun

Berikut adalah indeks komposit krusial yang menjamin query jutaan baris tetap di bawah 50ms:

```sql
-- 1. Indexing Transaksi: Pencarian harian, filter status & jenis
CREATE INDEX idx_transaksis_tgl_status ON transaksis (tanggal DESC, status, type);
CREATE INDEX idx_transaksis_client ON transaksis (client_id, tanggal DESC);
CREATE INDEX idx_transaksis_invoice ON transaksis (invoice);

-- 2. Indexing Detail Transaksi
CREATE INDEX idx_detail_transaksis_transaksi ON detail_transaksis (transaksi_id);
CREATE INDEX idx_detail_transaksis_barang ON detail_transaksis (barang_id);

-- 3. Indexing FIFO Stok Batches (KUNCI ALOKASI FIFO CEPAT)
CREATE INDEX idx_stok_batches_fifo ON stok_batches (barang_id, qty_sisa, tanggal ASC) WHERE qty_sisa > 0;

-- 4. Indexing Log Keluar Batch
CREATE INDEX idx_stok_keluar_detail ON stok_keluar_batches (detail_transaksi_id);
CREATE INDEX idx_stok_keluar_batch ON stok_keluar_batches (stok_batch_id);

-- 5. Indexing Jurnal Akuntansi (KUNCI LAPORAN KEUANGAN INSTAN)
CREATE INDEX idx_jurnal_umums_tanggal ON jurnal_umums (tanggal DESC);
CREATE INDEX idx_jurnal_details_coa ON jurnal_details (coa_id, jurnal_id);

-- 6. Indexing Saldo Bulanan
CREATE INDEX idx_monthly_balances_period ON monthly_account_balances (period_year, period_month, coa_id);
```

---

## 5. Strategi Partisi Tabel (Table Partitioning)

Jika volume transaksi diproyeksikan melebihi **1.000.000 baris per tahun**, tabel `transaksis`, `detail_transaksis`, dan `jurnal_details` dapat dipartisi per tahun menggunakan *PostgreSQL Declarative Partitioning*.

Dengan partisi ini, query laporan bulan tertentu hanya memindai partisi tahun terkait (*Partition Pruning*), sehingga database dengan 10 tahun data memiliki kecepatan baca yang sama persis dengan database yang baru berjalan 1 tahun.
