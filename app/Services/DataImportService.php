<?php

namespace App\Services;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use App\Models\Hutang;
use App\Models\JenisBarang;
use App\Models\Jurnal;
use App\Models\Kategori;
use App\Models\Piutang;
use App\Models\Transaksi;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DataImportService
{
    public function __construct(
        private JurnalService $jurnalService,
        private FifoStockService $fifoStockService,
    ) {}

    /**
     * Download template Excel untuk modul tertentu.
     */
    public function downloadTemplate(string $modul): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        switch ($modul) {
            case 'client':
                $sheet->setTitle('Template Client');
                $headers = ['Nama Client', 'Tipe (Peternak/Supplier/Pedagang/Karyawan/Truk)', 'No Telepon', 'Alamat', 'Keterangan'];
                $example = ['Budi Farm', 'Peternak', '08123456789', 'Jl. Merdeka No. 10', 'Pelanggan setia'];
                break;

            case 'barang':
                $sheet->setTitle('Template Barang');
                $headers = ['Kode Barang', 'Nama Barang', 'Jenis Barang', 'Satuan', 'Stok Awal'];
                $example = ['BRG-001', 'Telur Utuh A', 'Telur', 'Kg', 100];
                break;

            case 'akun':
                $sheet->setTitle('Template Akun');
                $headers = ['Kode Akun', 'Nama Akun', 'Kategori Akun', 'Saldo Normal (debit/kredit)'];
                $example = ['1101', 'Kas Utama', 'Kas & Bank', 'debit'];
                break;

            case 'hutang_piutang':
                $sheet->setTitle('Template Tagihan');
                $headers = ['Jenis (Hutang/Piutang)', 'Nomor Tagihan', 'Tanggal (YYYY-MM-DD)', 'Nama Client', 'Total Tagihan', 'Kode/Nama Akun Lawan', 'Keterangan'];
                $example = ['Hutang', 'HT-20261001-0001', date('Y-m-d'), 'Supplier A', 5000000, 'Kas Utama', 'Hutang saldo awal'];
                break;

            case 'jurnal':
                $sheet->setTitle('Template Jurnal');
                $headers = ['Nomor Jurnal', 'Tanggal (YYYY-MM-DD)', 'Nama Client', 'Kode/Nama Akun', 'Debit', 'Kredit', 'Keterangan'];
                $example = ['JU-001', date('Y-m-d'), '', 'Kas Utama', 1000000, 0, 'Setoran modal awal'];
                break;

            case 'pembelian':
                $sheet->setTitle('Template Pembelian');
                $headers = ['Nomor Transaksi', 'Tanggal (YYYY-MM-DD)', 'Nama Client', 'Kode Barang', 'Kuantitas', 'Harga Satuan', 'Metode Pembayaran (tunai/tempo)', 'Kode/Nama Akun Kas (jika tunai)', 'Keterangan'];
                $example = ['TRX-BUY-001', date('Y-m-d'), 'Supplier A', 'BRG-001', 50, 20000, 'tunai', 'Kas Utama', 'Pembelian pakan'];
                break;

            case 'penjualan':
                $sheet->setTitle('Template Penjualan');
                $headers = ['Nomor Transaksi', 'Tanggal (YYYY-MM-DD)', 'Nama Client', 'Kode Barang', 'Kuantitas', 'Harga Satuan', 'Metode Pembayaran (tunai/tempo)', 'Kode/Nama Akun Kas (jika tunai)', 'Keterangan'];
                $example = ['TRX-SELL-001', date('Y-m-d'), 'Customer B', 'BRG-001', 20, 25000, 'tunai', 'Kas Utama', 'Penjualan telur'];
                break;

            case 'retur':
                $sheet->setTitle('Template Retur');
                $headers = ['Tipe Retur (pembelian_retur/penjualan_retur)', 'Nomor Retur', 'Nomor Transaksi Asli', 'Tanggal (YYYY-MM-DD)', 'Kode Barang', 'Kuantitas Retur', 'Keterangan'];
                $example = ['penjualan_retur', 'RET-001', 'TRX-SELL-001', date('Y-m-d'), 'BRG-001', 2, 'Telur pecah'];
                break;

            default:
                throw new \InvalidArgumentException('Modul tidak valid.');
        }

        // Write Headers
        foreach ($headers as $colIndex => $header) {
            $columnLetter = Coordinate::stringFromColumnIndex($colIndex + 1);
            $sheet->setCellValue($columnLetter.'1', $header);
            $sheet->getStyle($columnLetter.'1')->getFont()->setBold(true);
        }

        // Write Example row
        if (isset($example)) {
            foreach ($example as $colIndex => $val) {
                $columnLetter = Coordinate::stringFromColumnIndex($colIndex + 1);
                $sheet->setCellValue($columnLetter.'2', $val);
            }
        }

        return new StreamedResponse(function () use ($spreadsheet): void {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="template-import-'.$modul.'.xlsx"',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Proses Impor File Excel.
     *
     * @return array{sukses: int, gagal: int, errors: array<int, string>}
     */
    public function import(string $modul, UploadedFile $file, int $userId): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        // Hapus baris pertama (header)
        array_shift($rows);

        $sukses = 0;
        $gagal = 0;
        $errors = [];

        switch ($modul) {
            case 'client':
                return $this->importClient($rows);
            case 'barang':
                return $this->importBarang($rows);
            case 'akun':
                return $this->importAkun($rows);
            case 'hutang_piutang':
                return $this->importHutangPiutang($rows, $userId);
            case 'jurnal':
                return $this->importJurnal($rows, $userId);
            case 'pembelian':
            case 'penjualan':
                return $this->importTransaksi($rows, $modul, $userId);
            case 'retur':
                return $this->importRetur($rows, $userId);
            default:
                throw new \InvalidArgumentException('Modul tidak valid.');
        }
    }

    protected function importClient(array $rows): array
    {
        $sukses = 0;
        $gagal = 0;
        $errors = [];
        $tipeValid = ['Peternak', 'Supplier', 'Pedagang', 'Karyawan', 'Truk'];

        foreach ($rows as $index => $row) {
            $lineNum = $index + 2;
            $nama = trim((string) ($row['A'] ?? ''));
            $tipe = trim((string) ($row['B'] ?? ''));
            $noTelepon = trim((string) ($row['C'] ?? ''));
            $alamat = trim((string) ($row['D'] ?? ''));
            $keterangan = trim((string) ($row['E'] ?? ''));

            if ($nama === '') {
                continue; // Baris kosong
            }

            if (! in_array($tipe, $tipeValid, true)) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Tipe client '{$tipe}' tidak valid. Pilihan: ".implode(', ', $tipeValid);

                continue;
            }

            try {
                Client::updateOrCreate(
                    ['nama' => $nama],
                    [
                        'tipe' => $tipe,
                        'no_telepon' => $noTelepon ?: null,
                        'alamat' => $alamat ?: null,
                        'keterangan' => $keterangan ?: null,
                        'status' => 'aktif',
                    ]
                );
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Gagal menyimpan client {$nama} ({$e->getMessage()})";
            }
        }

        return compact('sukses', 'gagal', 'errors');
    }

    protected function importBarang(array $rows): array
    {
        $sukses = 0;
        $gagal = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $lineNum = $index + 2;
            $kode = trim((string) ($row['A'] ?? ''));
            $nama = trim((string) ($row['B'] ?? ''));
            $jenisNama = trim((string) ($row['C'] ?? ''));
            $satuan = trim((string) ($row['D'] ?? ''));
            $stok = (float) ($row['E'] ?? 0);

            if ($kode === '' || $nama === '') {
                continue;
            }

            $jenisBarang = JenisBarang::where('nama', $jenisNama)->first();
            if (! $jenisBarang) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Jenis barang '{$jenisNama}' tidak ditemukan.";

                continue;
            }

            try {
                Barang::updateOrCreate(
                    ['kode_barang' => $kode],
                    [
                        'nama_barang' => $nama,
                        'jenis_barang_id' => $jenisBarang->id,
                        'satuan' => $satuan ?: 'Pcs',
                        'stok' => $stok,
                    ]
                );
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Gagal menyimpan barang {$kode} ({$e->getMessage()})";
            }
        }

        return compact('sukses', 'gagal', 'errors');
    }

    protected function importAkun(array $rows): array
    {
        $sukses = 0;
        $gagal = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $lineNum = $index + 2;
            $kode = trim((string) ($row['A'] ?? ''));
            $nama = trim((string) ($row['B'] ?? ''));
            $kategoriNama = trim((string) ($row['C'] ?? ''));
            $saldoNormal = strtolower(trim((string) ($row['D'] ?? 'debit')));

            if ($kode === '' || $nama === '') {
                continue;
            }

            $kategori = Kategori::where('nama', $kategoriNama)->first();
            if (! $kategori) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Kategori akun '{$kategoriNama}' tidak ditemukan.";

                continue;
            }

            if (! in_array($saldoNormal, ['debit', 'kredit'], true)) {
                $saldoNormal = 'debit';
            }

            try {
                Akun::updateOrCreate(
                    ['kode' => $kode],
                    [
                        'nama' => $nama,
                        'kategori_id' => $kategori->id,
                        'saldo_normal' => $saldoNormal,
                        'status' => 'aktif',
                    ]
                );
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Gagal menyimpan akun {$kode} ({$e->getMessage()})";
            }
        }

        return compact('sukses', 'gagal', 'errors');
    }

    protected function importHutangPiutang(array $rows, int $userId): array
    {
        $sukses = 0;
        $gagal = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $lineNum = $index + 2;
            $jenis = strtolower(trim((string) ($row['A'] ?? '')));
            $nomor = trim((string) ($row['B'] ?? ''));
            $tanggal = trim((string) ($row['C'] ?? ''));
            $clientNama = trim((string) ($row['D'] ?? ''));
            $total = (float) ($row['E'] ?? 0);
            $akunLawanInput = trim((string) ($row['F'] ?? ''));
            $keterangan = trim((string) ($row['G'] ?? ''));

            if ($jenis === '' || $clientNama === '' || $total <= 0) {
                continue;
            }

            if (! in_array($jenis, ['hutang', 'piutang'], true)) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Jenis tagihan harus 'Hutang' atau 'Piutang'.";

                continue;
            }

            $client = Client::where('nama', $clientNama)->first();
            if (! $client) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Client '{$clientNama}' tidak ditemukan.";

                continue;
            }

            $akunKas = Akun::where('kode', $akunLawanInput)
                ->orWhere('nama', $akunLawanInput)
                ->first() ?? Akun::system('kas');

            if (! $akunKas) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Akun lawan/pembayaran tidak ditemukan.";

                continue;
            }

            try {
                DB::transaction(function () use ($jenis, $nomor, $tanggal, $client, $total, $akunKas, $keterangan, $userId): void {
                    $tgl = $tanggal ?: date('Y-m-d');
                    $datePart = str_replace('-', '', $tgl);

                    if ($jenis === 'hutang') {
                        $noTagihan = $nomor ?: 'HT-'.$datePart.'-'.sprintf('%04d', rand(1, 9999));
                        $tagihan = Hutang::create([
                            'no_hutang' => $noTagihan,
                            'tanggal' => $tgl,
                            'client_id' => $client->id,
                            'total' => $total,
                            'keterangan' => $keterangan ?: 'Impor saldo awal hutang',
                            'status' => 'belum_lunas',
                            'created_by' => $userId,
                            'akun_pembayaran_id' => $akunKas->id,
                        ]);
                        $this->jurnalService->postTambahHutang($tagihan);
                    } else {
                        $noTagihan = $nomor ?: 'PT-'.$datePart.'-'.sprintf('%04d', rand(1, 9999));
                        $tagihan = Piutang::create([
                            'no_piutang' => $noTagihan,
                            'tanggal' => $tgl,
                            'client_id' => $client->id,
                            'total' => $total,
                            'keterangan' => $keterangan ?: 'Impor saldo awal piutang',
                            'status' => 'belum_lunas',
                            'created_by' => $userId,
                            'akun_pembayaran_id' => $akunKas->id,
                        ]);
                        $this->jurnalService->postTambahPiutang($tagihan);
                    }
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Gagal menyimpan tagihan ({$e->getMessage()})";
            }
        }

        return compact('sukses', 'gagal', 'errors');
    }

    protected function importJurnal(array $rows, int $userId): array
    {
        $sukses = 0;
        $gagal = 0;
        $errors = [];

        // Kelompokkan per Nomor Jurnal
        $grouped = [];
        foreach ($rows as $index => $row) {
            $noJurnal = trim((string) ($row['A'] ?? ''));
            if ($noJurnal === '') {
                continue;
            }
            $grouped[$noJurnal][] = [
                'line' => $index + 2,
                'tanggal' => trim((string) ($row['B'] ?? '')),
                'client' => trim((string) ($row['C'] ?? '')),
                'akun' => trim((string) ($row['D'] ?? '')),
                'debit' => (float) ($row['E'] ?? 0),
                'kredit' => (float) ($row['F'] ?? 0),
                'keterangan' => trim((string) ($row['G'] ?? '')),
            ];
        }

        foreach ($grouped as $noJurnal => $items) {
            $totalDebit = array_sum(array_column($items, 'debit'));
            $totalKredit = array_sum(array_column($items, 'kredit'));

            if (abs($totalDebit - $totalKredit) > 0.01) {
                $gagal++;
                $errors[] = "Jurnal {$noJurnal}: Total Debit (".number_format($totalDebit, 0).') dan Kredit ('.number_format($totalKredit, 0).') tidak seimbang.';

                continue;
            }

            try {
                DB::transaction(function () use ($noJurnal, $items, $userId): void {
                    $first = $items[0];
                    $tgl = $first['tanggal'] ?: date('Y-m-d');
                    $client = $first['client'] ? Client::where('nama', $first['client'])->first() : null;

                    $jurnal = Jurnal::create([
                        'nomor_jurnal' => $noJurnal,
                        'tanggal' => $tgl,
                        'client_id' => $client?->id,
                        'keterangan' => $first['keterangan'] ?: 'Impor Jurnal',
                        'created_by' => $userId,
                    ]);

                    foreach ($items as $detail) {
                        $akun = Akun::where('kode', $detail['akun'])
                            ->orWhere('nama', $detail['akun'])
                            ->first();

                        if (! $akun) {
                            throw new \Exception("Akun '{$detail['akun']}' tidak ditemukan.");
                        }

                        $jurnal->details()->create([
                            'akun_id' => $akun->id,
                            'debit' => $detail['debit'],
                            'kredit' => $detail['kredit'],
                        ]);
                    }
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
                $errors[] = "Jurnal {$noJurnal}: Gagal menyimpan ({$e->getMessage()})";
            }
        }

        return compact('sukses', 'gagal', 'errors');
    }

    protected function importTransaksi(array $rows, string $tipe, int $userId): array
    {
        $sukses = 0;
        $gagal = 0;
        $errors = [];

        // Kelompokkan per Nomor Transaksi
        $grouped = [];
        foreach ($rows as $index => $row) {
            $noTrx = trim((string) ($row['A'] ?? ''));
            if ($noTrx === '') {
                $noTrx = 'TRX-IMP-'.date('Ymd').'-'.rand(1000, 9999);
            }

            $grouped[$noTrx][] = [
                'line' => $index + 2,
                'tanggal' => trim((string) ($row['B'] ?? '')),
                'client' => trim((string) ($row['C'] ?? '')),
                'barang' => trim((string) ($row['D'] ?? '')),
                'qty' => (float) ($row['E'] ?? 0),
                'harga' => (float) ($row['F'] ?? 0),
                'metode' => strtolower(trim((string) ($row['G'] ?? 'tempo'))),
                'akun_kas' => trim((string) ($row['H'] ?? '')),
                'keterangan' => trim((string) ($row['I'] ?? '')),
            ];
        }

        foreach ($grouped as $noTrx => $items) {
            try {
                DB::transaction(function () use ($noTrx, $items, $tipe, $userId): void {
                    $first = $items[0];
                    $tgl = $first['tanggal'] ?: date('Y-m-d');
                    $client = Client::where('nama', $first['client'])->first();

                    if (! $client) {
                        throw new \Exception("Client '{$first['client']}' tidak ditemukan.");
                    }

                    $total = 0;
                    $detailsData = [];

                    foreach ($items as $item) {
                        $barang = Barang::where('kode_barang', $item['barang'])
                            ->orWhere('nama_barang', $item['barang'])
                            ->first();

                        if (! $barang) {
                            throw new \Exception("Barang '{$item['barang']}' tidak ditemukan.");
                        }

                        $subtotal = $item['qty'] * $item['harga'];
                        $total += $subtotal;

                        $detailsData[] = [
                            'barang_id' => $barang->id,
                            'kuantitas' => $item['qty'],
                            'harga' => $item['harga'],
                            'subtotal' => $subtotal,
                        ];
                    }

                    $transaksi = Transaksi::create([
                        'nomor_transaksi' => $noTrx,
                        'tanggal' => $tgl,
                        'tipe_transaksi' => $tipe,
                        'metode_pembayaran' => in_array($first['metode'], ['tunai', 'tempo'], true) ? $first['metode'] : 'tempo',
                        'client_id' => $client->id,
                        'total' => $total,
                        'keterangan' => $first['keterangan'] ?: 'Impor Transaksi '.$tipe,
                        'created_by' => $userId,
                    ]);

                    foreach ($detailsData as $d) {
                        $detailTransaksi = $transaksi->detailTransaksis()->create($d);
                        $barang = Barang::find($d['barang_id']);

                        switch ($tipe) {
                            case 'pembelian':
                                $this->fifoStockService->addStockFromPurchase($detailTransaksi);
                                break;
                            case 'penjualan':
                                $this->fifoStockService->reduceStockForSale($detailTransaksi);
                                break;
                        }
                    }

                    $this->jurnalService->postFromTransaksi($transaksi);
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
                $errors[] = "Transaksi {$noTrx}: Gagal ({$e->getMessage()})";
            }
        }

        return compact('sukses', 'gagal', 'errors');
    }

    protected function importRetur(array $rows, int $userId): array
    {
        $sukses = 0;
        $gagal = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            $lineNum = $index + 2;
            $tipeRetur = strtolower(trim((string) ($row['A'] ?? '')));
            $noRetur = trim((string) ($row['B'] ?? ''));
            $noAsli = trim((string) ($row['C'] ?? ''));
            $tanggal = trim((string) ($row['D'] ?? ''));
            $kodeBarang = trim((string) ($row['E'] ?? ''));
            $qty = (float) ($row['F'] ?? 0);
            $ket = trim((string) ($row['G'] ?? ''));

            if (! in_array($tipeRetur, ['pembelian_retur', 'penjualan_retur'], true) || $qty <= 0) {
                continue;
            }

            $transaksiAsli = Transaksi::where('nomor_transaksi', $noAsli)->first();
            if (! $transaksiAsli) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Transaksi asal '{$noAsli}' tidak ditemukan.";

                continue;
            }

            $barang = Barang::where('kode_barang', $kodeBarang)->first();
            if (! $barang) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Barang '{$kodeBarang}' tidak ditemukan.";

                continue;
            }

            try {
                DB::transaction(function () use ($tipeRetur, $noRetur, $transaksiAsli, $tanggal, $barang, $qty, $ket, $userId): void {
                    $tgl = $tanggal ?: date('Y-m-d');
                    $retur = Transaksi::create([
                        'nomor_transaksi' => $noRetur ?: 'RET-IMP-'.rand(1000, 9999),
                        'tanggal' => $tgl,
                        'tipe_transaksi' => $tipeRetur,
                        'metode_pembayaran' => 'tempo',
                        'client_id' => $transaksiAsli->client_id,
                        'retur_dari_id' => $transaksiAsli->id,
                        'total' => $qty * 0, // dihitung dari detail
                        'keterangan' => $ket ?: 'Impor Retur',
                        'created_by' => $userId,
                    ]);

                    // Cari detail barang asli
                    $detailAsli = $transaksiAsli->detailTransaksis()->where('barang_id', $barang->id)->first();
                    $harga = $detailAsli ? (float) $detailAsli->harga : 0;
                    $subtotal = $qty * $harga;

                    $retur->detailTransaksis()->create([
                        'detail_sumber_id' => $detailAsli?->id,
                        'barang_id' => $barang->id,
                        'kuantitas' => $qty,
                        'harga' => $harga,
                        'subtotal' => $subtotal,
                    ]);

                    $retur->total = $subtotal;
                    $retur->save();

                    $this->jurnalService->postFromTransaksi($retur);
                });
                $sukses++;
            } catch (\Throwable $e) {
                $gagal++;
                $errors[] = "Baris {$lineNum}: Gagal impor retur ({$e->getMessage()})";
            }
        }

        return compact('sukses', 'gagal', 'errors');
    }
}
