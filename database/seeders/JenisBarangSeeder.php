<?php

namespace Database\Seeders;

use App\Models\JenisBarang;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class JenisBarangSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Data jenis barang real dari sistem lama. Kolom `kategori_id` di sumber
     * (59=Telur, 60=Pakan, 61=Obat, 62=Tray) dipetakan ke `kelompok` di DB kita.
     *
     * @var array<int, array{nama: string, kelompok: string, keterangan: string}>
     */
    private const DATA = [
        ['nama' => 'Telur Bebek', 'kelompok' => 'telur', 'keterangan' => 'Telur bebek'],
        ['nama' => 'Telur Horn', 'kelompok' => 'telur', 'keterangan' => 'Telur horn / kampung'],
        ['nama' => 'Telur Puyuh', 'kelompok' => 'telur', 'keterangan' => 'Telur puyuh'],
        ['nama' => 'Telur Arab', 'kelompok' => 'telur', 'keterangan' => 'Telur arab'],
        ['nama' => 'Telur Asin', 'kelompok' => 'telur', 'keterangan' => 'Telur asin'],
        ['nama' => 'Tray', 'kelompok' => 'tray', 'keterangan' => 'Tray tempat telur'],
        ['nama' => 'Obat-Obatan', 'kelompok' => 'obat', 'keterangan' => 'Obat & vitamin ternak'],
        ['nama' => 'Pakan Sentrat/Pabrikan', 'kelompok' => 'pakan', 'keterangan' => 'Pakan pabrikan / sentrat'],
        ['nama' => 'Pakan Curah', 'kelompok' => 'pakan', 'keterangan' => 'Pakan curah'],
        ['nama' => 'Pakan Kucing', 'kelompok' => 'pakan', 'keterangan' => 'Pakan kucing'],
    ];

    public function run(): void
    {
        foreach (self::DATA as $item) {
            JenisBarang::updateOrCreate(
                ['nama' => $item['nama']],
                [
                    'kelompok' => $item['kelompok'],
                    'keterangan' => $item['keterangan'],
                    'status' => 'aktif',
                ],
            );
        }
    }
}
