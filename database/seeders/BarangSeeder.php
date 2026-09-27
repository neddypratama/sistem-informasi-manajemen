<?php

namespace Database\Seeders;

use App\Models\Barang;
use App\Models\JenisBarang;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use RuntimeException;

class BarangSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Urutan prioritas satuan saat beberapa unit muncul dalam satu nama
     * (mis. 'SAK 25 KG' -> sak). Pola kecocokan juga menangkap unit yang
     * menempel pada angka ('500ml', '1KG', '90kp').
     *
     * @var array<int, string>
     */
    private const SATUAN_PRIORITAS = ['sak', 'dus', 'bks', 'kp', 'ml', 'gr', 'kg', 'bj', 'ltr', 'lt', 'pcs', 'pes'];

    private function defaultSatuan(string $kelompok): string
    {
        return match ($kelompok) {
            'telur' => 'kg',
            'pakan' => 'kg',
            'obat' => 'gr',
            default => 'pes',
        };
    }

    private function inferSatuan(string $namaBarang, string $kelompok): string
    {
        foreach (self::SATUAN_PRIORITAS as $satuan) {
            if (preg_match('/\b(?:[0-9]*\s*)?'.$satuan.'\b/i', $namaBarang)) {
                return $satuan;
            }
        }

        return $this->defaultSatuan($kelompok);
    }

    /**
     * Barang real dari sistem lama. Menerima ekspor phpMyAdmin
     * (entry `type=table`, `name=barangs`, baris di `data`) maupun array biasa
     * `['id' => ..., 'name' => ..., 'jenis_id' => ...]`.
     */
    public function run(): void
    {
        $candidates = [
            database_path('seeders/barangs.json'),
            database_path('seeders/data/barang.json'),
        ];

        $file = collect($candidates)->first(fn ($path) => file_exists($path));

        if ($file === null) {
            $this->command?->warn('Seeder Barang dilewati: file barang tidak ditemukan (barangs.json / data/barang.json).');

            return;
        }

        $raw = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);

        $items = $this->extractRows($raw);

        if ($items === []) {
            $this->command?->warn('Seeder Barang dilewati: tidak ada baris barang di '.$file.'.');

            return;
        }

        $jenisById = JenisBarang::orderBy('id')->get()->keyBy('id');

        foreach ($items as $item) {
            $id = $item['id'] ?? null;
            $name = isset($item['name']) ? trim((string) $item['name']) : null;
            $jenisId = $item['jenis_id'] ?? null;

            if ($id === null || ! is_string($name) || $name === '' || $jenisId === null) {
                throw new RuntimeException('Baris barang tidak valid: '.json_encode($item));
            }

            $jenis = $jenisById->get((int) $jenisId);

            if (! $jenis instanceof JenisBarang) {
                throw new RuntimeException("Barang '{$name}' merujuk jenis_id {$jenisId} yang tidak dikenal.");
            }

            $kodeBarang = sprintf('BRG-%03d', (int) $id);

            Barang::updateOrCreate(
                ['kode_barang' => $kodeBarang],
                [
                    'jenis_barang_id' => $jenis->id,
                    'nama_barang' => $name,
                    'satuan' => $item['satuan'] ?? $this->inferSatuan($name, (string) $jenis->kelompok),
                    'status' => 'aktif',
                ],
            );
        }
    }

    /**
     * Ekstrak daftar baris barang dari struktur JSON mentah.
     *
     * @return array<int, array<string, mixed>>
     */
    private function extractRows(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }

        $tables = array_values(array_filter(
            $raw,
            static fn ($entry): bool => is_array($entry) && ($entry['type'] ?? null) === 'table' && ($entry['name'] ?? null) === 'barangs',
        ));

        if ($tables !== []) {
            return array_values(array_filter($tables[0]['data'] ?? [], 'is_array'));
        }

        return array_values(array_filter($raw, 'is_array'));
    }
}
