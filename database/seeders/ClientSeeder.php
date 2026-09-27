<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $path = database_path('seeders/clients.json');
        $raw = json_decode(file_get_contents($path), true);

        $rows = $this->extractRows($raw);

        foreach ($rows as $row) {
            Client::updateOrCreate(
                ['id' => (int) $row['id']],
                [
                    'nama' => trim($row['name']),
                    'alamat' => trim($row['alamat'] ?? ''),
                    'no_telepon' => null,
                    'tipe' => $row['type'],
                    'keterangan' => $row['keterangan'] ?? null,
                    'status' => 'aktif',
                ],
            );
        }
    }

    /**
     * Ekstrak baris data dari format ekspor phpMyAdmin JSON.
     *
     * @param  array<int, mixed>  $raw
     * @return array<int, array<string, mixed>>
     */
    protected function extractRows(array $raw): array
    {
        foreach ($raw as $entry) {
            if (
                is_array($entry)
                && ($entry['type'] ?? '') === 'table'
                && ($entry['name'] ?? '') === 'clients'
                && isset($entry['data'])
            ) {
                return $entry['data'];
            }
        }

        return [];
    }
}
