@echo off
title Bima Pratama ERP 2.0 - Stopper
color 0C

echo ===================================================
echo     MENGHENTIKAN BIMA PRATAMA ERP 2.0
echo ===================================================
echo.

echo Menghentikan proses yang berjalan di port 4000 dan 3000...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Semua proses backend (port 4000) dan frontend (port 3000) telah dihentikan.
echo Tekan tombol apa saja untuk keluar...
pause >nul
