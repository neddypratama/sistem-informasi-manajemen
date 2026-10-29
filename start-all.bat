@echo off
title Bima Pratama ERP 2.0 - Starter
color 0A

echo ===================================================
echo     MEMULAI BIMA PRATAMA ERP 2.0 (MODERN STACK)
echo ===================================================
echo.

REM 1. Pastikan folder berada di direktori project
cd /d "%~dp0"

REM 2. Buka Terminal untuk Backend API (Port 4000)
echo [1/3] Menjalankan Backend API (NestJS) di port 4000...
start "Bima Pratama ERP - Backend API" cmd /k "cd /d %~dp0backend && npm run start:dev"

REM 3. Tunggu 3 detik agar backend mulai inisialisasi
timeout /t 3 /nobreak >nul

REM 4. Buka Terminal untuk Frontend SPA (Port 3000)
echo [2/3] Menjalankan Frontend Web (React 19) di port 3000...
start "Bima Pratama ERP - Frontend SPA" cmd /k "cd /d %~dp0frontend && npm run dev"

REM 5. Buka Browser otomatis ke http://localhost:3000
echo [3/3] Membuka browser ke http://localhost:3000 ...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ===================================================
echo     SISTEM BERHASIL DIJALANKAN!
echo     Frontend: http://localhost:3000
echo     Backend:  http://localhost:4000/api/v1
echo.
echo     Login default:
echo     Username: admin
echo     Password: password
echo ===================================================
echo Tekan tombol apa saja untuk menutup jendela peluncur ini...
pause >nul
