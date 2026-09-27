<?php

namespace Database\Seeders;

use App\Models\Akun;
use App\Models\Kategori;
use Illuminate\Database\Seeder;

class AkunDetailSeeder extends Seeder
{
    /**
     * Nama kategori induk sesuai urutan detail_kategori_id pada data akun.
     *
     * Slot indeks 16 ('HPP') dipertahankan agar indeks kategori berikutnya
     * tidak bergeser, meski kategori HPP generik sudah dihapus.
     *
     * @var list<string>
     */
    private array $kategoriNama = [
        'Penjualan Telur',
        'Penjualan Pakan',
        'Penjualan Obat',
        'Penjualan EggTray',
        'Pendapatan Perlengkapan',
        'Pendapatan Non Penjualan',
        'Penjualan Lain-Lain',
        'Pendapatan Truk',
        'Pendapatan Pengadaan',
        'Beban Transport',
        'Beban Bunga & Pajak',
        'Beban Operasional',
        'Beban Produksi',
        'Beban Lain-Lain',
        'Beban Sedekah',
        'HPP',
        'Pengeluaran Truk',
        'Pengeluaran Pengadaan',
        'Piutang Pihak Lain',
        'Piutang Supplier',
        'Piutang Tray',
        'Piutang Obat',
        'Piutang Pakan',
        'Stok',
        'Kas',
        'Bank BCA',
        'Bank BRI',
        'Bank BNI',
        'Hutang Pihak Lain',
        'Hutang Supplier',
        'Hutang Tray',
        'Hutang Obat',
        'Hutang Pakan',
        'Modal',
        'HPP Telur',
        'HPP Tray',
        'HPP Obat-Obatan',
        'HPP Pakan',
        'HPP Curah',
    ];

    /**
     * system_code tetap untuk akun Pakan Curah (di-set saat create, tidak di-overwrite).
     *
     * @var array<string, string>
     */
    private array $systemCode = [
        'Stok Pakan Curah' => 'stok_pakan_curah',
        'Penjualan Pakan Curah' => 'penjualan_pakan_curah',
        'HPP Curah' => 'hpp_pakan_curah',
        'Piutang Pakan Curah' => 'piutang_pakan_curah',
        'Hutang Pakan Curah' => 'hutang_pakan_curah',
    ];

    /**
     * Prefix kode akun per jenis kategori induk.
     *
     * @var array<string, int>
     */
    private array $prefixJenis = [
        'aset' => 1,
        'liabilitas' => 2,
        'ekuitas' => 3,
        'pendapatan' => 4,
        'beban' => 5,
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            // --- PENDAPATAN (detail_kategori_id: 1-9) ---
            ['name' => 'Penjualan Telur Horn', 'detail_kategori_id' => 1, 'deskripsi' => 'Pendapatan dari penjualan telur horn'],
            ['name' => 'Penjualan Telur Bebek', 'detail_kategori_id' => 1, 'deskripsi' => 'Pendapatan dari penjualan telur bebek'],
            ['name' => 'Penjualan Telur Puyuh', 'detail_kategori_id' => 1, 'deskripsi' => 'Pendapatan dari penjualan telur puyuh'],
            ['name' => 'Penjualan Telur Arab', 'detail_kategori_id' => 1, 'deskripsi' => 'Pendapatan dari penjualan telur arab'],
            ['name' => 'Penjualan Telur Asin', 'detail_kategori_id' => 1, 'deskripsi' => 'Pendapatan dari penjualan telur asin'],
            ['name' => 'Penjualan Pakan Sentrat/Pabrikan', 'detail_kategori_id' => 2, 'deskripsi' => 'Penjualan pakan ternak pabrikan'],
            ['name' => 'Penjualan Pakan Kucing', 'detail_kategori_id' => 2, 'deskripsi' => 'Penjualan pakan kucing'],
            ['name' => 'Penjualan Pakan Curah', 'detail_kategori_id' => 2, 'deskripsi' => 'Penjualan pakan ternak curah'],
            ['name' => 'Penjualan Obat-Obatan', 'detail_kategori_id' => 3, 'deskripsi' => 'Penjualan obat-obatan ternak'],
            ['name' => 'Penjualan EggTray', 'detail_kategori_id' => 4, 'deskripsi' => 'Penjualan wadah telur/egg tray'],
            ['name' => 'Penjualan Triplex', 'detail_kategori_id' => 5, 'deskripsi' => 'Pendapatan dari penjualan triplex'],
            ['name' => 'Penjualan Terpal', 'detail_kategori_id' => 5, 'deskripsi' => 'Pendapatan dari penjualan terpal'],
            ['name' => 'Penjualan Ban Bekas', 'detail_kategori_id' => 5, 'deskripsi' => 'Pendapatan dari penjualan ban bekas'],
            ['name' => 'Penjualan Sak Campur', 'detail_kategori_id' => 5, 'deskripsi' => 'Pendapatan dari penjualan sak campur'],
            ['name' => 'Penjualan Tali', 'detail_kategori_id' => 5, 'deskripsi' => 'Pendapatan dari penjualan tali'],
            ['name' => 'Pemasukan Telur Reject', 'detail_kategori_id' => 6, 'deskripsi' => 'Pemasukan dari hasil telur reject'],
            ['name' => 'Pemasukan Transport Setoran', 'detail_kategori_id' => 6, 'deskripsi' => 'Jasa transport setoran'],
            ['name' => 'Pemasukan Transport Pedagang', 'detail_kategori_id' => 6, 'deskripsi' => 'Jasa transport pedagang'],
            ['name' => 'Penjualan Lain-Lain', 'detail_kategori_id' => 7, 'deskripsi' => 'Pendapatan penjualan lainnya'],
            ['name' => 'Pendapatan Truk', 'detail_kategori_id' => 8, 'deskripsi' => 'Hasil operasional truk'],
            ['name' => 'Pendapatan Pengadaan Jasa', 'detail_kategori_id' => 9, 'deskripsi' => 'Hasil jasa pengadaan'],

            // --- PENGELUARAN (detail_kategori_id: 10-18) ---
            ['name' => 'Beban Transport', 'detail_kategori_id' => 10, 'deskripsi' => 'Biaya transportasi'],
            ['name' => 'Beban Bunga', 'detail_kategori_id' => 11, 'deskripsi' => 'Beban bunga pinjaman'],
            ['name' => 'Beban Gaji', 'detail_kategori_id' => 12, 'deskripsi' => 'Biaya gaji karyawan'],
            ['name' => 'Beban Kantor', 'detail_kategori_id' => 12, 'deskripsi' => 'Biaya operasional kantor'],
            ['name' => 'Beban Konsumsi', 'detail_kategori_id' => 12, 'deskripsi' => 'Biaya konsumsi harian'],
            ['name' => 'Beban Telur Kotor', 'detail_kategori_id' => 13, 'deskripsi' => 'Kerugian telur kotor'],
            ['name' => 'Beban Telur Bentes', 'detail_kategori_id' => 13, 'deskripsi' => 'Kerugian telur bentes'],
            ['name' => 'Beban Telur Ceplok', 'detail_kategori_id' => 13, 'deskripsi' => 'Kerugian telur ceplok'],
            ['name' => 'Beban Telur Prok', 'detail_kategori_id' => 13, 'deskripsi' => 'Kerugian telur prok'],
            ['name' => 'Beban Telur Jumbo', 'detail_kategori_id' => 13, 'deskripsi' => 'Kerugian telur jumbo'],
            ['name' => 'Beban Barang Kadaluarsa', 'detail_kategori_id' => 13, 'deskripsi' => 'Kerugian barang expired'],
            ['name' => 'Beban Selisih Stok', 'detail_kategori_id' => 13, 'deskripsi' => 'Kerugian akibat selisih stok'],
            ['name' => 'Beban Lain-Lain', 'detail_kategori_id' => 14, 'deskripsi' => 'Beban umum lainnya'],
            ['name' => 'Beban Servis', 'detail_kategori_id' => 10, 'deskripsi' => 'Biaya perbaikan kendaraan'],
            ['name' => 'Beban TAL', 'detail_kategori_id' => 12, 'deskripsi' => 'Biaya Telepon, Air, Listrik'],
            ['name' => 'Beban BBM', 'detail_kategori_id' => 10, 'deskripsi' => 'Biaya bahan bakar'],
            ['name' => 'Peralatan', 'detail_kategori_id' => 12, 'deskripsi' => 'Pembelian peralatan kecil'],
            ['name' => 'Perlengkapan', 'detail_kategori_id' => 12, 'deskripsi' => 'Pembelian perlengkapan'],
            ['name' => 'ZIS', 'detail_kategori_id' => 15, 'deskripsi' => 'Zakat, Infaq, Sedekah'],
            // HPP per kelompok jenis barang (detail_kategori_id: 35-39)
            ['name' => 'HPP Telur', 'detail_kategori_id' => 35, 'deskripsi' => 'HPP penjualan telur'],
            ['name' => 'HPP Tray', 'detail_kategori_id' => 36, 'deskripsi' => 'HPP penjualan tray'],
            ['name' => 'HPP Obat-Obatan', 'detail_kategori_id' => 37, 'deskripsi' => 'HPP penjualan obat-obatan'],
            ['name' => 'HPP Pakan', 'detail_kategori_id' => 38, 'deskripsi' => 'HPP penjualan pakan'],
            ['name' => 'HPP Curah', 'detail_kategori_id' => 39, 'deskripsi' => 'HPP penjualan pakan curah'],
            ['name' => 'Beban Pajak Kendaraan', 'detail_kategori_id' => 11, 'deskripsi' => 'Pajak STNK/Kendaraan'],
            ['name' => 'Pengeluaran Truk', 'detail_kategori_id' => 17, 'deskripsi' => 'Biaya operasional truk'],
            ['name' => 'Beban Tray Terpakai', 'detail_kategori_id' => 13, 'deskripsi' => 'Pemakaian tray dalam produksi'],
            ['name' => 'Beban Pajak Pendapatan', 'detail_kategori_id' => 11, 'deskripsi' => 'Pajak penghasilan'],
            ['name' => 'Pengeluaran Pengadaan Jasa', 'detail_kategori_id' => 18, 'deskripsi' => 'Biaya jasa pengadaan'],

            // --- ASET (detail_kategori_id: 19-25) ---
            ['name' => 'Piutang Peternak', 'detail_kategori_id' => 19, 'deskripsi' => 'Tagihan pada peternak'],
            ['name' => 'Piutang Karyawan', 'detail_kategori_id' => 19, 'deskripsi' => 'Pinjaman karyawan'],
            ['name' => 'Piutang Pedagang', 'detail_kategori_id' => 19, 'deskripsi' => 'Tagihan pada pedagang'],
            ['name' => 'Supplier Bp.Supriyadi', 'detail_kategori_id' => 20, 'deskripsi' => 'Deposit/Saldo pada supplier'],
            ['name' => 'Piutang Tray Diamond /DM', 'detail_kategori_id' => 21, 'deskripsi' => 'Piutang tray Diamond'],
            ['name' => 'Piutang Tray Super Buah /SB', 'detail_kategori_id' => 21, 'deskripsi' => 'Piutang tray Super Buah'],
            ['name' => 'Piutang Tray Random', 'detail_kategori_id' => 21, 'deskripsi' => 'Piutang tray campuran'],
            ['name' => 'Piutang Obat SK', 'detail_kategori_id' => 22, 'deskripsi' => 'Piutang obat SK'],
            ['name' => 'Piutang Obat Ponggok', 'detail_kategori_id' => 22, 'deskripsi' => 'Piutang obat Ponggok'],
            ['name' => 'Piutang Obat Random', 'detail_kategori_id' => 22, 'deskripsi' => 'Piutang obat umum'],
            ['name' => 'Piutang Sentrat SK', 'detail_kategori_id' => 23, 'deskripsi' => 'Piutang pakan SK'],
            ['name' => 'Piutang Sentrat Ponggok', 'detail_kategori_id' => 23, 'deskripsi' => 'Piutang pakan Ponggok'],
            ['name' => 'Piutang Sentrat Random', 'detail_kategori_id' => 23, 'deskripsi' => 'Piutang pakan umum'],
            ['name' => 'Piutang Pakan Curah', 'detail_kategori_id' => 23, 'deskripsi' => 'Piutang pakan curah'],
            ['name' => 'Stok Telur', 'detail_kategori_id' => 24, 'deskripsi' => 'Persediaan telur'],
            ['name' => 'Stok Pakan', 'detail_kategori_id' => 24, 'deskripsi' => 'Persediaan pakan'],
            ['name' => 'Stok Pakan Curah', 'detail_kategori_id' => 24, 'deskripsi' => 'Persediaan pakan curah'],
            ['name' => 'Stok Obat-Obatan', 'detail_kategori_id' => 24, 'deskripsi' => 'Persediaan obat'],
            ['name' => 'Stok Tray', 'detail_kategori_id' => 24, 'deskripsi' => 'Persediaan tray'],
            ['name' => 'Stok Return', 'detail_kategori_id' => 24, 'deskripsi' => 'Persediaan barang return'],
            ['name' => 'Kas Tunai', 'detail_kategori_id' => 25, 'deskripsi' => 'Saldo uang tunai'],
            ['name' => 'Kas Deby', 'detail_kategori_id' => 25, 'deskripsi' => 'Uang tunai di Deby'],
            ['name' => 'Bank BCA Binti Wasilah', 'detail_kategori_id' => 26, 'deskripsi' => 'Saldo BCA Binti Wasilah'],
            ['name' => 'Bank BCA Masduki', 'detail_kategori_id' => 26, 'deskripsi' => 'Saldo BCA Masduki'],
            ['name' => 'Bank BRI Binti Wasilah', 'detail_kategori_id' => 27, 'deskripsi' => 'Saldo BRI Binti Wasilah'],
            ['name' => 'Bank BRI Masduki', 'detail_kategori_id' => 27, 'deskripsi' => 'Saldo BRI Masduki'],
            ['name' => 'Bank BNI Binti Wasilah', 'detail_kategori_id' => 28, 'deskripsi' => 'Saldo BNI Binti Wasilah'],
            ['name' => 'Bank BNI Bima Pratama', 'detail_kategori_id' => 28, 'deskripsi' => 'Saldo BNI Bima Pratama'],

            // --- LIABILITAS (detail_kategori_id: 29-33) ---
            ['name' => 'Hutang Peternak', 'detail_kategori_id' => 29, 'deskripsi' => 'Kewajiban pada peternak'],
            ['name' => 'Hutang Karyawan', 'detail_kategori_id' => 29, 'deskripsi' => 'Kewajiban pada karyawan'],
            ['name' => 'Hutang Pedagang', 'detail_kategori_id' => 29, 'deskripsi' => 'Kewajiban pada pedagang'],
            ['name' => 'Hutang Bank', 'detail_kategori_id' => 29, 'deskripsi' => 'Pinjaman bank'],
            ['name' => 'Saldo Bp.Supriyadi', 'detail_kategori_id' => 30, 'deskripsi' => 'Hutang saldo ke Bp. Supriyadi'],
            ['name' => 'Hutang Tray Diamond /DM', 'detail_kategori_id' => 31, 'deskripsi' => 'Kewajiban tray Diamond'],
            ['name' => 'Hutang Tray Super Buah /SB', 'detail_kategori_id' => 31, 'deskripsi' => 'Kewajiban tray Super Buah'],
            ['name' => 'Hutang Tray Random', 'detail_kategori_id' => 31, 'deskripsi' => 'Kewajiban tray random'],
            ['name' => 'Hutang Obat SK', 'detail_kategori_id' => 32, 'deskripsi' => 'Hutang obat SK'],
            ['name' => 'Hutang Obat Ponggok', 'detail_kategori_id' => 32, 'deskripsi' => 'Hutang obat Ponggok'],
            ['name' => 'Hutang Obat Random', 'detail_kategori_id' => 32, 'deskripsi' => 'Hutang obat umum'],
            ['name' => 'Hutang Sentrat SK', 'detail_kategori_id' => 33, 'deskripsi' => 'Hutang pakan SK'],
            ['name' => 'Hutang Sentrat Ponggok', 'detail_kategori_id' => 33, 'deskripsi' => 'Hutang pakan Ponggok'],
            ['name' => 'Hutang Sentrat Random', 'detail_kategori_id' => 33, 'deskripsi' => 'Hutang pakan umum'],
            ['name' => 'Hutang Pakan Curah', 'detail_kategori_id' => 33, 'deskripsi' => 'Hutang pakan curah'],

            // --- EKUITAS (detail_kategori_id: 34) ---
            ['name' => 'Modal', 'detail_kategori_id' => 34, 'deskripsi' => 'Saldo modal awal bisnis'],
            ['name' => 'Modal Awal', 'detail_kategori_id' => 34, 'deskripsi' => 'Data awal'],
        ];

        $saldoNormal = [
            'pendapatan' => 'kredit',
            'beban' => 'debit',
            'aset' => 'debit',
            'liabilitas' => 'kredit',
            'ekuitas' => 'kredit',
        ];

        $counter = $this->awalkanKodeCounter();

        foreach ($data as $item) {
            $kategori = Kategori::where('nama', $this->kategoriNama[$item['detail_kategori_id'] - 1])->firstOrFail();
            $jenis = $kategori->jenis;

            $akun = Akun::firstOrNew(['nama' => $item['name']]);

            $isNew = ! $akun->exists;

            // Kode hanya di-set saat akun baru dibuat agar re-seed tidak merenumerasi akun existing
            if ($isNew) {
                $akun->kode = $this->buatKode($jenis, $counter);
            } else {
                // Tetap konsumsi slot counter supaya urutan tidak bergeser untuk akun berikutnya
                $this->buatKode($jenis, $counter);
            }

            $akun->kategori_id = $kategori->id;
            $akun->saldo_normal = $saldoNormal[$jenis];
            $akun->system_code = $this->systemCode[$item['name']] ?? ($isNew ? null : $akun->system_code);
            $akun->status = 'aktif';
            $akun->save();
        }
    }

    /**
     * Menyiapkan counter kode per jenis berdasarkan kode akun tertinggi di database.
     *
     * @return array<string, int>
     */
    protected function awalkanKodeCounter(): array
    {
        $counter = [];

        foreach ($this->prefixJenis as $jenis => $prefix) {
            $kodeTerakhir = Akun::where('kode', 'like', $prefix.'%')->max('kode');

            $counter[$jenis] = $kodeTerakhir === null
                ? 1
                : ((int) substr($kodeTerakhir, -3)) + 1;
        }

        return $counter;
    }

    /**
     * @param  array<string, int>  $counter
     */
    protected function buatKode(string $jenis, array &$counter): string
    {
        $kode = $this->prefixJenis[$jenis].str_pad((string) $counter[$jenis], 3, '0', STR_PAD_LEFT);
        $counter[$jenis]++;

        return $kode;
    }
}
