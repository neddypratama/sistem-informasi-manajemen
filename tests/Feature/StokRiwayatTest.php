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
 * Riwayat Stok: daftar barang yang bisa dibuka mutasinya, detail transaksi
 * per barang dengan saldo berjalan, filter tanggal/tipe, dan export Excel.
 */
class StokRiwayatTest extends TestCase
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

    public function test_daftar_riwayat_stok_mendukung_pencarian_dan_kelompok(): void
    {
        $this->buatBarang('BRG-002', 'Jagung Pakan', 'Pakan', 'pakan');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.nama_barang', 'Beras')
            ->assertJsonPath('data.1.nama_barang', 'Jagung Pakan')
            ->assertJsonPath('data.1.jenis_barang.nama', 'Pakan');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat?search=jagung')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.kode_barang', 'BRG-002');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat?kelompok=pakan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.kode_barang', 'BRG-002');
    }

    public function test_filter_tipe_menyaring_barang_pada_daftar_riwayat(): void
    {
        $barangB = $this->buatBarang('BRG-002', 'Jagung Pakan', 'Pakan', 'pakan');
        $this->buatBarang('BRG-003', 'Vitamin Ayam', 'Obat', 'obat');

        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $barangB->id, 'kuantitas' => 5, 'harga' => 8000],
        ]);

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat?tipe=pembelian')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.kode_barang', 'BRG-001')
            ->assertJsonPath('data.1.kode_barang', 'BRG-002');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat?tipe=penjualan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.kode_barang', 'BRG-001');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat?tipe=tidak-ada')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_detail_mutasi_menghitung_saldo_berjalan_dan_total(): void
    {
        $this->buatMutasiLengkap();

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat/'.$this->barang->id)
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('total', 4)
            ->assertJsonPath('total_nilai', fn ($value) => $value == 210000)
            ->assertJsonPath('saldo_awal', fn ($value) => $value == 0)
            ->assertJsonPath('barang.nama_barang', 'Beras')
            ->assertJsonPath('barang.stok', fn ($value) => $value == 6);

        $baris = $response->json('data');

        $this->assertSame('pembelian', $baris[0]['tipe']);
        $this->assertSame('masuk', $baris[0]['arah']);
        $this->assertEqualsWithDelta(10, $baris[0]['qty'], 0.001);
        $this->assertEqualsWithDelta(0, $baris[0]['saldo_sebelum'], 0.001);
        $this->assertEqualsWithDelta(10, $baris[0]['saldo'], 0.001);
        $this->assertEqualsWithDelta(100000, $baris[0]['subtotal'], 0.001);

        $this->assertSame('penjualan', $baris[1]['tipe']);
        $this->assertSame('keluar', $baris[1]['arah']);
        $this->assertEqualsWithDelta(-4, $baris[1]['qty'], 0.001);
        $this->assertEqualsWithDelta(10, $baris[1]['saldo_sebelum'], 0.001);
        $this->assertEqualsWithDelta(6, $baris[1]['saldo'], 0.001);

        $this->assertSame('pembelian_retur', $baris[2]['tipe']);
        $this->assertEqualsWithDelta(-2, $baris[2]['qty'], 0.001);
        $this->assertEqualsWithDelta(6, $baris[2]['saldo_sebelum'], 0.001);
        $this->assertEqualsWithDelta(4, $baris[2]['saldo'], 0.001);

        $this->assertSame('penjualan_retur', $baris[3]['tipe']);
        $this->assertEqualsWithDelta(2, $baris[3]['qty'], 0.001);
        $this->assertEqualsWithDelta(4, $baris[3]['saldo_sebelum'], 0.001);
        $this->assertEqualsWithDelta(6, $baris[3]['saldo'], 0.001);
    }

    public function test_filter_tipe_dan_tanggal_mengubah_baris_dan_total(): void
    {
        $this->buatMutasiLengkap();

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat/'.$this->barang->id.'?tipe=penjualan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.tipe', 'penjualan')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 60000)
            ->assertJsonPath('saldo_awal', fn ($value) => $value == 10);

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat/'.$this->barang->id.'?dari=2026-08-05')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 50000)
            ->assertJsonPath('saldo_awal', fn ($value) => $value == 6);

        // Saldo berjalan dihitung dari seluruh transaksi, tetap konsisten
        // meski filter menyisakan nol baris.
        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat/'.$this->barang->id.'?tipe=pembelian&dari=2026-08-03')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 0)
            ->assertJsonPath('saldo_awal', fn ($value) => $value == 10);

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/riwayat/'.$this->barang->id.'?order=desc')
            ->assertOk()
            ->assertJsonPath('data.0.tipe', 'penjualan_retur');
    }

    public function test_riwayat_stok_tanpa_filter_kepemilikan(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $userLain = $this->buatUserBerizin(['menu.stok.riwayat']);

        $this->actingAsApi($userLain)
            ->getJson('/api/stok/riwayat/'.$this->barang->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.transaksi_id', $pembelian->id);
    }

    public function test_riwayat_stok_tanpa_izin_ditolak(): void
    {
        $tanpaIzin = $this->buatUserBerizin([]);

        $this->actingAsApi($tanpaIzin)
            ->getJson('/api/stok/riwayat')
            ->assertForbidden();

        $this->actingAsApi($tanpaIzin)
            ->getJson('/api/stok/riwayat/'.$this->barang->id)
            ->assertForbidden();

        $this->actingAsApi($tanpaIzin)
            ->get('/api/stok/riwayat/'.$this->barang->id.'/export-excel')
            ->assertForbidden();
    }

    public function test_export_riwayat_stok_memuat_mutasi_dan_baris_total(): void
    {
        $this->buatMutasiLengkap();

        $sheet = $this->bacaWorksheet(
            $this->actingAsApi($this->user)
                ->get('/api/stok/riwayat/'.$this->barang->id.'/export-excel')
                ->assertOk(),
        );

        $this->assertSame('Tanggal', $sheet->getCell('A1')->getValue());
        $this->assertSame('2026-08-01', $sheet->getCell('A2')->getValue());
        $this->assertSame('Pembelian', $sheet->getCell('C2')->getValue());
        $this->assertEquals(10, $sheet->getCell('E2')->getValue());

        $this->assertSame('Total', $sheet->getCell('B6')->getValue());
        $this->assertEquals(210000, $sheet->getCell('G6')->getValue());
        $this->assertEquals(6, $sheet->getCell('H6')->getValue());

        $sheetTerfilter = $this->bacaWorksheet(
            $this->actingAsApi($this->user)
                ->get('/api/stok/riwayat/'.$this->barang->id.'/export-excel?tipe=penjualan')
                ->assertOk(),
        );

        $this->assertSame('Total', $sheetTerfilter->getCell('B3')->getValue());
        $this->assertEquals(60000, $sheetTerfilter->getCell('G3')->getValue());
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
