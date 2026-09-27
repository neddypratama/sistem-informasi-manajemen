<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Client;
use App\Models\JenisBarang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

/**
 * Modul Detail Stok per Jenis pada dashboard: opsi jenis, ringkasan kategori,
 * seri chart seluruh varian, dan paginasi. Stok dihitung real-time dari
 * batch FIFO sehingga tidak mengikuti filter periode dashboard.
 */
class DashboardStokTest extends TestCase
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
     * Buat barang berstok lewat pembelian (membuat stok batch FIFO).
     */
    private function buatStok(
        string $kode,
        string $nama,
        string $jenis,
        float $qty,
        float $harga,
        string $kelompok = 'telur',
    ): Barang {
        $barang = $this->buatBarang($kode, $nama, $jenis, $kelompok);

        $this->simpanTransaksi($this->user, 'pembelian', $this->client, [
            ['barang_id' => $barang->id, 'kuantitas' => $qty, 'harga' => $harga],
        ]);

        return $barang;
    }

    public function test_stok_memuat_opsi_jenis_dan_memilih_jenis_awal_otomatis(): void
    {
        $this->buatStok('BRG-001', 'Telur Bebek Segar', 'Telur Bebek', 10, 2000, 'telur');
        $this->buatStok('BRG-002', 'Obat Vitamin', 'Vitamin Ayam', 5, 1000, 'obat');
        $this->buatBarang('BRG-003', 'Telur Horn', 'Telur Bebek', 'telur');

        $idTelur = JenisBarang::where('nama', 'Telur Bebek')->firstOrFail()->id;

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard/stok')
            ->assertOk()
            ->assertJsonCount(2, 'jenis')
            ->assertJsonCount(2, 'chart.items')
            ->assertJsonPath('jenis.0.nama', 'Telur Bebek')
            ->assertJsonPath('jenis.0.varian', fn ($value) => $value == 2)
            ->assertJsonPath('jenis.1.nama', 'Vitamin Ayam')
            ->assertJsonPath('jenis.1.varian', fn ($value) => $value == 1)
            ->assertJsonPath('terpilih.id', $idTelur)
            ->assertJsonPath('terpilih.kelompok', 'telur')
            ->assertJsonPath('terpilih.totalQty', fn ($value) => $value == 10)
            ->assertJsonPath('terpilih.totalNilai', fn ($value) => $value == 20000)
            ->assertJsonPath('terpilih.satuan', 'kg')
            ->assertJsonPath('terpilih.kondisi', 'Siap Distribusi')
            ->assertJsonPath('total', 2)
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('last_page', 1);
    }

    public function test_stok_memfilter_item_dan_chart_berdasarkan_jenis_terpilih(): void
    {
        $this->buatStok('BRG-001', 'Telur Bebek Segar', 'Telur Bebek', 10, 2000, 'telur');
        $this->buatStok('BRG-002', 'Obat Vitamin', 'Vitamin Ayam', 5, 1000, 'obat');

        $idVitamin = JenisBarang::where('nama', 'Vitamin Ayam')->firstOrFail()->id;

        $this->actingAsApi($this->user)
            ->getJson("/api/dashboard/stok?jenis_barang_id={$idVitamin}")
            ->assertOk()
            ->assertJsonPath('terpilih.id', $idVitamin)
            ->assertJsonPath('terpilih.nama', 'Vitamin Ayam')
            ->assertJsonPath('terpilih.totalQty', fn ($value) => $value == 5)
            ->assertJsonCount(1, 'chart.items')
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.nama', 'Obat Vitamin')
            ->assertJsonPath('items.0.qty', fn ($value) => $value == 5)
            ->assertJsonPath('total', 1);
    }

    public function test_subtotal_item_konsisten_dengan_qty_kali_harga_satuan(): void
    {
        $this->buatStok('BRG-001', 'Telur Bebek Segar', 'Telur Bebek', 10, 2000, 'telur');

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/dashboard/stok')
            ->assertOk();

        $response->assertJsonPath('items.0.hargaSatuan', fn ($value) => $value == 2000)
            ->assertJsonPath('items.0.subtotalNilai', fn ($value) => $value == 20000)
            ->assertJsonPath('terpilih.totalNilai', fn ($value) => $value == 20000);

        foreach ($response->json('items') as $item) {
            $this->assertEqualsWithDelta(
                $item['qty'] * $item['hargaSatuan'],
                $item['subtotalNilai'],
                0.01,
            );
        }
    }

    public function test_stok_mempaginate_item_dengan_per_page(): void
    {
        foreach (range(1, 6) as $urut) {
            $this->buatStok('BRG-00'.$urut, 'Telur '.chr(64 + $urut), 'Telur Bebek', $urut * 10, 2000, 'telur');
        }

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard/stok?per_page=5&page=1')
            ->assertOk()
            ->assertJsonCount(5, 'items')
            ->assertJsonPath('total', 6)
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('last_page', 2)
            ->assertJsonPath('per_page', 5)
            ->assertJsonPath('from', 1)
            ->assertJsonPath('to', 5);

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard/stok?per_page=5&page=2')
            ->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('from', 6)
            ->assertJsonPath('to', 6);
    }

    public function test_stok_menolak_parameter_tidak_valid(): void
    {
        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard/stok?per_page=7')
            ->assertJsonValidationErrors(['per_page']);

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard/stok?page=0')
            ->assertJsonValidationErrors(['page']);

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard/stok?jenis_barang_id=999999')
            ->assertJsonValidationErrors(['jenis_barang_id']);
    }

    public function test_barang_tanpa_batch_tampil_dengan_qty_nol_dan_stok_kosong(): void
    {
        $this->buatBarang('BRG-001', 'Telur Kosong', 'Telur Bebek', 'telur');

        $this->actingAsApi($this->user)
            ->getJson('/api/dashboard/stok')
            ->assertOk()
            ->assertJsonCount(1, 'chart.items')
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('terpilih.totalQty', fn ($value) => $value == 0)
            ->assertJsonPath('terpilih.totalNilai', fn ($value) => $value == 0)
            ->assertJsonPath('terpilih.kondisi', 'Stok Kosong')
            ->assertJsonPath('items.0.qty', fn ($value) => $value == 0)
            ->assertJsonPath('items.0.hargaSatuan', fn ($value) => $value == 0)
            ->assertJsonPath('items.0.subtotalNilai', fn ($value) => $value == 0);
    }

    public function test_stok_dapat_diakses_tanpa_permission_menu(): void
    {
        $userTanpaIzin = $this->buatUserBerizin([]);

        $this->actingAsApi($userTanpaIzin)
            ->getJson('/api/dashboard/stok')
            ->assertOk();

        $this->actingAsApi($userTanpaIzin)
            ->getJson('/api/dashboard')
            ->assertOk();
    }
}
