<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Client;
use App\Models\StokBatch;
use App\Models\StokBatchUsage;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class FiFoTransaksiTest extends TestCase
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
        $this->barang = $this->buatBarang();
        $this->supplier = $this->buatClient('Supplier A', 'supplier');
        $this->customer = $this->buatClient('Customer B', 'customer');
    }

    /**
     * @param  array<int, array{barang_id: int, kuantitas: int|float, harga: int|float}>  $items
     */
    protected function buatPembelian(array $items, string $tanggal = '2026-08-01'): Transaksi
    {
        return $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, $items, $tanggal);
    }

    /**
     * @param  array<int, array{barang_id: int, kuantitas: int|float, harga: int|float}>  $items
     */
    protected function buatPenjualan(array $items, string $tanggal = '2026-08-10'): Transaksi
    {
        return $this->simpanTransaksi($this->user, 'penjualan', $this->customer, $items, $tanggal);
    }

    public function test_pembelian_menambah_stok_dan_membuat_batch_fifo(): void
    {
        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->assertSame(10.0, (float) $this->barang->fresh()->stok);

        $batch = StokBatch::first();
        $this->assertNotNull($batch);
        $this->assertSame(10.0, (float) $batch->qty_masuk);
        $this->assertSame(10.0, (float) $batch->qty_sisa);
        $this->assertSame(10000.0, (float) $batch->harga_beli);
    }

    public function test_dua_pembelian_menghasilkan_dua_batch_dengan_urutan_fifo(): void
    {
        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 12000],
        ], '2026-08-05');

        $this->assertSame(15.0, (float) $this->barang->fresh()->stok);

        $batches = StokBatch::orderBy('id')->get();
        $this->assertCount(2, $batches);
        $this->assertSame(10000.0, (float) $batches[0]->harga_beli);
        $this->assertSame(12000.0, (float) $batches[1]->harga_beli);
    }

    public function test_penjualan_mengurangi_batch_paling_awal_terlebih_dahulu_fifo(): void
    {
        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 12000],
        ], '2026-08-05');

        $transaksi = $this->buatPenjualan([
            ['barang_id' => $this->barang->id, 'kuantitas' => 12, 'harga' => 15000],
        ], '2026-08-10');

        // Stok akhir = 10 + 5 - 12 = 3
        $this->assertSame(3.0, (float) $this->barang->fresh()->stok);

        $batches = StokBatch::orderBy('id')->get();

        // Batch 1 (10 @ 10.000) habis, batch 2 (5 @ 12.000) sisa 3
        $this->assertSame(0.0, (float) $batches[0]->fresh()->qty_sisa);
        $this->assertSame(3.0, (float) $batches[1]->fresh()->qty_sisa);

        // HPP = 10*10.000 + 2*12.000 = 124.000
        $hpp = StokBatchUsage::where('detail_transaksi_id', $transaksi->detailTransaksis()->first()->id)
            ->sum('subtotal');
        $this->assertSame(124000.0, (float) $hpp);

        $usages = StokBatchUsage::all();
        $this->assertCount(2, $usages);
        $this->assertSame(10.0, (float) $usages[0]->qty);
        $this->assertSame(2.0, (float) $usages[1]->qty);
    }

    public function test_penjualan_melebihi_stok_ditolak(): void
    {
        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $this->actingAsApi($this->user)
            ->postJson('/api/transaksi', [
                'tanggal' => '2026-08-10',
                'tipe_transaksi' => 'penjualan',
                'client_id' => $this->customer->id,
                'keterangan' => null,
                'items' => [
                    ['barang_id' => $this->barang->id, 'kuantitas' => 15, 'harga' => 15000],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Stok barang tidak mencukupi.');

        // Stok tidak berubah menjadi negatif dan tidak ada penjualan tersimpan
        $this->assertSame(10.0, (float) $this->barang->fresh()->stok);
        $this->assertSame(0, Transaksi::where('tipe_transaksi', 'penjualan')->count());
    }

    public function test_transaksi_penjualan_berhasil_hitung_total(): void
    {
        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 20, 'harga' => 10000],
        ], '2026-08-01');

        $transaksi = $this->buatPenjualan([
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ], '2026-08-10');

        $this->assertSame(60000.0, (float) $transaksi->fresh()->total);
    }

    public function test_hapus_pembelian_yang_memutus_penjualan_ditolak_dan_dirollback(): void
    {
        $beli1 = $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 12000],
        ], '2026-08-05');

        $this->buatPenjualan([
            ['barang_id' => $this->barang->id, 'kuantitas' => 12, 'harga' => 15000],
        ], '2026-08-10');

        // Sebelum hapus: stok = 10 + 5 - 12 = 3
        $this->assertSame(3.0, (float) $this->barang->fresh()->stok);

        // Hapus pembelian pertama (batch 10 @ 10.000). Penjualan 12 hanya bisa
        // dipenuhi 5 unit dari batch kedua, sehingga reapply gagal -> rollback.
        $this->actingAsApi($this->user)
            ->deleteJson('/api/transaksi/'.$beli1->id)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Stok barang tidak mencukupi.');

        // Data tetap utuh (rollback)
        $this->assertSame(3.0, (float) $this->barang->fresh()->stok);
        $this->assertDatabaseHas('transaksis', ['id' => $beli1->id]);
        $this->assertSame(2, StokBatch::count());
    }

    public function test_hapus_penjualan_mengembalikan_stok_ke_batch(): void
    {
        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $this->buatPembelian([
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 12000],
        ], '2026-08-05');

        $jual = $this->buatPenjualan([
            ['barang_id' => $this->barang->id, 'kuantitas' => 12, 'harga' => 15000],
        ], '2026-08-10');

        $this->assertSame(3.0, (float) $this->barang->fresh()->stok);

        $this->actingAsApi($this->user)
            ->deleteJson('/api/transaksi/'.$jual->id)
            ->assertOk();

        // Stok kembali 15 dan batch dipulihkan
        $this->assertSame(15.0, (float) $this->barang->fresh()->stok);

        $batches = StokBatch::orderBy('id')->get();
        $this->assertSame(10.0, (float) $batches[0]->fresh()->qty_sisa);
        $this->assertSame(5.0, (float) $batches[1]->fresh()->qty_sisa);

        // Usage untuk penjualan dihapus
        $this->assertSame(0, StokBatchUsage::count());
    }
}
