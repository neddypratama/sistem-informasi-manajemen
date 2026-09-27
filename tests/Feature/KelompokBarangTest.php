<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class KelompokBarangTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private Barang $barangTelur;

    private Barang $barangPakan;

    private Client $supplier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->barangTelur = $this->buatBarang('BRG-010', 'Telur Bebek Golden', 'Telur Bebek', 'telur');
        $this->barangPakan = $this->buatBarang('BRG-020', 'Pakan Sentrat 511', 'Pakan Sentrat/Pabrikan', 'pakan');
        $this->supplier = $this->buatClient('Supplier A', 'supplier');
        $this->buatAkunSistem();
    }

    public function test_index_transaksi_memfilter_berdasarkan_kelompok(): void
    {
        $user = $this->buatUserBerizin([
            'menu.pembelian.telur', 'menu.pembelian.pakan', 'menu.transaksi.riwayat',
        ]);

        $tTelur = $this->simpanTransaksi($user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangTelur->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);
        $this->simpanTransaksi($user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangPakan->id, 'kuantitas' => 5, 'harga' => 20000],
        ]);

        $response = $this->actingAsApi($user)
            ->getJson('/api/transaksi?tipe=pembelian&kategori=telur')
            ->assertOk();

        $data = collect($response->json('data'));
        $this->assertCount(1, $data);
        $this->assertSame($tTelur->id, $data->first()['id']);
    }

    public function test_create_data_memfilter_barang_per_kelompok(): void
    {
        $user = $this->buatUserBerizin(['menu.pembelian.telur']);

        $response = $this->actingAsApi($user)
            ->getJson('/api/transaksi/create-data?tipe=pembelian&kategori=telur')
            ->assertOk();

        $barangIds = collect($response->json('barangs'))->pluck('id')->all();

        $this->assertContains($this->barangTelur->id, $barangIds);
        $this->assertNotContains($this->barangPakan->id, $barangIds);
    }

    public function test_show_payload_mengembalikan_kategori_dari_kelompok(): void
    {
        $user = $this->buatUserBerizin(['menu.pembelian.telur']);

        $tTelur = $this->simpanTransaksi($user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangTelur->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($user)
            ->getJson("/api/transaksi/{$tTelur->id}")
            ->assertOk()
            ->assertJsonPath('transaksi.kategori', 'telur');
    }

    public function test_store_ditolak_tanpa_izin_kelompok_telur(): void
    {
        $user = $this->buatUserBerizin(['menu.pembelian.pakan']);

        $this->actingAsApi($user)
            ->postJson('/api/transaksi', [
                'tanggal' => '2026-08-01',
                'tipe_transaksi' => 'pembelian',
                'client_id' => $this->supplier->id,
                'items' => [
                    ['barang_id' => $this->barangTelur->id, 'kuantitas' => 10, 'harga' => 10000],
                ],
            ])
            ->assertForbidden();
    }

    public function test_jenis_barang_tanpa_kelompok_tidak_terfilter_dan_tidak_diperiksa_izinya(): void
    {
        $barang = $this->buatBarang('BRG-030', 'Sembako Lain', 'Sembako');

        $user = $this->buatUserBerizin(['menu.pembelian.pakan', 'menu.transaksi.riwayat']);

        $this->actingAsApi($user)
            ->postJson('/api/transaksi', [
                'tanggal' => '2026-08-01',
                'tipe_transaksi' => 'pembelian',
                'client_id' => $this->supplier->id,
                'items' => [
                    ['barang_id' => $barang->id, 'kuantitas' => 2, 'harga' => 10000],
                ],
            ])
            ->assertCreated();

        // Tidak muncul di filter kelompok manapun.
        $response = $this->actingAsApi($user)
            ->getJson('/api/transaksi?tipe=pembelian&kategori=telur')
            ->assertOk();

        $this->assertCount(0, collect($response->json('data')));
    }
}
