# Panduan Deployment & Infrastruktur (VPS & Docker)
## Bima Pratama ERP 2.0 (NestJS 11 + React 19 + MySQL 8 + Redis 7)

> 💡 **Khusus Pengguna cPanel Hosting:**  
> Jika Anda menggunakan hosting berbasis cPanel, silakan langsung ikuti panduan khusus di [**`TUTORIAL_DEPLOY_CPANEL.md`**](../TUTORIAL_DEPLOY_CPANEL.md).

Dokumen ini memandu deployment sistem **Bima Pratama ERP 2.0** pada server **VPS / Cloud Dedicated** (Ubuntu 22.04 / 24.04 LTS) menggunakan **Docker Compose** atau **Standalone Native Stack (PM2 + Nginx)**.

---

## 1. Kebutuhan Spesifikasi Server (Sizing 5–10 Tahun)

| Komponen | Spesifikasi Minimum (1–3 Tahun) | Spesifikasi Rekomendasi (4–10 Tahun) |
| :--- | :--- | :--- |
| **CPU** | 2–4 Core vCPU | 4–8 Core vCPU High Frequency |
| **RAM** | 4 GB – 8 GB | 16 GB – 32 GB DDR4/DDR5 |
| **Storage** | 50 GB NVMe SSD | 250 GB – 500 GB NVMe SSD RAID-1 |
| **OS** | Ubuntu 22.04 / 24.04 LTS | Ubuntu 24.04 LTS Server |
| **Backup** | Daily Snapshot + Offsite Storage | Automated Daily Cron to S3 / Remote Storage |

---

## 2. Metode 1: Deployment Menggunakan Docker Compose (Paling Direkomendasikan) 🌟

Seluruh ekosistem telah dikemas dalam kontainer Docker terisolasi dan siap jalan dalam 1 perintah:

### A. Persiapan Server VPS
1. Login ke server VPS via SSH:
   ```bash
   ssh root@ip-server-anda
   ```
2. Update repository paket dan install Docker & Docker Compose:
   ```bash
   apt-get update && apt-get upgrade -y
   apt-get install -y ca-certificates curl gnupg
   install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   chmod a+r /etc/apt/keyrings/docker.gpg
   echo \
     "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
     tee /etc/apt/sources.list.d/docker.list > /dev/null
   apt-get update
   apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

### B. Upload Kode ke Server
Upload file proyek (hasil `export-clean-cpanel.bat` atau git clone) ke folder `/var/www/erp-bimapratama`.

### C. Konfigurasi `.env`
Di folder `/var/www/erp-bimapratama`:
```bash
cp .env.example .env
nano .env
```
Sesuaikan password database dan JWT Secret.

### D. Menjalankan Docker Compose
```bash
docker compose up -d --build
```

Periksa status container:
```bash
docker compose ps
```
Semua container (`bimapratama-db`, `bimapratama-redis`, `bimapratama-backend`, `bimapratama-frontend`) harus berstatus `healthy` atau `Up`.

---

## 3. Metode 2: Deployment Native di VPS (Node.js 22 + PM2 + MySQL 8 + Nginx)

Jika Anda ingin performa maksimal tanpa overhead virtualisasi Docker:

### A. Install Node.js 22 LTS, PM2 & MySQL Server
```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# MySQL Server 8
sudo apt-get install -y mysql-server
sudo mysql_secure_installation
```

### B. Setup Database MySQL
Masuk ke prompt MySQL:
```bash
sudo mysql -u root -p
```
Jalankan query:
```sql
CREATE DATABASE bimapratama_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bima_user'@'localhost' IDENTIFIED BY 'PasswordKuatAnda2026!';
GRANT ALL PRIVILEGES ON bimapratama_v2.* TO 'bima_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### C. Build & Start Backend NestJS dengan PM2
```bash
cd /var/www/erp-bimapratama/backend
npm install
npx prisma generate
npx prisma db push
npm run build

# Jalankan dengan PM2 Cluster Mode
pm2 start dist/main.js --name "bimapratama-api" -i max
pm2 save
pm2 startup
```

### D. Build Frontend React
```bash
cd /var/www/erp-bimapratama/frontend
npm install
npm run build
```
Hasil build berada di `/var/www/erp-bimapratama/frontend/dist`.

### E. Konfigurasi Nginx & SSL (Certbot)
Buat konfigurasi site Nginx:
```bash
sudo nano /etc/nginx/sites-available/erp-bimapratama
```
Isi dengan konfigurasi:
```nginx
server {
    listen 80;
    server_name erp.domainanda.com;

    root /var/www/erp-bimapratama/frontend/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # React Router fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy ke NestJS Backend (Port 4000)
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi dan pasang SSL gratis:
```bash
sudo ln -s /etc/nginx/sites-available/erp-bimapratama /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install SSL Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d erp.domainanda.com
```

---

## 4. Strategi Backup Otomatis Database MySQL

Buat script backup harian di server:
```bash
sudo mkdir -p /var/backups/erp-bimapratama
sudo nano /usr/local/bin/backup-erp.sh
```

Isi script:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/erp-bimapratama"
DATE=$(date +"%Y%m%d_%H%M%S")
mysqldump -u bima_user -p'PasswordKuatAnda2026!' bimapratama_v2 | gzip > "$BACKUP_DIR/erp_backup_$DATE.sql.gz"

# Hapus backup yang lebih lama dari 30 hari
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -exec rm {} +
```
Beri izin eksekusi dan pasang cron job:
```bash
sudo chmod +x /usr/local/bin/backup-erp.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-erp.sh") | crontab -
```
*(Script akan berjalan otomatis setiap hari pukul 02:00 dini hari).*
