<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use App\Models\Hutang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class HutangPiutangViewTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Barang $barang;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->buatAkunSistem();
        $this->barang = $this->buatBarang();
    }

    public function test_tagihan_mengagregasi_hutang_per_supplier(): void
    {
        $supplierA = $this->buatClient('Supplier A', 'supplier');
        $supplierB = $this->buatClient('Supplier B', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplierA, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);
        $this->simpanTransaksi($this->user, 'pembelian', $supplierA, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 10000],
        ]);
        $this->simpanTransaksi($this->user, 'pembelian', $supplierB, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 3, 'harga' => 25000],
        ]);

        $response = $this->actingAsApi($this->user)->getJson('/api/tagihan')->assertOk();

        $items = collect($response->json('items'))->keyBy('client');

        $this->assertSame(2, $items['Supplier A']['jumlah_hutang']);
        $this->assertSame(150000.0, (float) $items['Supplier A']['sisa_hutang']);
        $this->assertSame(1, $items['Supplier B']['jumlah_hutang']);
        $this->assertSame(75000.0, (float) $items['Supplier B']['sisa_hutang']);

        $this->assertSame(225000.0, (float) $response->json('totalHutang'));
        $this->assertSame(225000.0, (float) $response->json('sisaHutang'));
        $this->assertSame(0.0, (float) $response->json('totalPiutang'));
    }

    public function test_tagihan_mengagregasi_piutang_per_customer(): void
    {
        $supplier = $this->buatClient('Supplier X', 'supplier');
        $customerA = $this->buatClient('Customer A', 'customer');
        $customerB = $this->buatClient('Customer B', 'customer');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);

        $this->simpanTransaksi($this->user, 'penjualan', $customerA, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $customerA, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $customerB, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 22500],
        ]);

        $response = $this->actingAsApi($this->user)->getJson('/api/tagihan')->assertOk();

        $items = collect($response->json('items'))->keyBy('client');

        $this->assertSame(2, $items['Customer A']['jumlah_piutang']);
        $this->assertSame(120000.0, (float) $items['Customer A']['sisa_piutang']);
        $this->assertSame(1, $items['Customer B']['jumlah_piutang']);
        $this->assertSame(90000.0, (float) $items['Customer B']['sisa_piutang']);

        $this->assertSame(210000.0, (float) $response->json('totalPiutang'));

        // Urutan menurun berdasarkan sisa: Supplier X (200.000) > Customer A (120.000) > Customer B (90.000)
        $this->assertSame(
            ['Supplier X', 'Customer A', 'Customer B'],
            collect($response->json('items'))->pluck('client')->all(),
        );
    }

    public function test_detail_tagihan_menampilkan_status_belum_lunas_karena_belum_dibayar(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->getJson('/api/tagihan/'.$supplier->id)
            ->assertOk()
            ->assertJsonPath('client.nama', 'Supplier A')
            ->assertJsonCount(1, 'hutangs')
            ->assertJsonPath('hutangs.0.status', 'belum_lunas')
            ->assertJsonPath('hutangs.0.sisa', 100000)
            ->assertJsonCount(0, 'piutangs')
            ->assertJsonCount(0, 'riwayat');
    }

    public function test_detail_tagihan_memuat_riwayat_pembayaran(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'hutang_id' => Hutang::first()->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 40000,
                'keterangan' => 'Cicilan pertama',
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        $this->actingAsApi($this->user)
            ->getJson('/api/tagihan/'.$supplier->id)
            ->assertOk()
            ->assertJsonPath('hutangs.0.status', 'belum_lunas')
            ->assertJsonPath('hutangs.0.sisa', 60000)
            ->assertJsonCount(1, 'riwayat')
            ->assertJsonPath('riwayat.0.tipe', 'hutang')
            ->assertJsonPath('riwayat.0.jumlah', 40000)
            ->assertJsonPath('riwayat.0.keterangan', 'Cicilan pertama');
    }

    public function test_client_tanpa_tagihan_tidak_muncul_pada_daftar(): void
    {
        $this->buatClient('Supplier Tanpa Transaksi', 'supplier');

        $this->actingAsApi($this->user)
            ->getJson('/api/tagihan')
            ->assertOk()
            ->assertJsonCount(0, 'items');

        $this->assertSame(1, Client::count());
    }
}
