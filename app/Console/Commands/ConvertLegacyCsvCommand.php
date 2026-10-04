<?php

namespace App\Console\Commands;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use Illuminate\Console\Command;

class ConvertLegacyCsvCommand extends Command
{
    protected $signature = 'convert:legacy-csv {--output-dir=csv_export_converted}';

    protected $description = 'Konversi data transaksis.csv dan detail_transaksis.csv ke format impor Excel/CSV SIM';

    public function handle(): int
    {
        $this->info('Memulai konversi data sistem lama...');

        $transaksiFile = base_path('transaksis.csv');
        $detailFile = base_path('detail_transaksis.csv');

        if (! file_exists($transaksiFile) || ! file_exists($detailFile)) {
            $this->error('File transaksis.csv atau detail_transaksis.csv tidak ditemukan di root proyek.');

            return self::FAILURE;
        }

        $barangs = Barang::pluck('kode_barang', 'id')->toArray();
        $clients = Client::pluck('nama', 'id')->toArray();
        $akuns = Akun::get()->keyBy('id');

        $defaultClient = Client::first()?->nama ?? 'Umum';

        $this->info('Membaca transaksis.csv...');
        $transaksis = [];
        $handleT = fopen($transaksiFile, 'r');
        fgetcsv($handleT, 0, ';'); // skip header

        while (($row = fgetcsv($handleT, 0, ';')) !== false) {
            $id = $row[0];
            $transaksis[$id] = [
                'id' => $id,
                'invoice' => trim($row[1]),
                'tanggal' => substr(trim($row[2]), 0, 10),
                'name' => trim($row[3]),
                'type' => trim($row[4]), // Debit or Kredit
                'user_id' => trim($row[5]),
                'client_id' => trim($row[6]),
                'total' => (float) trim($row[7]),
                'status' => trim($row[8]),
                'details' => [],
            ];
        }
        fclose($handleT);

        $this->info('Membaca detail_transaksis.csv...');
        $handleD = fopen($detailFile, 'r');
        fgetcsv($handleD, 0, ';'); // skip header

        while (($row = fgetcsv($handleD, 0, ';')) !== false) {
            $tId = $row[1];
            if (isset($transaksis[$tId])) {
                $transaksis[$tId]['details'][] = [
                    'id' => $row[0],
                    'kategori_id' => trim($row[2]),
                    'barang_id' => trim($row[3]),
                    'value' => trim($row[4]),
                    'kuantitas' => (float) ($row[5] ?? 0),
                    'sub_total' => (float) ($row[6] ?? 0),
                ];
            }
        }
        fclose($handleD);

        $outputDir = base_path($this->option('output-dir'));
        if (! is_dir($outputDir)) {
            mkdir($outputDir, 0755, true);
        }

        $rowsHutangPiutang = [];
        $rowsJurnal = [];
        $rowsPembelian = [];
        $rowsPenjualan = [];
        $rowsRetur = [];

        $financialGroups = [];

        $countSkippedHpp = 0;
        $countSkippedAwl = 0;

        foreach ($transaksis as $t) {
            $inv = $t['invoice'];
            $parts = explode('-', $inv);
            $code = $parts[2] ?? '';
            $suffix = $parts[3] ?? '';
            $type = $t['type']; // Debit or Kredit

            // 1. SKIP redundant HPP headers from old system (our SIM auto-generates HPP)
            if ($code === 'HPP' || str_contains($inv, '-HPP-')) {
                $countSkippedHpp++;

                continue;
            }

            // 2. SKIP redundant AWL counterpart headers when paired with UTG/BON
            if ($code === 'AWL') {
                $countSkippedAwl++;

                continue;
            }

            $clientNama = isset($clients[$t['client_id']]) ? $clients[$t['client_id']] : '';
            if (empty($clientNama)) {
                $clientNama = $defaultClient;
            }

            // Check if transaction has valid stock barang items
            $hasBarang = false;
            foreach ($t['details'] as $d) {
                if ($d['barang_id'] !== 'NULL' && $d['barang_id'] !== '' && isset($barangs[$d['barang_id']])) {
                    $hasBarang = true;

                    break;
                }
            }

            // 3. RETUR (RTN / RTR)
            if ($code === 'RTN' || $code === 'RTR') {
                $tipeRetur = ($code === 'RTR' || str_contains($inv, 'RTR')) ? 'pembelian_retur' : 'penjualan_retur';
                $noAsli = '';
                if (preg_match('/INV-[\w-]+/', $t['name'], $matches)) {
                    $noAsli = $matches[0];
                }

                foreach ($t['details'] as $d) {
                    $kodeBarang = $barangs[$d['barang_id']] ?? '';
                    if (! $kodeBarang || $d['kuantitas'] <= 0) {
                        continue;
                    }
                    $rowsRetur[] = [
                        $tipeRetur,
                        $t['invoice'],
                        $noAsli,
                        $t['tanggal'],
                        $kodeBarang,
                        $d['kuantitas'],
                        $t['name'],
                    ];
                }

                continue;
            }

            // 4. STOCK TRANSACTIONS (has valid barang items)
            if ($hasBarang) {
                // Debit = Stock Increase (Pembelian), Kredit = Stock Decrease (Penjualan)
                $isPurchase = ($type === 'Debit');

                foreach ($t['details'] as $d) {
                    $kodeBarang = $barangs[$d['barang_id']] ?? '';
                    if (! $kodeBarang) {
                        continue;
                    }
                    $qty = $d['kuantitas'] > 0 ? $d['kuantitas'] : 1;
                    $harga = $qty > 0 ? round($d['sub_total'] / $qty, 2) : $d['sub_total'];

                    $row = [
                        $t['invoice'],
                        $t['tanggal'],
                        $clientNama,
                        $kodeBarang,
                        $qty,
                        $harga,
                        'tempo',
                        '',
                        $t['name'],
                    ];

                    if ($isPurchase) {
                        $rowsPembelian[] = $row;
                    } else {
                        $rowsPenjualan[] = $row;
                    }
                }

                continue;
            }

            // 5. HUTANG & PIUTANG / PELUNASAN (UTG, BON without stock barang)
            if (in_array($code, ['UTG', 'BON'], true) && ! $hasBarang) {
                if ($code === 'UTG') {
                    $jenis = ($type === 'Kredit') ? 'Hutang' : 'Bayar Hutang';
                } else {
                    $jenis = ($type === 'Debit') ? 'Piutang' : 'Terima Piutang';
                }

                $akunLawan = 'Kas Tunai';

                $rowsHutangPiutang[] = [
                    $jenis,
                    $t['invoice'],
                    $t['tanggal'],
                    $clientNama,
                    $t['total'],
                    $akunLawan,
                    $t['name'],
                ];

                continue;
            }

            // 6. FINANCIAL JOURNALS (TNI, DBY, TFR, PGN, LNY, MDL, etc.)
            $groupKey = $t['tanggal'].'_'.$suffix;
            if ($suffix === '') {
                $groupKey = 'JNL_'.$t['id'];
            }

            if (! isset($financialGroups[$groupKey])) {
                $financialGroups[$groupKey] = [
                    'no_jurnal' => 'JNL-'.$t['tanggal'].'-'.($suffix ?: $t['id']),
                    'tanggal' => $t['tanggal'],
                    'client' => $clientNama === $defaultClient ? '' : $clientNama,
                    'keterangan' => $t['name'],
                    'entries' => [],
                ];
            }

            foreach ($t['details'] as $d) {
                $akunObj = $akuns[$d['kategori_id']] ?? null;
                $akunNama = $akunObj ? $akunObj->nama : 'Kas Tunai';
                $isDebit = ($type === 'Debit');

                $financialGroups[$groupKey]['entries'][] = [
                    'akun' => $akunNama,
                    'debit' => $isDebit ? $d['sub_total'] : 0,
                    'kredit' => ! $isDebit ? $d['sub_total'] : 0,
                ];
            }
        }

        // Flatten financialGroups into rowsJurnal
        foreach ($financialGroups as $group) {
            foreach ($group['entries'] as $entry) {
                $rowsJurnal[] = [
                    $group['no_jurnal'],
                    $group['tanggal'],
                    $group['client'],
                    $entry['akun'],
                    $entry['debit'],
                    $entry['kredit'],
                    $group['keterangan'],
                ];
            }
        }

        $this->info("HPP redundant skipped: {$countSkippedHpp}");
        $this->info("AWL counterpart skipped: {$countSkippedAwl}");
        $this->info('Jumlah baris konversi:');
        $this->info('- Hutang/Piutang/Pelunasan : '.count($rowsHutangPiutang));
        $this->info('- Jurnal Umum              : '.count($rowsJurnal));
        $this->info('- Pembelian (Debit)        : '.count($rowsPembelian));
        $this->info('- Penjualan (Kredit)       : '.count($rowsPenjualan));
        $this->info('- Retur                    : '.count($rowsRetur));

        // Save CSVs
        $this->saveCsv($outputDir.'/export_hutang_piutang.csv', [
            'Jenis (Hutang/Piutang/Bayar Hutang/Terima Piutang)', 'Nomor Tagihan', 'Tanggal (YYYY-MM-DD)', 'Nama Client', 'Total Tagihan', 'Kode/Nama Akun Lawan', 'Keterangan',
        ], $rowsHutangPiutang);

        $this->saveCsv($outputDir.'/export_jurnal.csv', [
            'Nomor Jurnal', 'Tanggal (YYYY-MM-DD)', 'Nama Client', 'Kode/Nama Akun', 'Debit', 'Kredit', 'Keterangan',
        ], $rowsJurnal);

        $this->saveCsv($outputDir.'/export_pembelian.csv', [
            'Nomor Transaksi', 'Tanggal (YYYY-MM-DD)', 'Nama Client', 'Kode Barang', 'Kuantitas', 'Harga Satuan', 'Metode Pembayaran (tunai/tempo)', 'Kode/Nama Akun Kas (jika tunai)', 'Keterangan',
        ], $rowsPembelian);

        $this->saveCsv($outputDir.'/export_penjualan.csv', [
            'Nomor Transaksi', 'Tanggal (YYYY-MM-DD)', 'Nama Client', 'Kode Barang', 'Kuantitas', 'Harga Satuan', 'Metode Pembayaran (tunai/tempo)', 'Kode/Nama Akun Kas (jika tunai)', 'Keterangan',
        ], $rowsPenjualan);

        $this->saveCsv($outputDir.'/export_retur.csv', [
            'Tipe Retur (pembelian_retur/penjualan_retur)', 'Nomor Retur', 'Nomor Transaksi Asli', 'Tanggal (YYYY-MM-DD)', 'Kode Barang', 'Kuantitas Retur', 'Keterangan',
        ], $rowsRetur);

        $this->info("✓ Konversi selesai! File hasil disimpan di folder: {$outputDir}");

        return self::SUCCESS;
    }

    protected function saveCsv(string $path, array $headers, array $rows): void
    {
        $handle = fopen($path, 'w');
        // Write UTF-8 BOM for Excel compatibility
        fwrite($handle, "\xEF\xBB\xBF");
        fputcsv($handle, $headers, ',');
        foreach ($rows as $row) {
            fputcsv($handle, $row, ',');
        }
        fclose($handle);
    }
}
