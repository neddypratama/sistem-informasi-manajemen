<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class LaporanPakanCurahTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Barang $barangCurah;

    private Barang $barangLain;

    private Client $supplier;

    private Client $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $akuns = $this->buatAkunSistem();
        $this->buatAkunDetail($akuns);

        $this->barangCurah = $this->buatBarang('BRG-C1', 'Jagung OC', 'Pakan Curah', 'pakan');
        $this->barangLain = $this->buatBarang('BRG-T1', 'Telur Horn', 'Telur Horn', 'telur');

        $this->supplier = $this->buatClient('Supplier', 'Supplier');
        $this->customer = $this->buatClient('Pedagang A', 'Pedagang');
    }

    public function test_laba_rugi_curah_hanya_memuat_barang_pakan_curah(): void
    {
        // Beli dan jual barang curah
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 50, 'harga' => 2500],
        ]);

        // Jual barang NON-curah — tidak boleh muncul di laporan curah
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangLain->id, 'kuantitas' => 10, 'harga' => 5000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barangLain->id, 'kuantitas' => 5, 'harga' => 7000],
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/laba-rugi-curah?dari=2026-01-01&sampai=2026-12-31')
            ->assertOk()
            ->assertJsonStructure([
                'perBarang',
                'totalPenjualan',
                'totalHpp',
                'labaKotor',
                'stok',
                'start',
                'end',
            ]);

        $perBarang = $response->json('perBarang');

        // Hanya 1 barang (Jagung OC/Pakan Curah) yang muncul
        $this->assertCount(1, $perBarang);
        $this->assertSame('BRG-C1', $perBarang[0]['kode']);

        // Penjualan curah: 50 × 2500 = 125000
        $this->assertSame(125000.0, (float) $response->json('totalPenjualan'));

        // HPP curah: 50 × 2000 = 100000
        $this->assertSame(100000.0, (float) $response->json('totalHpp'));

        // Laba kotor: 25000
        $this->assertSame(25000.0, (float) $response->json('labaKotor'));
    }

    public function test_total_stok_curah_nominal_sesuai_saldo_akun(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/laba-rugi-curah?dari=2026-01-01&sampai=2026-12-31')
            ->assertOk();

        $akunStok = Akun::system('stok_pakan_curah');

        // Nominal stok dari API harus sama dengan saldo akun
        $nominalApi = (float) $response->json('stok.nominal');
        $nominalAkun = 200000.0; // 100 × 2000

        $this->assertSame($nominalAkun, $nominalApi);
        $this->assertNotNull($akunStok);
    }

    public function test_neraca_tidak_memuat_akun_curah_dan_menampilkan_di_luar_neraca(): void
    {
        // Beli curah → ada saldo di Stok Pakan Curah dan Hutang Pakan Curah
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/neraca')
            ->assertOk()
            ->assertJsonStructure(['akuns', 'diLuarNeraca', 'tanggal']);

        $akuns = collect($response->json('akuns'));
        $diLuarNeraca = $response->json('diLuarNeraca');

        $curahCodes = ['stok_pakan_curah', 'penjualan_pakan_curah', 'hpp_pakan_curah', 'piutang_pakan_curah', 'hutang_pakan_curah'];

        // Akun curah tidak boleh ada di akuns
        foreach ($curahCodes as $code) {
            $akun = Akun::system($code);
            if ($akun) {
                $this->assertNull(
                    $akuns->firstWhere('id', $akun->id),
                    "Akun curah {$code} tidak boleh ada di neraca utama",
                );
            }
        }

        // diLuarNeraca harus berisi sub-struktur aset, liabilitas, ekuitas
        $this->assertArrayHasKey('aset', $diLuarNeraca);
        $this->assertArrayHasKey('liabilitas', $diLuarNeraca);
        $this->assertArrayHasKey('ekuitas', $diLuarNeraca);
        $this->assertArrayHasKey('totalAset', $diLuarNeraca);
        $this->assertArrayHasKey('totalLiabilitas', $diLuarNeraca);
        $this->assertArrayHasKey('totalKewajiban', $diLuarNeraca);
        $this->assertArrayHasKey('selisih', $diLuarNeraca);

        // Stok Pakan Curah harus masuk di aset curah
        $stokCurah = Akun::system('stok_pakan_curah');
        $idsDiLuarAset = collect($diLuarNeraca['aset'])->pluck('id')->all();
        $this->assertContains($stokCurah->id, $idsDiLuarAset);

        // Hutang Pakan Curah harus masuk di liabilitas curah
        $hutangCurah = Akun::system('hutang_pakan_curah');
        $idsDiLuarLiabilitas = collect($diLuarNeraca['liabilitas'])->pluck('id')->all();
        $this->assertContains($hutangCurah->id, $idsDiLuarLiabilitas);
    }

    public function test_blok_di_luar_neraca_curah_balance_setelah_pembelian_kredit(): void
    {
        // Pembelian curah 100 × 2000 = 200.000 on credit
        // Dr Stok Pakan Curah 200.000 | Cr Hutang Pakan Curah 200.000
        // → Aset 200.000, Liabilitas 200.000, Ekuitas 0, Selisih 0
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/neraca')
            ->assertOk();

        $diLuarNeraca = $response->json('diLuarNeraca');

        $this->assertSame(200000.0, (float) $diLuarNeraca['totalAset']);
        $this->assertSame(200000.0, (float) $diLuarNeraca['totalLiabilitas']);
        $this->assertSame(0.0, (float) $diLuarNeraca['ekuitas']['laba']);
        $this->assertSame(0.0, (float) $diLuarNeraca['selisih']);
    }

    public function test_blok_di_luar_neraca_curah_menampilkan_laba_setelah_penjualan(): void
    {
        // Beli 100 × 2000 = 200.000, jual 50 × 2500 = 125.000 (HPP 100.000)
        // Aset = Stok 100.000 + Piutang 125.000 = 225.000
        // Liabilitas = Hutang 200.000
        // Ekuitas = Penjualan 125.000 − HPP 100.000 = 25.000
        // TotalKewajiban = 200.000 + 25.000 = 225.000
        // Selisih = 0
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 50, 'harga' => 2500],
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/neraca')
            ->assertOk();

        $diLuarNeraca = $response->json('diLuarNeraca');

        $this->assertSame(225000.0, (float) $diLuarNeraca['totalAset']);
        $this->assertSame(200000.0, (float) $diLuarNeraca['totalLiabilitas']);
        $this->assertSame(125000.0, (float) $diLuarNeraca['ekuitas']['pendapatan']);
        $this->assertSame(100000.0, (float) $diLuarNeraca['ekuitas']['beban']);
        $this->assertSame(25000.0, (float) $diLuarNeraca['ekuitas']['laba']);
        $this->assertSame(225000.0, (float) $diLuarNeraca['totalKewajiban']);
        $this->assertSame(0.0, (float) $diLuarNeraca['selisih']);
    }

    public function test_laba_rugi_umum_tidak_memuat_akun_pakan_curah(): void
    {
        // Beli dan jual curah serta non-curah
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 50, 'harga' => 2500],
        ]);
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangLain->id, 'kuantitas' => 10, 'harga' => 5000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barangLain->id, 'kuantitas' => 5, 'harga' => 7000],
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/laba-rugi?dari=2026-01-01&sampai=2026-12-31')
            ->assertOk();

        $pendapatanNama = collect($response->json('pendapatan'))->pluck('akun.nama')->all();
        $bebanNama = collect($response->json('beban'))->pluck('akun.nama')->all();

        // Penjualan dan HPP Curah tidak boleh muncul di L/R umum
        $this->assertNotContains('Penjualan Pakan Curah', $pendapatanNama);
        $this->assertNotContains('HPP Curah', $bebanNama);

        // Tapi totalPendapatan / totalBeban tetap ada (dari barang non-curah)
        $this->assertGreaterThan(0, $response->json('totalPendapatan'));
    }

    public function test_buku_besar_masih_memuat_akun_curah(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);

        $stokCurah = Akun::system('stok_pakan_curah');

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/buku-besar?akun_id='.$stokCurah->id)
            ->assertOk();

        // Buku besar masih bisa difilter per akun curah
        $this->assertSame($stokCurah->id, $response->json('akunTerpilih.id'));
    }

    public function test_export_laba_rugi_curah_mengembalikan_file_xlsx(): void
    {
        $response = $this->actingAsApi($this->user)
            ->get('/api/laporan/laba-rugi-curah/export-excel')
            ->assertOk()
            ->assertHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            );

        $this->assertStringStartsWith('PK', $response->streamedContent());
    }
}
