<?php

namespace Database\Seeders;

use App\Models\Kategori;
use Illuminate\Database\Seeder;

class KategoriSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $jenisMap = [
            'Pendapatan' => 'pendapatan',
            'Pengeluaran' => 'beban',
            'Aset' => 'aset',
            'Liabilitas' => 'liabilitas',
            'Ekuitas' => 'ekuitas',
        ];

        $data = [
            // --- PENDAPATAN ---
            ['name' => 'Penjualan Telur', 'type' => 'Pendapatan', 'deskripsi' => 'Penjualan Telur Horn, Bebek, Puyuh, Arab, Asin'],
            ['name' => 'Penjualan Pakan', 'type' => 'Pendapatan', 'deskripsi' => 'Penjualan Pakan Sentrat, Kucing, Curah'],
            ['name' => 'Penjualan Obat', 'type' => 'Pendapatan', 'deskripsi' => 'Penjualan Obat-Obatan'],
            ['name' => 'Penjualan EggTray', 'type' => 'Pendapatan', 'deskripsi' => 'Penjualan EggTray'],
            ['name' => 'Pendapatan Perlengkapan', 'type' => 'Pendapatan', 'deskripsi' => 'Penjualan Triplex, Terpal, Ban Bekas, Sak Campur, Tali'],
            ['name' => 'Pendapatan Non Penjualan', 'type' => 'Pendapatan', 'deskripsi' => 'Telur Reject, Transport Setoran, Transport Pedagang'],
            ['name' => 'Penjualan Lain-Lain', 'type' => 'Pendapatan', 'deskripsi' => 'Penjualan Lain-Lain'],
            ['name' => 'Pendapatan Truk', 'type' => 'Pendapatan', 'deskripsi' => 'Pendapatan Truk'],
            ['name' => 'Pendapatan Pengadaan', 'type' => 'Pendapatan', 'deskripsi' => 'Pendapatan Pengadaan Jasa'],

            // --- PENGELUARAN ---
            ['name' => 'Beban Transport', 'type' => 'Pengeluaran', 'deskripsi' => 'Beban Transport, Beban BBM, Biaya Servis'],
            ['name' => 'Beban Bunga & Pajak', 'type' => 'Pengeluaran', 'deskripsi' => 'Beban Bunga, Pajak Kendaraan, Pajak Pendapatan'],
            ['name' => 'Beban Operasional', 'type' => 'Pengeluaran', 'deskripsi' => 'Beban Gaji, Kantor, Konsumsi, Beban TAL'],
            ['name' => 'Beban Produksi', 'type' => 'Pengeluaran', 'deskripsi' => 'Beban Telur Bentes, Ceplok, Prok, Telur Kotor, Telur Jumbo, Tray Terpakai'],
            ['name' => 'Beban Lain-Lain', 'type' => 'Pengeluaran', 'deskripsi' => 'Beban Barang Kadaluarsa, Beban Lain-Lain'],
            ['name' => 'Beban Sedekah', 'type' => 'Pengeluaran', 'deskripsi' => 'ZIS (Zakat, Infaq, Sedekah)'],
            ['name' => 'HPP Telur', 'type' => 'Pengeluaran', 'deskripsi' => 'Harga Pokok Penjualan Telur'],
            ['name' => 'HPP Tray', 'type' => 'Pengeluaran', 'deskripsi' => 'Harga Pokok Penjualan Tray'],
            ['name' => 'HPP Obat-Obatan', 'type' => 'Pengeluaran', 'deskripsi' => 'Harga Pokok Penjualan Obat-Obatan'],
            ['name' => 'HPP Pakan', 'type' => 'Pengeluaran', 'deskripsi' => 'Harga Pokok Penjualan Pakan'],
            ['name' => 'HPP Curah', 'type' => 'Pengeluaran', 'deskripsi' => 'Harga Pokok Penjualan Pakan Curah'],
            ['name' => 'Pengeluaran Truk', 'type' => 'Pengeluaran', 'deskripsi' => 'Pengeluaran Truk'],
            ['name' => 'Pengeluaran Pengadaan', 'type' => 'Pengeluaran', 'deskripsi' => 'Pengeluaran Pengadaan Jasa'],

            // --- ASET ---
            ['name' => 'Piutang Pihak Lain', 'type' => 'Aset', 'deskripsi' => 'Piutang Peternak, Karyawan, Pedagang'],
            ['name' => 'Piutang Supplier', 'type' => 'Aset', 'deskripsi' => 'Piutang Supplier Bp.Supriyadi'],
            ['name' => 'Piutang Tray', 'type' => 'Aset', 'deskripsi' => 'Piutang Tray Diamond, Super Buah, Random'],
            ['name' => 'Piutang Obat', 'type' => 'Aset', 'deskripsi' => 'Piutang Obat SK, Ponggok, Random, P Atok'],
            ['name' => 'Piutang Pakan', 'type' => 'Aset', 'deskripsi' => 'Piutang Sentrat SK, Ponggok, Random, Polet SK'],
            ['name' => 'Stok', 'type' => 'Aset', 'deskripsi' => 'Stok Telur, Pakan, Obat, Tray, Return'],
            ['name' => 'Kas', 'type' => 'Aset', 'deskripsi' => 'Kas Tunai, Kas Deby'],
            ['name' => 'Bank BCA', 'type' => 'Aset', 'deskripsi' => 'Bank BCA Binti Wasilah, Masduki'],
            ['name' => 'Bank BRI', 'type' => 'Aset', 'deskripsi' => 'Bank BRI Binti Wasilah, Masduki'],
            ['name' => 'Bank BNI', 'type' => 'Aset', 'deskripsi' => 'Bank BNI Binti Wasilah, Bima Pratama'],

            // --- LIABILITAS ---
            ['name' => 'Hutang Pihak Lain', 'type' => 'Liabilitas', 'deskripsi' => 'Hutang Peternak, Karyawan, Pedagang, Bank'],
            ['name' => 'Hutang Supplier', 'type' => 'Liabilitas', 'deskripsi' => 'Saldo Bp.Supriyadi'],
            ['name' => 'Hutang Tray', 'type' => 'Liabilitas', 'deskripsi' => 'Hutang Tray Diamond, Super Buah, Random'],
            ['name' => 'Hutang Obat', 'type' => 'Liabilitas', 'deskripsi' => 'Hutang Obat SK, Ponggok, Random, P Atok'],
            ['name' => 'Hutang Pakan', 'type' => 'Liabilitas', 'deskripsi' => 'Hutang Sentrat SK, Ponggok, Random, Polet SK'],

            // --- EKUITAS ---
            ['name' => 'Modal', 'type' => 'Ekuitas', 'deskripsi' => 'Modal Awal'],
        ];

        foreach ($data as $item) {
            Kategori::updateOrCreate(
                ['nama' => $item['name']],
                [
                    'jenis' => $jenisMap[$item['type']],
                    'keterangan' => $item['deskripsi'],
                    'status' => 'aktif',
                ],
            );
        }
    }
}
