<?php

namespace App\Services;

use App\Models\LogAktivitas;

class LogAktivitasService
{
    public static function catat(string $modul, string $aksi, string $deskripsi, ?string $referensi = null): void
    {
        $userId = auth()->id();

        if (! $userId) {
            return;
        }

        LogAktivitas::query()->create([
            'user_id' => $userId,
            'modul' => $modul,
            'aksi' => $aksi,
            'deskripsi' => $deskripsi,
            'referensi' => $referensi,
        ]);
    }
}
