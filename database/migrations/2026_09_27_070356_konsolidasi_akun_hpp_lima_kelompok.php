<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Peta 10 akun HPP per jenis barang ke 5 akun HPP per kelompok.
     *
     * @var array<string, string>
     */
    private const PETA_LAMA = [
        'HPP Telur Horn' => 'HPP Telur',
        'HPP Telur Bebek' => 'HPP Telur',
        'HPP Telur Puyuh' => 'HPP Telur',
        'HPP Telur Arab' => 'HPP Telur',
        'HPP Telur Asin' => 'HPP Telur',
        'HPP Tray' => 'HPP Tray',
        'HPP Obat-Obatan' => 'HPP Obat-Obatan',
        'HPP Pakan Sentrat/Pabrikan' => 'HPP Pakan',
        'HPP Pakan Kucing' => 'HPP Pakan',
    ];

    /**
     * Konsolidasi akun HPP menjadi 5 akun: HPP Pakan, HPP Telur,
     * HPP Obat-Obatan, HPP Tray, dan HPP Curah (akun sistem pakcurah).
     *
     * Seluruh jurnal detail dari akun lama dipindahkan ke akun target
     * sebelum akun lama dihapus, sehingga saldo dan keseimbangan jurnal
     * tidak berubah.
     */
    public function up(): void
    {
        $this->renameCurah(true);

        $akunLama = DB::table('akuns')
            ->whereIn('nama', array_keys(self::PETA_LAMA))
            ->get(['id', 'nama']);

        if ($akunLama->isEmpty()) {
            // Lingkungan tanpa akun HPP lama (mis. test atau instalasi baru):
            // akun dibuat oleh JurnalService saat transaksi pertama.
            return;
        }

        foreach (array_unique(array_values(self::PETA_LAMA)) as $namaTarget) {
            $this->siapkanAkunHpp($namaTarget);
        }

        foreach ($akunLama as $baris) {
            $namaTarget = self::PETA_LAMA[$baris->nama];

            if ($namaTarget === $baris->nama) {
                continue;
            }

            $targetId = DB::table('akuns')->where('nama', $namaTarget)->value('id');

            if ($targetId === null) {
                continue;
            }

            DB::table('jurnal_details')->where('akun_id', $baris->id)->update(['akun_id' => $targetId]);
            DB::table('akuns')->where('id', $baris->id)->delete();
        }

        foreach (array_keys(self::PETA_LAMA) as $namaLama) {
            $kategoriId = DB::table('kategoris')->where('nama', $namaLama)->value('id');

            if ($kategoriId !== null && ! DB::table('akuns')->where('kategori_id', $kategoriId)->exists()) {
                DB::table('kategoris')->where('id', $kategoriId)->delete();
            }
        }
    }

    /**
     * Mengembalikan nama akun & kategori Pakan Curah. Saldo yang sudah
     * digabung ke 5 akun HPP tidak dapat dipecah kembali ke 10 akun lama.
     */
    public function down(): void
    {
        $this->renameCurah(false);
    }

    /**
     * Rename akun dan kategori Pakan Curah antara "HPP Pakan Curah" dan
     * "HPP Curah".
     */
    private function renameCurah(bool $keCurah): void
    {
        $dari = $keCurah ? 'HPP Pakan Curah' : 'HPP Curah';
        $ke = $keCurah ? 'HPP Curah' : 'HPP Pakan Curah';

        $kategoriLamaId = DB::table('kategoris')->where('nama', $dari)->value('id');

        if ($kategoriLamaId !== null) {
            $kategoriBaruId = DB::table('kategoris')->where('nama', $ke)->value('id');

            if ($kategoriBaruId === null) {
                DB::table('kategoris')->where('id', $kategoriLamaId)->update([
                    'nama' => $ke,
                    'keterangan' => 'Harga Pokok Penjualan Pakan Curah',
                ]);
            } else {
                DB::table('akuns')->where('kategori_id', $kategoriLamaId)->update(['kategori_id' => $kategoriBaruId]);
                DB::table('kategoris')->where('id', $kategoriLamaId)->delete();
            }
        }

        DB::table('akuns')->where('nama', $dari)->update(['nama' => $ke]);
    }

    /**
     * Buat kategori (bila perlu) dan akun HPP target.
     */
    private function siapkanAkunHpp(string $nama): void
    {
        $now = now();

        $kategoriId = DB::table('kategoris')->where('nama', $nama)->value('id');

        if ($kategoriId === null) {
            DB::table('kategoris')->insert([
                'nama' => $nama,
                'jenis' => 'beban',
                'keterangan' => 'Harga Pokok Penjualan '.substr($nama, 4),
                'status' => 'aktif',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $kategoriId = DB::table('kategoris')->where('nama', $nama)->value('id');
        }

        if (DB::table('akuns')->where('nama', $nama)->exists()) {
            return;
        }

        DB::table('akuns')->insert([
            'kode' => $this->kodeBebanBaru(),
            'nama' => $nama,
            'kategori_id' => $kategoriId,
            'saldo_normal' => 'debit',
            'system_code' => null,
            'status' => 'aktif',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * Kode akun beban berikutnya yang belum terpakai (pola 5xxx).
     */
    private function kodeBebanBaru(): string
    {
        $terakhir = DB::table('akuns')->where('kode', 'like', '5%')->max('kode');
        $urutan = $terakhir === null ? 1 : ((int) substr($terakhir, -3)) + 1;

        do {
            $kode = '5'.str_pad((string) $urutan, 3, '0', STR_PAD_LEFT);
            $urutan++;
        } while (DB::table('akuns')->where('kode', $kode)->exists());

        return $kode;
    }
};
