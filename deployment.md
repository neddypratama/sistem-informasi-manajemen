# Panduan Deployment & Infrastruktur (Deployment.md)
## Bima Pratama ERP 2.0 (Production & Local Setup)

---

## 1. Kebutuhan Spesifikasi Server (Sizing 5–10 Tahun)

Untuk memastikan sistem sanggup melayani jutaan transaksi dengan waktu muat di bawah 1 detik selama 5–10 tahun:

| Komponen | Spesifikasi Minimum (Tahun 1–3) | Spesifikasi Rekomendasi (Tahun 4–10) |
| :--- | :--- | :--- |
| **CPU** | 4 Core (Intel Xeon / AMD EPYC / Core i5+) | 8 Core vCPU / High Frequency |
| **RAM** | 8 GB DDR4 / ECC | 16 GB – 32 GB DDR4/DDR5 |
| **Storage** | 100 GB NVMe SSD (PCIe 4.0) | 500 GB NVMe SSD RAID-1 (Mirroring) |
| **OS** | Ubuntu Server 24.04 LTS / Debian 12 | Ubuntu Server 24.04 LTS |
| **Backup** | External HDD / Cloud S3 Storage | Daily Automated Snapshot + Offsite S3 |

---

## 2. Arsitektur Kontainer Docker Compose

Seluruh komponen sistem dikemas dalam kontainer Docker terisolasi untuk portabilitas tinggi:

```
┌──────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE NETWORK                    │
│                                                              │
│  ┌────────────────┐     ┌─────────────────────────────────┐  │
│  │   NGINX GATEWAY│────►│  FRONTEND (React SPA / Nginx)   │  │
│  │   (Port 80/443)│     │  (Port 80 internal)             │  │
│  └───────┬────────┘     └─────────────────────────────────┘  │
│          │                                                   │
│          ▼                                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  BACKEND API (NestJS 11 + Node.js 22 LTS)              │  │
│  │  (Port 4000 internal)                                  │  │
│  └───────┬───────────────────────────────┬────────────────┘  │
│          │                               │                   │
│          ▼                               ▼                   │
│  ┌────────────────┐             ┌─────────────────────────┐  │
│  │  POSTGRESQL 16 │             │  REDIS 7 (CACHE & QUEUE)│  │
│  │  (Port 5432)   │             │  (Port 6379)            │  │
│  └────────────────┘             └────────────┬────────────┘  │
│                                              │               │
│                                 ┌────────────▼────────────┐  │
│                                 │  BULLMQ WORKER (EXPORT) │  │
│                                 │  (Node.js Background)   │  │
│                                 └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Konfigurasi `docker-compose.yml` Produksi

```yaml
version: '3.8'

services:
  # 1. Database PostgreSQL
  postgres:
    image: postgres:16-alpine
    container_name: bimapratama-postgres
    restart: always
    environment:
      POSTGRES_DB: bimapratama_erp
      POSTGRES_USER: erp_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    networks:
      - erp-network

  # 2. In-Memory Cache & Message Queue
  redis:
    image: redis:7-alpine
    container_name: bimapratama-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redisdata:/data
    networks:
      - erp-network

  # 3. Backend NestJS API
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: bimapratama-api
    restart: always
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://erp_user:${DB_PASSWORD}@postgres:5432/bimapratama_erp?schema=public
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - erp-network

  # 4. Background Queue Worker (Export Excel & Sync)
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    container_name: bimapratama-worker
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://erp_user:${DB_PASSWORD}@postgres:5432/bimapratama_erp?schema=public
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    depends_on:
      - postgres
      - redis
    networks:
      - erp-network

  # 5. Frontend React SPA
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: bimapratama-web
    restart: always
    networks:
      - erp-network

  # 6. Reverse Proxy Nginx & SSL
  nginx:
    image: nginx:alpine
    container_name: bimapratama-gateway
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
    networks:
      - erp-network

volumes:
  pgdata:
  redisdata:

networks:
  erp-network:
    driver: bridge
```

---

## 4. Konfigurasi Optimasi Database (`postgresql.conf`)

Untuk RAM 16 GB dan penyimpanan SSD NVMe:
```ini
# Memory Configuration
shared_buffers = 4GB                  # 25% dari total RAM
effective_cache_size = 12GB           # 75% dari total RAM
maintenance_work_mem = 1GB
work_mem = 64MB                       # Mencegah disk spill saat query agregasi laporan

# Checkpoint & WAL
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 16GB
min_wal_size = 2GB

# Query Planner Optimization for SSD
random_page_cost = 1.1                # Kecepatan random seek pada SSD NVMe
effective_io_concurrency = 200

# Connection
max_connections = 150
```

---

## 5. Strategi Otomasi Backup Data (Jaminan 5–10 Tahun)

Data finansial dan inventaris harus terlindungi dari kerusakan hardware atau kehilangan data.

### Script Backup Harian Otomatis (`backup.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/bimapratama"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="$BACKUP_DIR/erp_backup_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

# Dump database dengan kompresi gzip
docker exec -t bimapratama-postgres pg_dump -U erp_user bimapratama_erp | gzip > $FILENAME

# Retensi: Hapus file backup lokal yang lebih lama dari 30 hari
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete

echo "Backup sukses dibuat: $FILENAME"
```

Jadwalkan di cron (`crontab -e`):
```cron
# Backup otomatis setiap hari pukul 02.00 pagi
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

---

## 6. Prosedur Menjalankan di Lingkungan Lokal (Developer Setup)

Jika dijalankan di komputer kantor / laptop lokal (Laragon / Node.js langsung):

```bash
# 1. Pastikan Node.js 22 LTS, PostgreSQL, dan Redis terpasang
node -v  # v22.x

# 2. Setup Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev  # Berjalan di http://localhost:4000

# 3. Setup Frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev        # Berjalan di http://localhost:3000
```
