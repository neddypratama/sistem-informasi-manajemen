<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Daftar jenis barang yang memiliki akun HPP tersendiri.
     *
     * @var list<string>
     */
    private const JENIS_HPP = [
        'Telur Horn',
        'Telur Bebek',
        'Telur Puyuh',
        'Telur Arab',
        'Telur Asin',
        'Tray',
        'Obat-Obatan',
        'Pakan Sentrat/Pabrikan',
        'Pakan Curah',
        'Pakan Kucing',
    ];

    public function up(): void
    {
        $now = now();

        // 1. Buat 10 kategori HPP per jenis (idempotent)
        foreach (self::JENIS_HPP as $jenis) {
            DB::table('kategoris')->insertOrIgnore([
                'nama' => 'HPP '.$jenis,
                'jenis' => 'beban',
                'keterangan' => 'Harga Pokok Penjualan '.$jenis,
                'status' => 'aktif',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // 2. Pindahkan setiap akun "HPP {jenis}" ke kategori barunya
        foreach (self::JENIS_HPP as $jenis) {
            $katId = DB::table('kategoris')->where('nama', 'HPP '.$jenis)->value('id');
            if ($katId === null) {
                continue;
            }

            DB::table('akuns')
                ->where('nama', 'HPP '.$jenis)
                ->update(['kategori_id' => $katId, 'updated_at' => $now]);
        }

        // 3. Hapus akun generik "HPP" hanya bila tidak memiliki jurnal
        $akunGenerikId = DB::table('akuns')->where('nama', 'HPP')->whereNull('system_code')->value('id');
        if ($akunGenerikId && ! DB::table('jurnal_details')->where('akun_id', $akunGenerikId)->exists()) {
            DB::table('akuns')->where('id', $akunGenerikId)->delete();
        }

        // 4. Hapus kategori "HPP" hanya bila sudah tidak ada akun yang mereferensinya
        $katHppId = DB::table('kategoris')->where('nama', 'HPP')->value('id');
        if ($katHppId && ! DB::table('akuns')->where('kategori_id', $katHppId)->exists()) {
            DB::table('kategoris')->where('id', $katHppId)->delete();
        }
    }

    public function down(): void
    {
        $now = now();

        // Pastikan kategori generik HPP ada kembali
        DB::table('kategoris')->insertOrIgnore([
            'nama' => 'HPP',
            'jenis' => 'beban',
            'keterangan' => 'Harga Pokok Penjualan',
            'status' => 'aktif',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $katHppId = DB::table('kategoris')->where('nama', 'HPP')->value('id');

        // Kembalikan 10 akun HPP ke kategori generik
        foreach (self::JENIS_HPP as $jenis) {
            DB::table('akuns')
                ->where('nama', 'HPP '.$jenis)
                ->update(['kategori_id' => $katHppId, 'updated_at' => $now]);
        }

        // Hapus 10 kategori per-jenis hanya bila sudah kosong
        foreach (self::JENIS_HPP as $jenis) {
            $katId = DB::table('kategoris')->where('nama', 'HPP '.$jenis)->value('id');
            if ($katId && ! DB::table('akuns')->where('kategori_id', $katId)->exists()) {
                DB::table('kategoris')->where('id', $katId)->delete();
            }
        }
    }
};
