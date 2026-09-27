<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

/**
 * Footer "Total Keseluruhan" memakai agregat backend (total_nilai dkk) yang
 * dihitung dari seluruh hasil filter, bukan hanya halaman aktif.
 */
class TotalKeseluruhanTest extends TestCase
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

    public function test_total_nilai_transaksi_mengikuti_filter(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ], '2026-08-03');

        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 160000);

        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?tipe=penjualan')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 60000);

        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?tipe=retur')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 0);
    }

    public function test_total_nilai_retur_mengikuti_filter(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $this->simpanRetur($this->user, 'pembelian_retur', $pembelian, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 3, 'harga' => 10000],
        ], '2026-08-05');

        $this->actingAsApi($this->user)
            ->getJson('/api/retur?tipe=pembelian')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 30000);

        $this->actingAsApi($this->user)
            ->getJson('/api/retur?tipe=penjualan')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 0);
    }

    public function test_total_nilai_hutang_dan_piutang_mengikuti_filter_status(): void
    {
        $this->buatHutang($this->supplier, 500000, $this->user);
        $this->buatHutang($this->supplier, 150000, $this->user);
        $this->buatPiutang($this->customer, 200000, $this->user);

        $this->actingAsApi($this->user)
            ->getJson('/api/hutang')
            ->assertOk()
            ->assertJsonCount(2, 'data.data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 650000);

        $this->actingAsApi($this->user)
            ->getJson('/api/hutang?status=lunas')
            ->assertOk()
            ->assertJsonCount(0, 'data.data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 0);

        $this->actingAsApi($this->user)
            ->getJson('/api/piutang')
            ->assertOk()
            ->assertJsonPath('total_nilai', fn ($value) => $value == 200000);

        $this->actingAsApi($this->user)
            ->getJson('/api/piutang?status=lunas')
            ->assertOk()
            ->assertJsonCount(0, 'data.data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 0);
    }

    public function test_total_nilai_fifo_menghitung_seluruh_batch(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ], '2026-08-03');

        $this->actingAsApi($this->user)
            ->getJson('/api/stok/fifo')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('total_qty_sisa', fn ($value) => $value == 6)
            ->assertJsonPath('total_nilai_sisa', fn ($value) => $value == 60000);
    }
}
