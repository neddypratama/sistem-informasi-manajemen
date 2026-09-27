<?php

use App\Http\Controllers\Api\AkunController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarangController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HutangController;
use App\Http\Controllers\Api\JenisBarangController;
use App\Http\Controllers\Api\JurnalController;
use App\Http\Controllers\Api\KasController;
use App\Http\Controllers\Api\KategoriController;
use App\Http\Controllers\Api\LaporanController;
use App\Http\Controllers\Api\LogAktivitasController;
use App\Http\Controllers\Api\PelunasanController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\PiutangController;
use App\Http\Controllers\Api\ReturController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\StokController;
use App\Http\Controllers\Api\StokLaporanController;
use App\Http\Controllers\Api\StokOpnameController;
use App\Http\Controllers\Api\StokRiwayatController;
use App\Http\Controllers\Api\TagihanController;
use App\Http\Controllers\Api\TransaksiController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
 * Nama permission mengikuti sub menu sidebar:
 * - menu.master.*            (Jenis Barang, Barang, Client)
 * - menu.pembelian.*         (Telur, Pakan, Obat, Tray)
 * - menu.penjualan.*         (Telur, Pakan, Obat, Tray)
 * - menu.retur.*             (Penjualan, Pembelian)
 * - menu.transaksi.riwayat   (Riwayat Transaksi)
 * - menu.stok.*              (Barang, Fifo, Opname, Riwayat, Laporan)
 * - menu.akuntansi.*         (Saldo Per Client, Hutang, Piutang, Jurnal, Kas)
 * - menu.jurnal.*            (Kas, Beban, Pendapatan, Akun, Kategori Akun)
 * - menu.laporan.*           (Buku Besar, Neraca, Laba Rugi)
 * - menu.akses.*             (Role Permission, User)
 */
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/akun/kas-bank-options', [AkunController::class, 'kasBankOptions']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/stok', [DashboardController::class, 'stokPerJenis']);

    // Akses
    Route::middleware('permission:menu.akses.role')->group(function () {
        Route::get('/role/options', [RoleController::class, 'options']);
        Route::get('/role/permissions', [RoleController::class, 'permissions']);
        Route::apiResource('role', RoleController::class)->except('show');
    });

    Route::middleware('permission:menu.akses.role')->group(function () {
        Route::apiResource('permission', PermissionController::class)->except('show');
    });

    Route::middleware('permission:menu.akses.user')->group(function () {
        Route::apiResource('user', UserController::class)->except('show');
    });

    Route::middleware('permission:menu.akses.log')->group(function () {
        Route::get('/log-aktivitas', [LogAktivitasController::class, 'index']);
        Route::get('/log-aktivitas/users', [LogAktivitasController::class, 'userOptions']);
    });

    // Master Data
    Route::middleware('permission:menu.master.jenis_barang')->group(function () {
        Route::get('/jenis-barang/options', [JenisBarangController::class, 'options']);
        Route::apiResource('jenis-barang', JenisBarangController::class)->except('show');
    });

    Route::middleware('permission:menu.master.barang')->group(function () {
        Route::get('/barang/options', [BarangController::class, 'options']);
        Route::apiResource('barang', BarangController::class)->except('show');
    });

    Route::middleware('permission:menu.master.client')->group(function () {
        Route::get('/client/options', [ClientController::class, 'options']);
        Route::apiResource('client', ClientController::class)->except('show');
    });

    // Transaksi: daftar + data form memerlukan salah satu permission transaksi.
    $transaksiView = implode(',', [
        'menu.pembelian.telur', 'menu.pembelian.pakan', 'menu.pembelian.obat', 'menu.pembelian.tray',
        'menu.penjualan.telur', 'menu.penjualan.pakan', 'menu.penjualan.obat', 'menu.penjualan.tray',
        'menu.transaksi.riwayat',
    ]);

    Route::get('/transaksi', [TransaksiController::class, 'index'])
        ->middleware("permission.any:{$transaksiView}");
    Route::get('/transaksi/export-excel', [TransaksiController::class, 'export'])
        ->middleware("permission.any:{$transaksiView}");
    Route::get('/transaksi/create-data', [TransaksiController::class, 'createData'])
        ->middleware("permission.any:{$transaksiView}");
    Route::get('/transaksi/{transaksi}', [TransaksiController::class, 'show'])
        ->whereNumber('transaksi')
        ->middleware("permission.any:{$transaksiView}");
    Route::get('/transaksi/{transaksi}/edit-data', [TransaksiController::class, 'editData'])
        ->whereNumber('transaksi')
        ->middleware("permission.any:{$transaksiView}");

    // Create/update/delete transaksi tetap mencerminkan kategori barang yang dikelola.
    $transaksiManage = implode(',', [
        'menu.pembelian.telur', 'menu.pembelian.pakan', 'menu.pembelian.obat', 'menu.pembelian.tray',
        'menu.penjualan.telur', 'menu.penjualan.pakan', 'menu.penjualan.obat', 'menu.penjualan.tray',
        'menu.retur.penjualan', 'menu.retur.pembelian',
    ]);

    Route::post('/transaksi', [TransaksiController::class, 'store'])
        ->middleware("permission.any:{$transaksiManage}");
    Route::put('/transaksi/{transaksi}', [TransaksiController::class, 'update'])
        ->whereNumber('transaksi')
        ->middleware("permission.any:{$transaksiManage}");
    Route::delete('/transaksi/{transaksi}', [TransaksiController::class, 'destroy'])
        ->whereNumber('transaksi')
        ->middleware("permission.any:{$transaksiManage}");

    // Retur
    $returAny = 'menu.retur.penjualan,menu.retur.pembelian';

    Route::get('/retur/create-data', [ReturController::class, 'createData'])
        ->middleware("permission.any:{$returAny}");
    Route::get('/retur', [ReturController::class, 'index'])
        ->middleware("permission.any:{$returAny}");
    Route::get('/retur/sumber/{sumber}/items', [ReturController::class, 'sumberJson'])
        ->whereNumber('sumber')
        ->middleware("permission.any:{$returAny}");
    Route::get('/retur/{transaksi}', [ReturController::class, 'show'])
        ->whereNumber('transaksi')
        ->middleware("permission.any:{$returAny}");
    Route::post('/retur', [ReturController::class, 'store'])
        ->middleware("permission.any:{$returAny}");
    Route::delete('/retur/{transaksi}', [ReturController::class, 'destroy'])
        ->whereNumber('transaksi')
        ->middleware("permission.any:{$returAny}");

    // Stok
    Route::middleware('permission:menu.stok.barang')->group(function () {
        Route::get('/stok', [StokController::class, 'index']);
        Route::get('/stok/export-excel', [StokController::class, 'export']);
    });

    Route::middleware('permission:menu.stok.fifo')->group(function () {
        Route::get('/stok/fifo', [StokController::class, 'fifo']);
    });

    Route::middleware('permission:menu.stok.riwayat')->group(function () {
        Route::get('/stok/riwayat/{barang}/export-excel', [StokRiwayatController::class, 'export'])->whereNumber('barang');
        Route::get('/stok/riwayat', [StokRiwayatController::class, 'index']);
        Route::get('/stok/riwayat/{barang}', [StokRiwayatController::class, 'show'])->whereNumber('barang');
    });

    Route::middleware('permission:menu.stok.laporan')->group(function () {
        Route::get('/stok/laporan/export-excel', [StokLaporanController::class, 'export']);
        Route::get('/stok/laporan', [StokLaporanController::class, 'index']);
    });

    Route::middleware('permission:menu.stok.opname')->group(function () {
        Route::get('/stok-opname/create-data', [StokOpnameController::class, 'createData']);
        Route::get('/stok-opname/export-excel', [StokOpnameController::class, 'export']);
        Route::get('/stok-opname/{opname}', [StokOpnameController::class, 'show'])->whereNumber('opname');
        Route::get('/stok-opname', [StokOpnameController::class, 'index']);
        Route::post('/stok-opname', [StokOpnameController::class, 'store']);
        Route::delete('/stok-opname/{opname}', [StokOpnameController::class, 'destroy']);
    });

    // Akuntansi
    Route::middleware('permission:menu.akuntansi.saldo_client')->group(function () {
        Route::get('/tagihan', [TagihanController::class, 'index']);
        Route::get('/tagihan/export-excel', [TagihanController::class, 'export']);
        Route::get('/tagihan/{client}', [TagihanController::class, 'show']);
    });

    Route::middleware('permission:menu.akuntansi.hutang')->group(function () {
        Route::get('/hutang', [HutangController::class, 'index']);
        Route::get('/hutang/export-excel', [HutangController::class, 'export']);
        Route::get('/hutang/create-data', [HutangController::class, 'createData']);
        Route::post('/hutang/tambah', [HutangController::class, 'storeTambah']);
        Route::post('/hutang/bayar', [HutangController::class, 'storeBayar']);
        Route::get('/pelunasan/hutang', [PelunasanController::class, 'bayarHutang']);
        Route::post('/pelunasan/hutang', [PelunasanController::class, 'storeHutang']);
        Route::delete('/pelunasan/hutang/{pembayaran}', [PelunasanController::class, 'destroyHutang']);
    });

    Route::middleware('permission:menu.akuntansi.piutang')->group(function () {
        Route::get('/piutang', [PiutangController::class, 'index']);
        Route::get('/piutang/export-excel', [PiutangController::class, 'export']);
        Route::get('/piutang/create-data', [PiutangController::class, 'createData']);
        Route::post('/piutang/tambah', [PiutangController::class, 'storeTambah']);
        Route::post('/piutang/bayar', [PiutangController::class, 'storeBayar']);
        Route::get('/pelunasan/piutang', [PelunasanController::class, 'terimaPiutang']);
        Route::post('/pelunasan/piutang', [PelunasanController::class, 'storePiutang']);
        Route::delete('/pelunasan/piutang/{pembayaran}', [PelunasanController::class, 'destroyPiutang']);
    });

    Route::middleware('permission:menu.akuntansi.jurnal')->group(function () {
        Route::get('/jurnal', [JurnalController::class, 'index']);
        Route::get('/jurnal/export-excel', [JurnalController::class, 'export']);

        // Dibatasi angka agar tidak menelan `/jurnal/create-data`.
        Route::get('/jurnal/{jurnal}', [JurnalController::class, 'show'])->whereNumber('jurnal');
        Route::get('/jurnal/{jurnal}/edit-data', [JurnalController::class, 'editData']);

        Route::post('/jurnal', [JurnalController::class, 'store']);
        Route::put('/jurnal/{jurnal}', [JurnalController::class, 'update']);
        Route::delete('/jurnal/{jurnal}', [JurnalController::class, 'destroy']);
    });

    // Entri jurnal jenis (kas, beban, pendapatan) memakai permission sub menu masing-masing.
    $jurnalJenishAny = 'menu.akuntansi.jurnal,menu.jurnal.kas,menu.jurnal.beban,menu.jurnal.pendapatan,menu.akuntansi.hutang,menu.akuntansi.piutang';

    Route::get('/jurnal/create-data', [JurnalController::class, 'createData'])
        ->middleware("permission.any:{$jurnalJenishAny}");
    Route::post('/jurnal/jenis', [JurnalController::class, 'storeJenis'])
        ->middleware("permission.any:{$jurnalJenishAny}");

    Route::middleware('permission:menu.akuntansi.kas')->group(function () {
        Route::get('/kas', [KasController::class, 'index']);
        Route::get('/kas/export-excel', [KasController::class, 'export']);
    });

    // Akun & Kategori Akun (bagian Entri Jurnal)
    Route::middleware('permission:menu.jurnal.akun')->group(function () {
        Route::get('/akun/kategori-options', [AkunController::class, 'kategoriOptions']);
        Route::apiResource('akun', AkunController::class)->except('show');
    });

    Route::middleware('permission:menu.jurnal.kategori')->group(function () {
        Route::apiResource('kategori', KategoriController::class)->except('show');
    });

    // Laporan
    Route::middleware('permission:menu.laporan.buku_besar')->group(function () {
        Route::get('/laporan/buku-besar', [LaporanController::class, 'bukuBesar']);
        Route::get('/laporan/buku-besar/export-excel', [LaporanController::class, 'exportBukuBesar']);
    });

    Route::middleware('permission:menu.laporan.neraca')->group(function () {
        Route::get('/laporan/neraca', [LaporanController::class, 'neraca']);
        Route::get('/laporan/neraca/export-excel', [LaporanController::class, 'exportNeraca']);
    });

    Route::middleware('permission:menu.laporan.laba_rugi')->group(function () {
        Route::get('/laporan/laba-rugi', [LaporanController::class, 'labaRugi']);
        Route::get('/laporan/laba-rugi/export-excel', [LaporanController::class, 'exportLabaRugi']);
    });

    Route::middleware('permission:menu.laporan.laba_rugi_curah')->group(function () {
        Route::get('/laporan/laba-rugi-curah', [LaporanController::class, 'labaRugiPakanCurah']);
        Route::get('/laporan/laba-rugi-curah/export-excel', [LaporanController::class, 'exportLabaRugiPakanCurah']);
    });
});
