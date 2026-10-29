@echo off

echo ================================================================
echo   BIMA PRATAMA ERP 2.0 - EXPORT DATABASE V2 UNTUK CPANEL
echo ================================================================
echo.
echo Sedang mengekspor database 'bimapratama_v2' dari Laragon lokal...
echo.

set "SCRIPT_DIR=%~dp0"
set "SQL_FILE=%SCRIPT_DIR%bimapratama_v2_ready.sql"
set "ZIP_FILE=%SCRIPT_DIR%bimapratama_v2_cpanel.sql.zip"

if exist "%SQL_FILE%" del /f /q "%SQL_FILE%"
if exist "%ZIP_FILE%" del /f /q "%ZIP_FILE%"

mysqldump -u root --default-character-set=utf8mb4 bimapratama_v2 > "%SQL_FILE%" 2>nul

if not exist "%SQL_FILE%" (
    echo [ERROR] Gagal mengekspor database. Pastikan Laragon MySQL sedang aktif!
    echo.
    pause
    exit /b 1
)

echo Ekspor SQL selesai. Sedang mengompresi ke format ZIP...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$sql = '%SQL_FILE%';" ^
    "$zip = '%ZIP_FILE%';" ^
    "Compress-Archive -Path $sql -DestinationPath $zip -CompressionLevel Optimal -Force;" ^
    "Remove-Item $sql -Force;" ^
    "if (Test-Path $zip) {" ^
    "    $sizeMB = [math]::Round((Get-Item $zip).Length / 1MB, 2);" ^
    "    Write-Host '';" ^
    "    Write-Host '================================================================' -ForegroundColor Green;" ^
    "    Write-Host '  BERHASIL! File database siap import telah dibuat:' -ForegroundColor Green;" ^
    "    Write-Host '  File   : bimapratama_v2_cpanel.sql.zip' -ForegroundColor Cyan;" ^
    "    Write-Host '  Ukuran : ' $sizeMB 'MB' -ForegroundColor Yellow;" ^
    "    Write-Host '================================================================' -ForegroundColor Green;" ^
    "    Write-Host '';" ^
    "    Write-Host 'Langkah import ke cPanel:' -ForegroundColor White;" ^
    "    Write-Host '  1. Buka phpMyAdmin di cPanel Anda.' -ForegroundColor White;" ^
    "    Write-Host '  2. Klik database bimaprat_v2.' -ForegroundColor White;" ^
    "    Write-Host '  3. Centang semua tabel lama, lalu pilih Drop (kosongkan tabel lama).' -ForegroundColor White;" ^
    "    Write-Host '  4. Klik tab Import, pilih file bimapratama_v2_cpanel.sql.zip, lalu Import.' -ForegroundColor White;" ^
    "    Write-Host '';" ^
    "}"

pause
