#!/bin/bash
# ==============================================================================
# Script Otomasi Deploy & Update Bima Pratama ERP 2.0 di cPanel via Git
# ==============================================================================
# Cara Penggunaan di Terminal cPanel:
#   chmod +x deploy.sh
#   ./deploy.sh
# ==============================================================================

set -e # Berhenti jika ada error

echo "🚀 [1/5] Mengambil pembaruan kode terbaru dari GitHub..."
git pull origin master || git pull origin main

echo ""
echo "📦 [2/5] Memproses Backend API (NestJS)..."
cd backend

# Deteksi virtual environment cPanel jika ada
if [ -d "$HOME/nodevenv/erp-bimapratama/backend" ]; then
    NODE_VENV_BIN=$(find "$HOME/nodevenv/erp-bimapratama/backend" -name "activate" | head -n 1)
    if [ -f "$NODE_VENV_BIN" ]; then
        echo "🔧 Mengaktifkan cPanel Node Virtualenv: $NODE_VENV_BIN"
        source "$NODE_VENV_BIN"
    fi
fi

npm install --production=false
npx prisma generate
npm run build

# Restart Phusion Passenger (cPanel Node.js App)
mkdir -p tmp
touch tmp/restart.txt
echo "✅ Backend berhasil di-build dan di-restart!"

echo ""
echo "🎨 [3/5] Memproses Frontend (React SPA)..."
cd ../frontend

npm install
npm run build

echo ""
echo "🌐 [4/5] Sinkronisasi file Frontend ke web root cPanel..."
# Ganti TARGET_DIR jika Anda menggunakan subdomain (misal: $HOME/public_html/erp)
TARGET_DIR="$HOME/public_html"

if [ -d "$TARGET_DIR" ]; then
    echo "📂 Meng-copy hasil build ke $TARGET_DIR..."
    cp -r dist/* "$TARGET_DIR"/
    cp dist/.htaccess "$TARGET_DIR"/.htaccess 2>/dev/null || true
    echo "✅ Frontend berhasil disinkronkan ke $TARGET_DIR!"
else
    echo "⚠️ Folder $TARGET_DIR tidak ditemukan. Pastikan path document root sesuai."
fi

cd ..

echo ""
echo "========================================================================"
echo "🎉 DEPLOYMENT SUKSES! Bima Pratama ERP 2.0 telah diperbarui."
echo "========================================================================"
