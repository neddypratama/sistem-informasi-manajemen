<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Client;
use App\Models\Jurnal;
use App\Models\Transaksi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

/**
 * Modul Arus Kas dan Ringkasan Aktivitas Hari Ini pada dashboard. Arus kas
 * mengikuti filter periode, sedangkan aktivitas selalu dihitung untuk hari
 * ini menurut zona WIB.
 */
class DashboardArusAktivitasTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->buatAkunSistem();
        $this->client = $this->buatClient('Supplier A', 'supplier');
    }

    /**
     * Jurnal dua sisi yang menyentuh akun kas (debit = pemasukan kas).
     */
    private function buatJurnalKas(float $debit, float $kredit, string $tanggal = '2026-08-10'): Jurnal
    {
        $jurnal = Jurnal::create([
            'nomor_jurnal' => 'JNL-'.uniqid(),
            'tanggal' => $tanggal,
            'client_id' => null,
            'keterangan' => 'Jurnal kas uji',
            'created_by' => $this->user->id,
        ]);

        $jurnal->details()->create(['akun_id' => Akun::system('kas')->id, 'debit' => $debit, 'kredit' => 0]);
        $jurnal->details()->create(['akun_id' => Akun::system('hutang')->id, 'debit' => 0, 'kredit' => $debit]);
        $jurnal->details()->create(['akun_id' => Akun::system('stok')->id, 'debit' => $kredit, 'kredit' => 0]);
        $jurnal->details()->create(['akun_id' => Akun::system('kas')->id, 'debit' => 0, 'kredit' => $kredit]);

        return $jurnal;
    }

    private function buatTransaksi(string $tanggal): Transaksi
    {
        return Transaksi::create([
            'nomor_transaksi' => 'PB-'.strtoupper(substr(uniqid(), -8)),
            'tanggal' => $tanggal,
            'tipe_transaksi' => 'pembelian',
            'metode_pembayaran' => 'kredit',
            'client_id' => $this->client->id,
            'total' => 100000,
            'keterangan' => 'Transaksi uji aktivitas',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_arus_kas_menjumlahkan_pemasukan_dan_pengeluaran_kas(): void
    {
        $this->buatJurnalKas(50000, 0, '2026-08-10');
        // Jurnal hari terakhir periode wajib tetap terhitung.
        $this->buatJurnalKas(0, 20000, '2026-08-31');

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/dashboard?preset=custom&dari=2026-08-01&sampai=2026-08-31')
            ->assertOk();

        $response->assertJsonPath('arusKas.pemasukan', fn ($value) => $value == 50000)
            ->assertJsonPath('arusKas.pengeluaran', fn ($value) => $value == 20000)
            ->assertJsonPath('arusKas.bersih', fn ($value) => $value == 30000);

        $labels = $response->json('chart.labels');
        $pemasukan = $response->json('arusKas.pemasukanSeries');
        $pengeluaran = $response->json('arusKas.pengeluaranSeries');

        $this->assertCount(count($labels), $pemasukan);
        $this->assertCount(count($labels), $pengeluaran);
        $this->assertEquals(50000, array_sum($pemasukan));
        $this->assertEquals(20000, array_sum($pengeluaran));

        $puncak = $response->json('arusKas.puncak');
        $this->assertIsArray($puncak);
        $this->assertContains($puncak['label'], $labels);
        $this->assertGreaterThan(0, $puncak['nilai']);
    }

    public function test_arus_kas_mengikuti_filter_periode_dashboard(): void
    {
        $this->buatJurnalKas(50000, 0, '2026-09-15');

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard?preset=custom&dari=2026-08-01&sampai=2026-08-31')
            ->assertOk()
            ->assertJsonPath('arusKas.pemasukan', fn ($value) => $value == 0)
            ->assertJsonPath('arusKas.pengeluaran', fn ($value) => $value == 0)
            ->assertJsonPath('arusKas.bersih', fn ($value) => $value == 0)
            ->assertJsonPath('arusKas.puncak', null);
    }

    public function test_aktivitas_hari_ini_hanya_menghitung_transaksi_hari_ini(): void
    {
        $tanggalHariIni = Carbon::now('Asia/Jakarta')->toDateString();
        $tanggalKemarin = Carbon::now('Asia/Jakarta')->subDay()->toDateString();

        $this->buatTransaksi($tanggalHariIni);
        $this->buatTransaksi($tanggalKemarin);
        $this->buatBarang();

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('aktivitasHariIni.tanggal', $tanggalHariIni)
            ->assertJsonPath('aktivitasHariIni.transaksi.jumlah', 1)
            ->assertJsonPath('aktivitasHariIni.transaksi.total', fn ($value) => $value == 100000)
            ->assertJsonPath('aktivitasHariIni.barangAktif', 1)
            ->assertJsonPath('aktivitasHariIni.clientAktif', 1)
            ->assertJsonPath('aktivitasHariIni.auditTerakhir', null);
    }

    public function test_aktivitas_menghitung_client_dengan_hutang_lebih_besar(): void
    {
        $this->buatHutang($this->client, 100000, $this->user);
        $this->buatPiutang($this->client, 30000, $this->user);

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('aktivitasHariIni.hutangLebihBesar.jumlah', 1)
            ->assertJsonPath('aktivitasHariIni.hutangLebihBesar.selisih', fn ($value) => $value == 70000);
    }

    public function test_aktivitas_mendeteksi_jurnal_tidak_seimbang(): void
    {
        $this->buatJurnalKas(50000, 0);

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('aktivitasHariIni.jurnal.seimbang', true)
            ->assertJsonPath('aktivitasHariIni.jurnal.tidakSeimbang', 0);

        $miring = Jurnal::create([
            'nomor_jurnal' => 'JNL-'.uniqid(),
            'tanggal' => '2026-08-10',
            'client_id' => null,
            'keterangan' => 'Jurnal miring uji',
            'created_by' => $this->user->id,
        ]);
        $miring->details()->create(['akun_id' => Akun::system('kas')->id, 'debit' => 50000, 'kredit' => 0]);

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('aktivitasHariIni.jurnal.seimbang', false)
            ->assertJsonPath('aktivitasHariIni.jurnal.tidakSeimbang', 1);
    }
}
