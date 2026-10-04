<?php

namespace App\Console\Commands;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use App\Models\DetailTransaksi;
use App\Models\JenisBarang;
use App\Models\Jurnal;
use App\Models\Transaksi;
use App\Services\FifoStockService;
use App\Services\JurnalService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ImportLegacyApiCommand extends Command
{
    /**
     * Nama dan deskripsi artisan command.
     */
    protected $signature = 'import:legacy-api 
                            {--url=https://sim.bimapratama.com : Base URL API SIM lama}
                            {--key=api_bimapratama : API Key atau Bearer Token}
                            {--only= : Impor modul tertentu saja, dipisahkan koma (contoh: jenis-barang,barang,client,pembelian,penjualan,retur,hutang,piutang,beban,pendapatan-lainnya)}
                            {--truncate : Kosongkan tabel data sebelum impor}';

    protected $description = 'Mengimpor data dari API SIM Lama (https://sim.bimapratama.com) ke SIM Baru secara langsung.';

    public function __construct(
        private JurnalService $jurnalService,
        private FifoStockService $fifoStockService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $baseUrl = rtrim($this->option('url'), '/');
        $only = $this->option('only') ? array_map('trim', explode(',', strtolower($this->option('only')))) : [];

        $this->info("Memulai impor data dari API: {$baseUrl}");

        if ($this->option('truncate')) {
            if ($this->confirm('Apakah Anda yakin ingin mengosongkan tabel data transaksi, jurnal, barang, dan client?', false)) {
                $this->truncateTables();
            }
        }

        // 1. Jenis Barang
        if ($this->shouldRun('jenis-barang', $only)) {
            $this->importJenisBarang($baseUrl);
        }

        // 2. Master Barang
        if ($this->shouldRun('barang', $only)) {
            $this->importBarang($baseUrl);
        }

        // 3. Client
        if ($this->shouldRun('client', $only)) {
            $this->importClient($baseUrl);
        }

        // 4. Hutang & Piutang
        if ($this->shouldRun('hutang', $only)) {
            $this->importHutang($baseUrl);
        }

        if ($this->shouldRun('piutang', $only)) {
            $this->importPiutang($baseUrl);
        }

        // 5. Pembelian & Penjualan
        if ($this->shouldRun('pembelian', $only)) {
            $this->importPembelian($baseUrl);
        }

        if ($this->shouldRun('penjualan', $only)) {
            $this->importPenjualan($baseUrl);
        }

        // 6. Retur
        if ($this->shouldRun('retur', $only)) {
            $this->importRetur($baseUrl);
        }

        // 7. Beban & Pendapatan Lainnya
        if ($this->shouldRun('beban', $only)) {
            $this->importBeban($baseUrl);
        }

        if ($this->shouldRun('pendapatan-lainnya', $only)) {
            $this->importPendapatanLainnya($baseUrl);
        }

        $this->newLine();
        $this->info('✓ Seluruh proses impor data dari API selesai!');

        return self::SUCCESS;
    }

    protected function shouldRun(string $modul, array $only): bool
    {
        if (empty($only)) {
            return true;
        }

        return in_array($modul, $only, true);
    }

    protected function getStringValue(mixed $value): string
    {
        if (is_string($value) || is_numeric($value)) {
            return trim((string) $value);
        }

        if (is_array($value)) {
            if (isset($value['nama']) && is_string($value['nama'])) {
                return trim($value['nama']);
            }
            if (isset($value['name']) && is_string($value['name'])) {
                return trim($value['name']);
            }
            if (isset($value['kode_barang']) && is_string($value['kode_barang'])) {
                return trim($value['kode_barang']);
            }
            if (isset($value['kode']) && is_string($value['kode'])) {
                return trim($value['kode']);
            }
        }

        return '';
    }

    protected function fetchApiData(string $baseUrl, string $endpoint): ?array
    {
        $fullUrl = "{$baseUrl}/api/v1/{$endpoint}";
        $apiKey = $this->option('key');

        $allItems = [];
        $page = 1;
        $lastPage = 1;

        do {
            try {
                $request = Http::timeout(60)->retry(3, 1000);

                if ($apiKey) {
                    $request = $request->withHeaders([
                        'X-API-KEY' => $apiKey,
                        'x-api-key' => $apiKey,
                        'API-KEY' => $apiKey,
                    ])->withToken($apiKey);
                }

                $response = $request->get($fullUrl, [
                    'api_key' => $apiKey,
                    'key' => $apiKey,
                    'page' => $page,
                ]);

                if (! $response->successful()) {
                    $this->error("Gagal mengambil data dari {$fullUrl}?page={$page} (HTTP status: {$response->status()})");

                    break;
                }

                $json = $response->json();
                $pageItems = [];

                if (isset($json['data']) && is_array($json['data'])) {
                    $pageItems = $json['data'];
                } elseif (is_array($json)) {
                    $pageItems = $json;
                }

                if (empty($pageItems)) {
                    break;
                }

                foreach ($pageItems as $item) {
                    $allItems[] = $item;
                }

                // Cek pagination
                if (isset($json['pagination']['last_page'])) {
                    $lastPage = (int) $json['pagination']['last_page'];
                } elseif (isset($json['meta']['last_page'])) {
                    $lastPage = (int) $json['meta']['last_page'];
                } elseif (isset($json['last_page'])) {
                    $lastPage = (int) $json['last_page'];
                } else {
                    // Jika tidak ada info pagination (seperti array biasa), keluar dari loop
                    break;
                }

                $page++;
            } catch (\Throwable $e) {
                $this->error("Error HTTP Request ke {$fullUrl}?page={$page}: {$e->getMessage()}");

                break;
            }
        } while ($page <= $lastPage);

        return $allItems;
    }

    protected function importJenisBarang(string $baseUrl): void
    {
        $this->info('--- Mengimpor Jenis Barang ---');
        $items = $this->fetchApiData($baseUrl, 'jenis-barang');

        if (empty($items)) {
            $this->warn('Data Jenis Barang kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;

        foreach ($items as $item) {
            $nama = $this->getStringValue($item['nama'] ?? $item['nama_jenis'] ?? $item['jenis'] ?? $item['name'] ?? '');
            if ($nama === '') {
                $bar->advance();

                continue;
            }

            $kelompok = strtolower(trim($item['kelompok'] ?? 'telur'));
            if (! in_array($kelompok, ['telur', 'pakan', 'obat', 'tray'], true)) {
                $kelompok = 'telur';
            }

            try {
                JenisBarang::updateOrCreate(
                    ['nama' => $nama],
                    [
                        'kelompok' => $kelompok,
                        'keterangan' => is_string($item['keterangan'] ?? null) ? $item['keterangan'] : null,
                        'status' => 'aktif',
                    ]
                );
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Jenis Barang: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function importBarang(string $baseUrl): void
    {
        $this->info('--- Mengimpor Master Data Barang ---');
        $items = $this->fetchApiData($baseUrl, 'barang');

        if (empty($items)) {
            $this->warn('Data Barang kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;

        foreach ($items as $item) {
            $kode = $this->getStringValue($item['kode_barang'] ?? $item['kode'] ?? $item['id'] ?? '');
            $nama = $this->getStringValue($item['nama_barang'] ?? $item['nama'] ?? $item['name'] ?? '');
            $jenisNama = $this->getStringValue($item['jenis_barang'] ?? $item['jenis_barang_nama'] ?? $item['jenis'] ?? '');

            if ($kode === '' || $nama === '') {
                $bar->advance();

                continue;
            }

            $jenisBarang = null;
            if ($jenisNama !== '') {
                $jenisBarang = JenisBarang::where('nama', $jenisNama)->first();
            }

            if (! $jenisBarang) {
                $jenisBarang = JenisBarang::first();
            }

            if (! $jenisBarang) {
                $gagal++;
                $bar->advance();

                continue;
            }

            try {
                Barang::updateOrCreate(
                    ['kode_barang' => $kode],
                    [
                        'nama_barang' => $nama,
                        'jenis_barang_id' => $jenisBarang->id,
                        'satuan' => $item['satuan'] ?? 'Kg',
                        'stok' => (float) ($item['stok'] ?? 0),
                        'status' => 'aktif',
                    ]
                );
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Barang: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function importClient(string $baseUrl): void
    {
        $this->info('--- Mengimpor Master Data Client ---');
        $items = $this->fetchApiData($baseUrl, 'client');

        if (empty($items)) {
            $this->warn('Data Client kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;
        $tipeValid = ['Peternak', 'Supplier', 'Pedagang', 'Karyawan', 'Truk'];

        foreach ($items as $item) {
            $nama = $this->getStringValue($item['nama'] ?? $item['nama_client'] ?? $item['name'] ?? '');
            if ($nama === '') {
                $bar->advance();

                continue;
            }

            $tipe = ucfirst(strtolower($this->getStringValue($item['tipe'] ?? $item['type'] ?? 'Peternak')));
            if (! in_array($tipe, $tipeValid, true)) {
                $tipe = 'Peternak';
            }

            try {
                Client::updateOrCreate(
                    ['nama' => $nama],
                    [
                        'tipe' => $tipe,
                        'no_telepon' => $item['no_telepon'] ?? $item['telepon'] ?? null,
                        'alamat' => $item['alamat'] ?? null,
                        'keterangan' => $item['keterangan'] ?? null,
                        'status' => 'aktif',
                    ]
                );
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Client: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function importHutang(string $baseUrl): void
    {
        $this->info('--- Mengimpor Data Hutang ---');
        $items = $this->fetchApiData($baseUrl, 'hutang');

        if (empty($items)) {
            $this->warn('Data Hutang kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;

        foreach ($items as $item) {
            $clientNama = $this->getStringValue($item['client'] ?? $item['client_nama'] ?? '');
            $total = (float) ($item['total'] ?? $item['nominal'] ?? $item['sisa_hutang'] ?? 0);
            $tanggal = substr($this->getStringValue($item['tanggal'] ?? date('Y-m-d')), 0, 10);
            $noTagihan = $this->getStringValue($item['no_tagihan'] ?? $item['nomor_tagihan'] ?? $item['invoice'] ?? '');

            if ($clientNama === '' || $total <= 0) {
                $bar->advance();

                continue;
            }

            $client = Client::where('nama', $clientNama)->first();
            if (! $client) {
                $gagal++;
                $bar->advance();

                continue;
            }

            $akunKas = Akun::system('kas') ?? Akun::query()->KasBank()->orderBy('kode')->first();

            try {
                DB::transaction(function () use ($tanggal, $client, $total, $item, $akunKas, $noTagihan): void {
                    $this->jurnalService->postTambahHutang(
                        $tanggal,
                        $client->id,
                        $total,
                        $item['keterangan'] ?? 'Impor saldo awal hutang API',
                        1,
                        $akunKas?->id,
                        $noTagihan ?: 'HT-'.str_replace('-', '', $tanggal).'-'.sprintf('%04d', rand(1, 9999)),
                    );
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Hutang: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function importPiutang(string $baseUrl): void
    {
        $this->info('--- Mengimpor Data Piutang ---');
        $items = $this->fetchApiData($baseUrl, 'piutang');

        if (empty($items)) {
            $this->warn('Data Piutang kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;

        foreach ($items as $item) {
            $clientNama = $this->getStringValue($item['client'] ?? $item['client_nama'] ?? '');
            $total = (float) ($item['total'] ?? $item['nominal'] ?? $item['sisa_piutang'] ?? 0);
            $tanggal = substr($this->getStringValue($item['tanggal'] ?? date('Y-m-d')), 0, 10);
            $noTagihan = $this->getStringValue($item['no_tagihan'] ?? $item['nomor_tagihan'] ?? $item['invoice'] ?? '');

            if ($clientNama === '' || $total <= 0) {
                $bar->advance();

                continue;
            }

            $client = Client::where('nama', $clientNama)->first();
            if (! $client) {
                $gagal++;
                $bar->advance();

                continue;
            }

            $akunKas = Akun::system('kas') ?? Akun::query()->KasBank()->orderBy('kode')->first();

            try {
                DB::transaction(function () use ($tanggal, $client, $total, $item, $akunKas, $noTagihan): void {
                    $this->jurnalService->postTambahPiutang(
                        $tanggal,
                        $client->id,
                        $total,
                        $item['keterangan'] ?? 'Impor saldo awal piutang API',
                        1,
                        $akunKas?->id,
                        $noTagihan ?: 'PT-'.str_replace('-', '', $tanggal).'-'.sprintf('%04d', rand(1, 9999)),
                    );
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Piutang: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function importPembelian(string $baseUrl): void
    {
        $this->info('--- Mengimpor Transaksi Pembelian ---');
        $items = $this->fetchApiData($baseUrl, 'pembelian');

        if (empty($items)) {
            $this->warn('Data Pembelian kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;

        foreach ($items as $item) {
            $nomorTrx = $this->getStringValue($item['nomor_transaksi'] ?? $item['invoice'] ?? '');
            $tanggal = substr($this->getStringValue($item['tanggal'] ?? date('Y-m-d')), 0, 10);
            $clientNama = $this->getStringValue($item['client'] ?? $item['client_nama'] ?? '');
            $details = $item['details'] ?? $item['detail_transaksi'] ?? $item['detail'] ?? [];

            if ($nomorTrx === '' || empty($details)) {
                $bar->advance();

                continue;
            }

            $client = Client::where('nama', $clientNama)->first();

            try {
                DB::transaction(function () use ($nomorTrx, $tanggal, $client, $details, $item): void {
                    $transaksi = Transaksi::create([
                        'nomor_transaksi' => $nomorTrx,
                        'tanggal' => $tanggal,
                        'tipe' => 'pembelian',
                        'client_id' => $client?->id,
                        'total' => 0,
                        'metode_pembayaran' => $item['metode_pembayaran'] ?? 'tempo',
                        'keterangan' => $item['keterangan'] ?? 'Impor Pembelian API',
                        'status' => 'selesai',
                        'created_by' => 1,
                    ]);

                    $totalSeluruh = 0;

                    foreach ($details as $d) {
                        $kodeBarang = $this->getStringValue($d['barang'] ?? $d['kode_barang'] ?? $d['barang_id'] ?? '');
                        $barang = Barang::where('kode_barang', $kodeBarang)->orWhere('id', $kodeBarang)->first();

                        if (! $barang) {
                            continue;
                        }

                        $qty = (float) ($d['kuantitas'] ?? $d['qty'] ?? 1);
                        $harga = (float) ($d['harga_satuan'] ?? $d['harga'] ?? 0);
                        $subtotal = $qty * $harga;
                        $totalSeluruh += $subtotal;

                        DetailTransaksi::create([
                            'transaksi_id' => $transaksi->id,
                            'barang_id' => $barang->id,
                            'kuantitas' => $qty,
                            'harga_satuan' => $harga,
                            'subtotal' => $subtotal,
                        ]);

                        // Catat stok batch FIFO
                        $this->fifoStockService->catatPembelian($transaksi, $barang, $qty, $harga, $tanggal);
                    }

                    $transaksi->update(['total' => $totalSeluruh]);

                    // Buat Jurnal
                    $this->jurnalService->postFromTransaksi($transaksi);
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Pembelian: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function importPenjualan(string $baseUrl): void
    {
        $this->info('--- Mengimpor Transaksi Penjualan ---');
        $items = $this->fetchApiData($baseUrl, 'penjualan');

        if (empty($items)) {
            $this->warn('Data Penjualan kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;

        foreach ($items as $item) {
            $nomorTrx = $this->getStringValue($item['nomor_transaksi'] ?? $item['invoice'] ?? '');
            $tanggal = substr($this->getStringValue($item['tanggal'] ?? date('Y-m-d')), 0, 10);
            $clientNama = $this->getStringValue($item['client'] ?? $item['client_nama'] ?? '');
            $details = $item['details'] ?? $item['detail_transaksi'] ?? $item['detail'] ?? [];

            if ($nomorTrx === '' || empty($details)) {
                $bar->advance();

                continue;
            }

            $client = Client::where('nama', $clientNama)->first();

            try {
                DB::transaction(function () use ($nomorTrx, $tanggal, $client, $details, $item): void {
                    $transaksi = Transaksi::create([
                        'nomor_transaksi' => $nomorTrx,
                        'tanggal' => $tanggal,
                        'tipe' => 'penjualan',
                        'client_id' => $client?->id,
                        'total' => 0,
                        'metode_pembayaran' => $item['metode_pembayaran'] ?? 'tempo',
                        'keterangan' => $item['keterangan'] ?? 'Impor Penjualan API',
                        'status' => 'selesai',
                        'created_by' => 1,
                    ]);

                    $totalSeluruh = 0;

                    foreach ($details as $d) {
                        $kodeBarang = $this->getStringValue($d['barang'] ?? $d['kode_barang'] ?? $d['barang_id'] ?? '');
                        $barang = Barang::where('kode_barang', $kodeBarang)->orWhere('id', $kodeBarang)->first();

                        if (! $barang) {
                            continue;
                        }

                        $qty = (float) ($d['kuantitas'] ?? $d['qty'] ?? 1);
                        $harga = (float) ($d['harga_satuan'] ?? $d['harga'] ?? 0);
                        $subtotal = $qty * $harga;
                        $totalSeluruh += $subtotal;

                        DetailTransaksi::create([
                            'transaksi_id' => $transaksi->id,
                            'barang_id' => $barang->id,
                            'kuantitas' => $qty,
                            'harga_satuan' => $harga,
                            'subtotal' => $subtotal,
                        ]);

                        // Kurangi Stok FIFO
                        $this->fifoStockService->kurangiStokPenjualan($transaksi, $barang, $qty, $tanggal);
                    }

                    $transaksi->update(['total' => $totalSeluruh]);

                    // Buat Jurnal
                    $this->jurnalService->postFromTransaksi($transaksi);
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Penjualan: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function importRetur(string $baseUrl): void
    {
        $this->info('--- Mengimpor Transaksi Retur ---');
        $items = $this->fetchApiData($baseUrl, 'retur');

        if (empty($items)) {
            $this->warn('Data Retur kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;

        foreach ($items as $item) {
            $tipeRetur = $this->getStringValue($item['tipe_retur'] ?? $item['tipe'] ?? 'penjualan_retur');
            $nomorRetur = $this->getStringValue($item['nomor_retur'] ?? $item['invoice'] ?? '');
            $nomorAsli = $this->getStringValue($item['nomor_transaksi_asli'] ?? $item['transaksi_asli'] ?? '');
            $tanggal = substr($this->getStringValue($item['tanggal'] ?? date('Y-m-d')), 0, 10);
            $kodeBarang = $this->getStringValue($item['barang'] ?? $item['kode_barang'] ?? $item['barang_id'] ?? '');
            $qtyRetur = (float) ($item['kuantitas'] ?? $item['qty'] ?? 0);

            if ($nomorRetur === '' || $kodeBarang === '' || $qtyRetur <= 0) {
                $bar->advance();

                continue;
            }

            $barang = Barang::where('kode_barang', $kodeBarang)->orWhere('id', $kodeBarang)->first();
            if (! $barang) {
                $gagal++;
                $bar->advance();

                continue;
            }

            $trxAsli = Transaksi::where('nomor_transaksi', $nomorAsli)->first();

            try {
                DB::transaction(function () use ($tipeRetur, $nomorRetur, $trxAsli, $tanggal, $barang, $qtyRetur, $item): void {
                    $hargaSatuan = 0;
                    if ($trxAsli) {
                        $detailAsli = DetailTransaksi::where('transaksi_id', $trxAsli->id)
                            ->where('barang_id', $barang->id)
                            ->first();
                        $hargaSatuan = $detailAsli ? (float) $detailAsli->harga_satuan : 0;
                    }

                    $subtotal = $qtyRetur * $hargaSatuan;

                    $transaksiRetur = Transaksi::create([
                        'nomor_transaksi' => $nomorRetur,
                        'transaksi_asal_id' => $trxAsli?->id,
                        'tanggal' => $tanggal,
                        'tipe' => $tipeRetur,
                        'client_id' => $trxAsli?->client_id,
                        'total' => $subtotal,
                        'metode_pembayaran' => 'tempo',
                        'keterangan' => $item['keterangan'] ?? 'Impor Retur API',
                        'status' => 'selesai',
                        'created_by' => 1,
                    ]);

                    DetailTransaksi::create([
                        'transaksi_id' => $transaksiRetur->id,
                        'barang_id' => $barang->id,
                        'kuantitas' => $qtyRetur,
                        'harga_satuan' => $hargaSatuan,
                        'subtotal' => $subtotal,
                    ]);

                    if ($tipeRetur === 'penjualan_retur') {
                        $this->fifoStockService->kembalikanStokReturPenjualan($transaksiRetur, $barang, $qtyRetur, $tanggal);
                    } else {
                        $this->fifoStockService->kurangiStokReturPembelian($transaksiRetur, $barang, $qtyRetur, $tanggal);
                    }

                    $this->jurnalService->postFromTransaksi($transaksiRetur);
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Retur: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function importBeban(string $baseUrl): void
    {
        $this->info('--- Mengimpor Pengeluaran / Beban Operasional ---');
        $items = $this->fetchApiData($baseUrl, 'beban');

        if (empty($items)) {
            $this->warn('Data Beban kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;

        foreach ($items as $item) {
            $tanggal = substr($this->getStringValue($item['tanggal'] ?? date('Y-m-d')), 0, 10);
            $total = (float) ($item['total'] ?? $item['nominal'] ?? 0);
            $keterangan = $this->getStringValue($item['keterangan'] ?? 'Impor Beban Operasional API');
            $noJurnal = $this->getStringValue($item['nomor_jurnal'] ?? $item['invoice'] ?? 'JNL-BBN-'.str_replace('-', '', $tanggal).'-'.sprintf('%04d', rand(1, 9999)));

            if ($total <= 0) {
                $bar->advance();

                continue;
            }

            $akunBeban = Akun::where('nama', 'LIKE', '%Beban%')->first()
                ?? Akun::where('kode', 'LIKE', '5%')->first();
            $akunKas = Akun::system('kas') ?? Akun::query()->KasBank()->first();

            if (! $akunBeban || ! $akunKas) {
                $gagal++;
                $bar->advance();

                continue;
            }

            try {
                DB::transaction(function () use ($noJurnal, $tanggal, $keterangan, $akunBeban, $akunKas, $total): void {
                    $jurnal = Jurnal::create([
                        'nomor_jurnal' => $noJurnal,
                        'tanggal' => $tanggal,
                        'keterangan' => $keterangan,
                        'created_by' => 1,
                    ]);

                    $jurnal->details()->create(['akun_id' => $akunBeban->id, 'debit' => $total, 'kredit' => 0]);
                    $jurnal->details()->create(['akun_id' => $akunKas->id, 'debit' => 0, 'kredit' => $total]);
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Beban: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function importPendapatanLainnya(string $baseUrl): void
    {
        $this->info('--- Mengimpor Pendapatan Lain-Lain ---');
        $items = $this->fetchApiData($baseUrl, 'pendapatan-lainnya');

        if (empty($items)) {
            $this->warn('Data Pendapatan Lainnya kosong atau tidak dapat diakses.');

            return;
        }

        $bar = $this->output->createProgressBar(count($items));
        $bar->start();

        $sukses = 0;
        $gagal = 0;

        foreach ($items as $item) {
            $tanggal = substr($this->getStringValue($item['tanggal'] ?? date('Y-m-d')), 0, 10);
            $total = (float) ($item['total'] ?? $item['nominal'] ?? 0);
            $keterangan = $this->getStringValue($item['keterangan'] ?? 'Impor Pendapatan Lain-Lain API');
            $noJurnal = $this->getStringValue($item['nomor_jurnal'] ?? $item['invoice'] ?? 'JNL-PDN-'.str_replace('-', '', $tanggal).'-'.sprintf('%04d', rand(1, 9999)));

            if ($total <= 0) {
                $bar->advance();

                continue;
            }

            $akunPendapatan = Akun::where('nama', 'LIKE', '%Pendapatan%Lain%')->first()
                ?? Akun::where('kode', 'LIKE', '4%')->first();
            $akunKas = Akun::system('kas') ?? Akun::query()->KasBank()->first();

            if (! $akunPendapatan || ! $akunKas) {
                $gagal++;
                $bar->advance();

                continue;
            }

            try {
                DB::transaction(function () use ($noJurnal, $tanggal, $keterangan, $akunKas, $akunPendapatan, $total): void {
                    $jurnal = Jurnal::create([
                        'nomor_jurnal' => $noJurnal,
                        'tanggal' => $tanggal,
                        'keterangan' => $keterangan,
                        'created_by' => 1,
                    ]);

                    $jurnal->details()->create(['akun_id' => $akunKas->id, 'debit' => $total, 'kredit' => 0]);
                    $jurnal->details()->create(['akun_id' => $akunPendapatan->id, 'debit' => 0, 'kredit' => $total]);
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Impor Pendapatan Lainnya: {$sukses} sukses, {$gagal} gagal.");
    }

    protected function truncateTables(): void
    {
        $this->info('Mengosongkan data transaksi, jurnal, barang, dan client...');
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('stok_batch_usages')->truncate();
        DB::table('stok_batches')->truncate();
        DB::table('detail_transaksis')->truncate();
        DB::table('transaksis')->truncate();
        DB::table('jurnal_details')->truncate();
        DB::table('jurnals')->truncate();
        DB::table('barangs')->truncate();
        DB::table('jenis_barang')->truncate();
        DB::table('clients')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
        $this->info('✓ Pengosongan data selesai.');
    }
}
