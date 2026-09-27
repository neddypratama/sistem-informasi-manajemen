<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Memisahkan akun Pakan Curah dari neraca umum:
     * - Rename "Stok Curah" → "Stok Pakan Curah" + system_code
     * - Tandai "Penjualan Pakan Curah" dengan system_code
     * - Tambahkan akun HPP, Piutang, dan Hutang Pakan Curah
     */
    public function up(): void
    {
        // 1. Rename Stok Curah → Stok Pakan Curah dan beri penanda
        DB::table('akuns')
            ->where('nama', 'Stok Curah')
            ->update([
                'nama' => 'Stok Pakan Curah',
                'system_code' => 'stok_pakan_curah',
            ]);

        // 2. Tandai Penjualan Pakan Curah
        DB::table('akuns')
            ->where('nama', 'Penjualan Pakan Curah')
            ->update(['system_code' => 'penjualan_pakan_curah']);

        // Ambil kategori_id yang dibutuhkan
        // Pakai kategori 'HPP Pakan Curah' (kategori per-jenis) karena kategori
        // generik 'HPP' mungkin sudah dihapus oleh migration pecah_kategori_hpp.
        $katHPP = DB::table('kategoris')->where('nama', 'HPP Pakan Curah')->value('id')
            ?? DB::table('kategoris')->where('nama', 'HPP')->value('id');
        $katPiutangPakan = DB::table('kategoris')->where('nama', 'Piutang Pakan')->value('id');
        $katHutangPakan = DB::table('kategoris')->where('nama', 'Hutang Pakan')->value('id');

        if ($katHPP === null || $katPiutangPakan === null || $katHutangPakan === null) {
            return; // Kategori belum tersedia (lingkungan test yang tidak pakai seeder lengkap)
        }

        $now = now();

        // 3. HPP Pakan Curah — kode 5026
        if (! DB::table('akuns')->where('nama', 'HPP Pakan Curah')->exists()) {
            DB::table('akuns')->insert([
                'kode' => '5026',
                'nama' => 'HPP Pakan Curah',
                'kategori_id' => $katHPP,
                'saldo_normal' => 'debit',
                'system_code' => 'hpp_pakan_curah',
                'status' => 'aktif',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // 4. Piutang Pakan Curah — kode 1028
        if (! DB::table('akuns')->where('nama', 'Piutang Pakan Curah')->exists()) {
            DB::table('akuns')->insert([
                'kode' => '1028',
                'nama' => 'Piutang Pakan Curah',
                'kategori_id' => $katPiutangPakan,
                'saldo_normal' => 'debit',
                'system_code' => 'piutang_pakan_curah',
                'status' => 'aktif',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // 5. Hutang Pakan Curah — kode 2016
        if (! DB::table('akuns')->where('nama', 'Hutang Pakan Curah')->exists()) {
            DB::table('akuns')->insert([
                'kode' => '2016',
                'nama' => 'Hutang Pakan Curah',
                'kategori_id' => $katHutangPakan,
                'saldo_normal' => 'kredit',
                'system_code' => 'hutang_pakan_curah',
                'status' => 'aktif',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        // Kembalikan nama dan hapus system_code
        DB::table('akuns')
            ->where('nama', 'Stok Pakan Curah')
            ->where('system_code', 'stok_pakan_curah')
            ->update([
                'nama' => 'Stok Curah',
                'system_code' => null,
            ]);

        DB::table('akuns')
            ->where('system_code', 'penjualan_pakan_curah')
            ->update(['system_code' => null]);

        // Hapus 3 akun baru (hanya jika belum punya jurnal)
        foreach (['hpp_pakan_curah', 'piutang_pakan_curah', 'hutang_pakan_curah'] as $code) {
            $id = DB::table('akuns')->where('system_code', $code)->value('id');
            if ($id && ! DB::table('jurnal_details')->where('akun_id', $id)->exists()) {
                DB::table('akuns')->where('id', $id)->delete();
            }
        }
    }
};
