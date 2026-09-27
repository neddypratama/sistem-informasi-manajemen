<?php

namespace Database\Seeders;

use App\Models\Akun;
use App\Models\Kategori;
use Illuminate\Database\Seeder;

class AkunSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $kategori = $this->kategori();

        $accounts = [
            // Aset
            ['kode' => '1101', 'nama' => 'Kas', 'kategori' => 'aset', 'saldo_normal' => 'debit', 'system_code' => 'kas'],
            ['kode' => '1102', 'nama' => 'Piutang Usaha', 'kategori' => 'aset', 'saldo_normal' => 'debit', 'system_code' => 'piutang'],
            ['kode' => '1201', 'nama' => 'Persediaan Barang', 'kategori' => 'aset', 'saldo_normal' => 'debit', 'system_code' => 'stok'],

            // Liabilitas
            ['kode' => '2101', 'nama' => 'Hutang Usaha', 'kategori' => 'liabilitas', 'saldo_normal' => 'kredit', 'system_code' => 'hutang'],

            // Pendapatan
            ['kode' => '4101', 'nama' => 'Penjualan', 'kategori' => 'pendapatan', 'saldo_normal' => 'kredit', 'system_code' => 'penjualan'],

            // Beban
            ['kode' => '5101', 'nama' => 'Harga Pokok Penjualan', 'kategori' => 'beban', 'saldo_normal' => 'debit', 'system_code' => 'hpp'],
            ['kode' => '5102', 'nama' => 'Selisih Stok', 'kategori' => 'beban', 'saldo_normal' => 'debit', 'system_code' => 'selisih_stok'],
        ];

        foreach ($accounts as $item) {
            $jenis = $item['kategori'];
            $item['kategori_id'] = $kategori[$jenis];
            unset($item['kategori']);

            Akun::updateOrCreate(
                ['kode' => $item['kode']],
                $item,
            );
        }
    }

    /**
     * Membuat kategori akun standar dan mengembalikan pemetaan nama-jenis ke id.
     *
     * @return array<string, int>
     */
    protected function kategori(): array
    {
        $definitions = [
            'aset' => 'Aset',
            'liabilitas' => 'Liabilitas',
            'pendapatan' => 'Pendapatan',
            'beban' => 'Beban',
        ];

        $map = [];

        foreach ($definitions as $jenis => $nama) {
            $kategori = Kategori::updateOrCreate(
                ['nama' => $nama],
                ['jenis' => $jenis, 'keterangan' => "Kategori $nama", 'status' => 'aktif'],
            );
            $map[$jenis] = $kategori->id;
        }

        return $map;
    }
}
