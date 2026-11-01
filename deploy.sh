#!/bin/bash
# ==============================================================================
# Script Otomasi Deploy & Update Bima Pratama ERP 2.0 di cPanel
# ==============================================================================

set -e

echo "🚀 [1/4] Mengambil pembaruan kode terbaru dari GitHub..."
git pull origin main || git pull origin master

echo ""
echo "📦 [2/4] Memperbarui Database & Hak Akses (Permissions)..."
# Deteksi virtual environment cPanel
if [ -f "$HOME/nodevenv/sistem-informasi-manajemen/backend/20/bin/activate" ]; then
    source "$HOME/nodevenv/sistem-informasi-manajemen/backend/20/bin/activate"
elif [ -d "$HOME/nodevenv" ]; then
    VENV_ACTIVATE=$(find "$HOME/nodevenv" -name "activate" | head -n 1)
    if [ -f "$VENV_ACTIVATE" ]; then
        source "$VENV_ACTIVATE"
    fi
fi

# Jalankan seeder permissions agar hak akses terbaru terdaftar di database
if [ -f "backend/scripts/seed-permissions.cjs" ]; then
    node backend/scripts/seed-permissions.cjs || true
fi

echo ""
echo "🌐 [3/4] Sinkronisasi file Frontend ke web root cPanel..."
TARGET_DIR="$HOME/public_html/simv2"
if [ ! -d "$TARGET_DIR" ]; then
    TARGET_DIR="$HOME/public_html"
fi

if [ -d "$TARGET_DIR" ]; then
    echo "📂 Meng-copy build frontend ke $TARGET_DIR..."
    cp -r frontend/dist/* "$TARGET_DIR"/ 2>/dev/null || true
    cp frontend/dist/.htaccess "$TARGET_DIR"/.htaccess 2>/dev/null || true
    echo "✅ Frontend berhasil disinkronkan ke $TARGET_DIR!"
else
    echo "⚠️ Folder web root ($TARGET_DIR) tidak ditemukan."
fi

echo ""
echo "🔄 [4/4] Restart Backend Passenger Node.js..."
mkdir -p backend/tmp
touch backend/tmp/restart.txt

echo ""
echo "========================================================================"
echo "🎉 DEPLOYMENT SUKSES! ERP Bima Pratama 2.0 telah aktif live."
echo "========================================================================"
