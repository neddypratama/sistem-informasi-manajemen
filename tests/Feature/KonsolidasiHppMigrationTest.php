<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Jurnal;
use App\Models\Kategori;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KonsolidasiHppMigrationTest extends TestCase
{
    use RefreshDatabase;

    private const AKUN_LAMA = [
        'HPP Telur Horn',
        'HPP Telur Bebek',
        'HPP Telur Puyuh',
        'HPP Telur Arab',
        'HPP Telur Asin',
        'HPP Tray',
        'HPP Obat-Obatan',
        'HPP Pakan Sentrat/Pabrikan',
        'HPP Pakan Curah',
        'HPP Pakan Kucing',
    ];

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    private function jalankanUp(): void
    {
        $migration = include database_path('migrations/2026_09_27_070356_konsolidasi_akun_hpp_lima_kelompok.php');
        $migration->up();
    }

    private function jalankanDown(): void
    {
        $migration = include database_path('migrations/2026_09_27_070356_konsolidasi_akun_hpp_lima_kelompok.php');
        $migration->down();
    }

    public function test_up_menggabungkan_akun_lama_menjadi_lima_akun_hpp(): void
    {
        // Kembalikan nama kategori Pakan Curah agar menyerupai DB sebelum migrasi
        $this->jalankanDown();

        $jurnal = Jurnal::create([
            'nomor_jurnal' => 'JNL-KONSOL',
            'tanggal' => '2026-09-01',
            'client_id' => null,
            'keterangan' => 'Jurnal uji konsolidasi HPP',
            'created_by' => $this->user->id,
        ]);

        $kodes = ['5001', '5002', '5003', '5004', '5005', '5006', '5007', '5008', '5009', '5010'];
        $debitLama = [
            'HPP Telur Horn' => 10000,
            'HPP Telur Bebek' => 5000,
            'HPP Pakan Sentrat/Pabrikan' => 7000,
            'HPP Pakan Kucing' => 3000,
        ];

        foreach (self::AKUN_LAMA as $index => $nama) {
            $kategori = Kategori::where('nama', $nama)->firstOrFail();
            $akun = Akun::create([
                'kode' => $kodes[$index],
                'nama' => $nama,
                'kategori_id' => $kategori->id,
                'saldo_normal' => 'debit',
                'system_code' => $nama === 'HPP Pakan Curah' ? 'hpp_pakan_curah' : null,
                'status' => 'aktif',
            ]);

            if (isset($debitLama[$nama])) {
                $jurnal->details()->create(['akun_id' => $akun->id, 'debit' => $debitLama[$nama], 'kredit' => 0]);
            }
        }

        $this->jalankanUp();

        // Akun lama yang digabung sudah tidak ada
        $this->assertSame(0, Akun::whereIn('nama', [
            'HPP Telur Horn',
            'HPP Telur Bebek',
            'HPP Telur Puyuh',
            'HPP Telur Arab',
            'HPP Telur Asin',
            'HPP Pakan Sentrat/Pabrikan',
            'HPP Pakan Kucing',
        ])->count());

        // 5 akun HPP akhir tersedia
        foreach (['HPP Pakan', 'HPP Telur', 'HPP Obat-Obatan', 'HPP Tray', 'HPP Curah'] as $nama) {
            $akun = Akun::where('nama', $nama)->first();
            $this->assertNotNull($akun, "Akun {$nama} harus tersedia");
            $this->assertSame('debit', $akun->saldo_normal);
            $this->assertSame('aktif', $akun->status);
        }

        $this->assertSame('hpp_pakan_curah', Akun::where('nama', 'HPP Curah')->firstOrFail()->system_code);

        // Saldo lama pindah ke akun target
        $this->assertSame(15000.0, (float) Akun::where('nama', 'HPP Telur')->firstOrFail()->jurnalDetails()->sum('debit'));
        $this->assertSame(10000.0, (float) Akun::where('nama', 'HPP Pakan')->firstOrFail()->jurnalDetails()->sum('debit'));
        $this->assertSame(0.0, (float) Akun::where('nama', 'HPP Tray')->firstOrFail()->jurnalDetails()->sum('debit'));

        // Tidak ada detail jurnal yang hilang
        $this->assertSame(4, $jurnal->details()->count());
        $this->assertSame(25000.0, (float) $jurnal->details()->sum('debit'));

        // Kategori per-jenis lama diganti kategori per-kelompok
        foreach (['HPP Telur Horn', 'HPP Telur Bebek', 'HPP Pakan Sentrat/Pabrikan', 'HPP Pakan Kucing', 'HPP Pakan Curah'] as $nama) {
            $this->assertNull(Kategori::where('nama', $nama)->first(), "Kategori {$nama} harus dihapus");
        }

        foreach (['HPP Pakan', 'HPP Telur', 'HPP Obat-Obatan', 'HPP Tray', 'HPP Curah'] as $nama) {
            $kategori = Kategori::where('nama', $nama)->first();
            $this->assertNotNull($kategori, "Kategori {$nama} harus tersedia");
            $this->assertSame('beban', $kategori->jenis);
        }

        $this->assertSame(
            Akun::where('nama', 'HPP Telur')->firstOrFail()->kategori_id,
            Kategori::where('nama', 'HPP Telur')->firstOrFail()->id,
        );
    }

    public function test_up_tanpa_akun_lama_tidak_membuat_akun_apa_pun(): void
    {
        $this->assertSame(0, Akun::count());

        $this->jalankanUp();

        // Lingkungan kosong (test/fresh install) tidak membuat akun sehingga
        // tidak ada potensi bentrok kode 5101 dengan data uji
        $this->assertSame(0, Akun::count());
    }

    public function test_up_merename_akun_dan_kategori_pakan_curah(): void
    {
        $this->jalankanDown();

        $kategoriCurah = Kategori::where('nama', 'HPP Pakan Curah')->firstOrFail();
        $akunCurah = Akun::create([
            'kode' => '5026',
            'nama' => 'HPP Pakan Curah',
            'kategori_id' => $kategoriCurah->id,
            'saldo_normal' => 'debit',
            'system_code' => 'hpp_pakan_curah',
            'status' => 'aktif',
        ]);

        $this->jalankanUp();

        $this->assertNull(Kategori::where('nama', 'HPP Pakan Curah')->first());
        $this->assertSame('HPP Curah', Kategori::where('id', $kategoriCurah->id)->firstOrFail()->nama);
        $this->assertSame('HPP Curah', $akunCurah->fresh()->nama);
        $this->assertSame('hpp_pakan_curah', $akunCurah->fresh()->system_code);
    }

    public function test_down_mengembalikan_nama_pakan_curah(): void
    {
        $this->jalankanDown();

        $kategoriCurah = Kategori::where('nama', 'HPP Pakan Curah')->firstOrFail();
        Akun::create([
            'kode' => '5026',
            'nama' => 'HPP Pakan Curah',
            'kategori_id' => $kategoriCurah->id,
            'saldo_normal' => 'debit',
            'system_code' => 'hpp_pakan_curah',
            'status' => 'aktif',
        ]);

        $this->jalankanUp();
        $this->jalankanDown();

        $this->assertNotNull(Akun::where('nama', 'HPP Pakan Curah')->first());
        $this->assertNotNull(Kategori::where('nama', 'HPP Pakan Curah')->first());
    }
}
