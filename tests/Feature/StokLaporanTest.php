<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

/**
 * Laporan Stok Barang: rekap per barang (stok awal, empat mutasi qty+nominal,
 * stok akhir) pada periode tertentu, filter kelompok/status, paginasi 15 baris,
 * total keseluruhan, dan export Excel.
 */
class StokLaporanTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Barang $barang;

    private Client $supplier;

    private Client $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->buatAkunSistem();
        $this->barang = $this->buatBarang();
        $this->supplier = $this->buatClient('Supplier A', 'supplier');
        $this->customer = $this->buatClient('Customer B', 'customer');
    }

    public function test_rekap_menghitung_stok_awal_mutasi_dan_stok_akhir(): void
    {
        $this->buatMutasiLengkap();

        $baris = $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nama', 'Beras')
            ->assertJsonPath('data.0.kode', 'BRG-001')
            ->assertJsonPath('data.0.stok_awal', fn ($value) => $value == 0)
            ->assertJsonPath('data.0.pembelian.qty', fn ($value) => $value == 10)
            ->assertJsonPath('data.0.pembelian.nilai', fn ($value) => $value == 100000)
            ->assertJsonPath('data.0.penjualan.qty', fn ($value) => $value == 4)
            ->assertJsonPath('data.0.penjualan.nilai', fn ($value) => $value == 60000)
            ->assertJsonPath('data.0.retur_pembelian.qty', fn ($value) => $value == 2)
            ->assertJsonPath('data.0.retur_pembelian.nilai', fn ($value) => $value == 20000)
            ->assertJsonPath('data.0.retur_penjualan.qty', fn ($value) => $value == 2)
            ->assertJsonPath('data.0.retur_penjualan.nilai', fn ($value) => $value == 30000)
            ->assertJsonPath('data.0.stok_akhir', fn ($value) => $value == 6)
            ->assertJsonPath('total_keseluruhan.stok_awal', fn ($value) => $value == 0)
            ->assertJsonPath('total_keseluruhan.pembelian.qty', fn ($value) => $value == 10)
            ->assertJsonPath('total_keseluruhan.pembelian.nilai', fn ($value) => $value == 100000)
            ->assertJsonPath('total_keseluruhan.stok_akhir', fn ($value) => $value == 6)
            ->json('data.0');

        $this->assertSame('BRG-001', $baris['kode']);
        $this->assertSame('Beras', $baris['nama']);
        $this->assertSame('kg', $baris['satuan']);
    }

    public function test_periode_membatasi_mutasi_dan_mengubah_stok_awal(): void
    {
        $this->buatMutasiLengkap();

        // Mutasi 2026-08-01 s/d 2026-08-04: pembelian 10, penjualan 4.
        $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan?dari=2026-08-01&sampai=2026-08-04')
            ->assertOk()
            ->assertJsonPath('data.0.stok_awal', fn ($value) => $value == 0)
            ->assertJsonPath('data.0.pembelian.qty', fn ($value) => $value == 10)
            ->assertJsonPath('data.0.penjualan.qty', fn ($value) => $value == 4)
            ->assertJsonPath('data.0.retur_pembelian.qty', fn ($value) => $value == 0)
            ->assertJsonPath('data.0.stok_akhir', fn ($value) => $value == 6);

        // Mulai 2026-08-05: saldo awal 6, hanya dua retur di dalam periode.
        $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan?dari=2026-08-05')
            ->assertOk()
            ->assertJsonPath('data.0.stok_awal', fn ($value) => $value == 6)
            ->assertJsonPath('data.0.pembelian.qty', fn ($value) => $value == 0)
            ->assertJsonPath('data.0.retur_pembelian.qty', fn ($value) => $value == 2)
            ->assertJsonPath('data.0.retur_penjualan.qty', fn ($value) => $value == 2)
            ->assertJsonPath('data.0.stok_akhir', fn ($value) => $value == 6);

        // Sampai 2026-08-04 saja: stok akhir adalah posisi akhir periode.
        $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan?sampai=2026-08-04')
            ->assertOk()
            ->assertJsonPath('data.0.stok_awal', fn ($value) => $value == 0)
            ->assertJsonPath('data.0.stok_akhir', fn ($value) => $value == 6);
    }

    public function test_total_keseluruhan_menjumlah_seluruh_barang_meski_dipaginasi(): void
    {
        for ($i = 2; $i <= 17; $i++) {
            $this->buatBarang('BRG-'.str_pad((string) $i, 3, '0', STR_PAD_LEFT), "Barang {$i}", 'Sembako');
        }

        $this->buatMutasiLengkap();

        $halaman1 = $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan')
            ->assertOk()
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('total', 17)
            ->json();

        $this->assertEqualsWithDelta(6, $halaman1['total_keseluruhan']['stok_akhir'], 0.001);
        $this->assertEqualsWithDelta(10, $halaman1['total_keseluruhan']['pembelian']['qty'], 0.001);

        $halaman2 = $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan?page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->json();

        $this->assertEqualsWithDelta(6, $halaman2['total_keseluruhan']['stok_akhir'], 0.001);
    }

    public function test_filter_kelompok_status_dan_pencarian(): void
    {
        $this->buatBarang('BRG-002', 'Jagung Pakan', 'Pakan', 'pakan');
        $this->buatBarang('BRG-003', 'Vitamin Ayam', 'Obat', 'obat');

        $nonaktif = Barang::where('kode_barang', 'BRG-003')->firstOrFail();
        $nonaktif->update(['status' => 'nonaktif']);

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan?kelompok=pakan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.kode', 'BRG-002');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan?status=nonaktif')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.kode', 'BRG-003');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan?search=jagung')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nama', 'Jagung Pakan');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/laporan?search=tidak-ada')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('total', 0);
    }

    public function test_laporan_stok_tanpa_izin_ditolak(): void
    {
        $tanpaIzin = $this->buatUserBerizin([]);

        $this->actingAsApi($tanpaIzin)->getJson('/api/stok/laporan')->assertForbidden();
        $this->actingAsApi($tanpaIzin)->get('/api/stok/laporan/export-excel')->assertForbidden();
    }

    public function test_export_laporan_stok_memuat_mutasi_dan_baris_total(): void
    {
        $this->buatMutasiLengkap();

        $sheet = $this->bacaWorksheet(
            $this->actingAsApi($this->user)
                ->get('/api/stok/laporan/export-excel')
                ->assertOk(),
        );

        $this->assertSame('Kode', $sheet->getCell('A1')->getValue());
        $this->assertSame('Stok Awal', $sheet->getCell('D1')->getValue());
        $this->assertSame('Stok Akhir', $sheet->getCell('M1')->getValue());

        $this->assertSame('BRG-001', $sheet->getCell('A2')->getValue());
        $this->assertSame('Beras', $sheet->getCell('B2')->getValue());
        $this->assertEquals(0, $sheet->getCell('D2')->getValue());
        $this->assertEquals(10, $sheet->getCell('E2')->getValue());
        $this->assertEquals(100000, $sheet->getCell('F2')->getValue());
        $this->assertEquals(6, $sheet->getCell('M2')->getValue());

        $this->assertSame('Total', $sheet->getCell('B3')->getValue());
        $this->assertEquals(10, $sheet->getCell('E3')->getValue());
        $this->assertEquals(100000, $sheet->getCell('F3')->getValue());
        $this->assertEquals(6, $sheet->getCell('M3')->getValue());

        $sheetTerfilter = $this->bacaWorksheet(
            $this->actingAsApi($this->user)
                ->get('/api/stok/laporan/export-excel?dari=2026-08-05')
                ->assertOk(),
        );

        $this->assertEquals(6, $sheetTerfilter->getCell('D2')->getValue());
        $this->assertEquals(2, $sheetTerfilter->getCell('I2')->getValue());
    }

    /**
     * Susun empat mutasi berbeda arah untuk satu barang.
     *
     * Stok akhir: 10 pembelian - 4 penjualan - 2 retur pembelian + 2 retur penjualan = 6.
     */
    private function buatMutasiLengkap(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $penjualan = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ], '2026-08-03');

        $this->simpanRetur($this->user, 'pembelian_retur', $pembelian, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 2, 'harga' => 10000],
        ], '2026-08-05');

        $this->simpanRetur($this->user, 'penjualan_retur', $penjualan, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 2, 'harga' => 15000],
        ], '2026-08-07');
    }

    /**
     * Baca isi file xlsx dari respons stream.
     */
    private function bacaWorksheet(TestResponse $response): Worksheet
    {
        $content = $response->streamedContent();

        $this->assertStringStartsWith('PK', $content, 'Respons bukan file .xlsx (zip).');

        $path = tempnam(sys_get_temp_dir(), 'xlsx').'.xlsx';
        file_put_contents($path, $content);

        try {
            return IOFactory::load($path)->getActiveSheet();
        } finally {
            @unlink($path);
        }
    }
}
