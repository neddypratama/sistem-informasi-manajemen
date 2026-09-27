<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Kategori;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class LaporanLabaRugiTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $akuns = $this->buatAkunSistem();
        $this->buatAkunDetail($akuns);
    }

    public function test_akun_tanpa_mutasi_tetap_muncul_dengan_saldo_nol(): void
    {
        $kategoriPendapatan = Kategori::where('jenis', 'pendapatan')->firstOrFail();
        $kategoriBeban = Kategori::where('jenis', 'beban')->firstOrFail();

        Akun::create([
            'kode' => '4901',
            'nama' => 'Pendapatan Contoh',
            'kategori_id' => $kategoriPendapatan->id,
            'saldo_normal' => 'kredit',
            'status' => 'aktif',
        ]);
        Akun::create([
            'kode' => '5901',
            'nama' => 'Beban Contoh',
            'kategori_id' => $kategoriBeban->id,
            'saldo_normal' => 'debit',
            'status' => 'aktif',
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/laba-rugi?dari=2026-01-01&sampai=2026-12-31')
            ->assertOk();

        $pendapatan = collect($response->json('pendapatan'))->keyBy('akun.nama');
        $beban = collect($response->json('beban'))->keyBy('akun.nama');

        // Akun tanpa jurnal tetap ditampilkan dengan saldo 0
        $this->assertArrayHasKey('Pendapatan Contoh', $pendapatan);
        $this->assertArrayHasKey('Beban Contoh', $beban);
        $this->assertSame(0.0, (float) $pendapatan['Pendapatan Contoh']['saldo']);
        $this->assertSame(0.0, (float) $beban['Beban Contoh']['saldo']);

        // Semua akun pendapatan/beban aktif ikut terhitung pada total
        $this->assertSame(
            (float) $pendapatan->sum(fn (array $row) => (float) $row['saldo']),
            (float) $response->json('totalPendapatan'),
        );
        $this->assertSame(
            (float) $beban->sum(fn (array $row) => (float) $row['saldo']),
            (float) $response->json('totalBeban'),
        );
        $this->assertSame(
            (float) $response->json('totalPendapatan') - (float) $response->json('totalBeban'),
            (float) $response->json('labaBersih'),
        );
    }

    public function test_total_laba_rugi_hanya_menghitung_akun_aktif(): void
    {
        $kategoriPendapatan = Kategori::where('jenis', 'pendapatan')->firstOrFail();
        $kategoriBeban = Kategori::where('jenis', 'beban')->firstOrFail();

        Akun::create([
            'kode' => '4902',
            'nama' => 'Pendapatan Nonaktif',
            'kategori_id' => $kategoriPendapatan->id,
            'saldo_normal' => 'kredit',
            'status' => 'nonaktif',
        ]);
        Akun::create([
            'kode' => '5902',
            'nama' => 'Beban Nonaktif',
            'kategori_id' => $kategoriBeban->id,
            'saldo_normal' => 'debit',
            'status' => 'nonaktif',
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/laba-rugi?dari=2026-01-01&sampai=2026-12-31')
            ->assertOk();

        $pendapatanNama = collect($response->json('pendapatan'))->pluck('akun.nama')->all();
        $bebanNama = collect($response->json('beban'))->pluck('akun.nama')->all();

        $this->assertNotContains('Pendapatan Nonaktif', $pendapatanNama);
        $this->assertNotContains('Beban Nonaktif', $bebanNama);
    }

    public function test_akun_curah_dikecualikan_dari_laba_rugi_umum(): void
    {
        $pendapatanNama = collect(
            $this->actingAsApi($this->user)
                ->getJson('/api/laporan/laba-rugi?dari=2026-01-01&sampai=2026-12-31')
                ->assertOk()
                ->json('pendapatan'),
        )->pluck('akun.nama')->all();
        $bebanNama = collect(
            $this->actingAsApi($this->user)
                ->getJson('/api/laporan/laba-rugi?dari=2026-01-01&sampai=2026-12-31')
                ->assertOk()
                ->json('beban'),
        )->pluck('akun.nama')->all();

        $this->assertNotContains('Penjualan Pakan Curah', $pendapatanNama);
        $this->assertNotContains('HPP Curah', $bebanNama);
    }
}
