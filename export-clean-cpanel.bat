@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo   BIMA PRATAMA ERP 2.0 - EXPORT CLEAN ARCHIVE FOR CPANEL / SERVER
echo ================================================================
echo.
echo Sedang menyiapkan arsip bersih (mengecualikan node_modules, dist, .git, .env)...
echo.

set "SCRIPT_DIR=%~dp0"
set "ZIP_NAME=erp-bimapratama-cpanel.zip"
set "ZIP_PATH=%SCRIPT_DIR%%ZIP_NAME%"

REM Hapus cache compile backend jika ada
if exist "%SCRIPT_DIR%backend\tsconfig.build.tsbuildinfo" (
    del /f /q "%SCRIPT_DIR%backend\tsconfig.build.tsbuildinfo" >nul 2>&1
)

REM Jalankan packaging via PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$baseDir = '%SCRIPT_DIR%'.TrimEnd('\');" ^
    "$tempFolder = Join-Path $env:TEMP ('erp_export_' + [System.Guid]::NewGuid().ToString('N'));" ^
    "$zipFile = '%ZIP_PATH%';" ^
    "if (Test-Path $zipFile) { Remove-Item $zipFile -Force };" ^
    "New-Item -ItemType Directory -Path $tempFolder | Out-Null;" ^
    "robocopy $baseDir $tempFolder /E /XD 'node_modules' 'dist' '.git' '.vscode' '.idea' /XF '*.tsbuildinfo' '.env' '*.log' '%ZIP_NAME%' | Out-Null;" ^
    "Add-Type -AssemblyName System.IO.Compression.FileSystem;" ^
    "[System.IO.Compression.ZipFile]::CreateFromDirectory($tempFolder, $zipFile, [System.IO.Compression.CompressionLevel]::Optimal, $false);" ^
    "Remove-Item $tempFolder -Recurse -Force;" ^
    "if (Test-Path $zipFile) {" ^
    "    $sizeMB = [math]::Round((Get-Item $zipFile).Length / 1MB, 2);" ^
    "    $sizeKB = [math]::Round((Get-Item $zipFile).Length / 1KB, 0);" ^
    "    Write-Host '';" ^
    "    Write-Host '================================================================' -ForegroundColor Green;" ^
    "    Write-Host '  BERHASIL! Arsip siap upload ke cPanel telah dibuat:' -ForegroundColor Green;" ^
    "    Write-Host '  File   : ' $zipFile -ForegroundColor Cyan;" ^
    "    Write-Host '  Ukuran : ' $sizeMB 'MB (' $sizeKB ' KB)' -ForegroundColor Yellow;" ^
    "    Write-Host '================================================================' -ForegroundColor Green;" ^
    "    Write-Host '';" ^
    "    Write-Host 'Panduan langkah upload ke cPanel:' -ForegroundColor White;" ^
    "    Write-Host '  1. Buka TUTORIAL_DEPLOY_CPANEL.md' -ForegroundColor White;" ^
    "    Write-Host '  2. Upload file zip ini ke File Manager cPanel Anda.' -ForegroundColor White;" ^
    "    Write-Host '';" ^
    "} else {" ^
    "    Write-Host 'Gagal membuat file zip.' -ForegroundColor Red;" ^
    "}"

echo.
pause
