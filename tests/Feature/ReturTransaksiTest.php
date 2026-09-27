<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use App\Models\Jurnal;
use App\Models\StokBatch;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class ReturTransaksiTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Barang $barang;

    private Client $supplier;

    private Client $customer;

    private Akun $akunKas;

    private Akun $akunStok;

    private Akun $akunHutang;

    private Akun $akunPiutang;

    private Akun $akunPenjualan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $akuns = $this->buatAkunSistem();
        $this->akunKas = $akuns['kas'];
        $this->akunPiutang = $akuns['piutang'];
        $this->akunStok = $akuns['stok'];
        $this->akunHutang = $akuns['hutang'];
        $this->akunPenjualan = $akuns['penjualan'];

        $this->barang = $this->buatBarang();
        $this->supplier = $this->buatClient('Supplier A', 'supplier');
        $this->customer = $this->buatClient('Customer B', 'customer');
    }

    public function test_retur_pembelian_mengurangi_stok_dan_membuat_jurnal_balik(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->assertSame(10.0, (float) $this->barang->fresh()->stok);

        $this->simpanRetur($this->user, 'pembelian_retur', $pembelian, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 10000],
        ]);

        // Stok dan batch berkurang sesuai kuantitas yang diretur
        $this->assertSame(6.0, (float) $this->barang->fresh()->stok);
        $this->assertSame(6.0, (float) StokBatch::first()->fresh()->qty_sisa);

        // Jurnal retur pembelian: Dr Hutang 40.000, Cr Stok 40.000 (tanpa kas)
        $returJurnal = Jurnal::orderByDesc('id')->first();
        $this->assertSame('pembelian_retur', $returJurnal->journalable->tipe_transaksi);
        $this->assertDatabaseMissing('jurnal_details', [
            'jurnal_id' => $returJurnal->id,
            'akun_id' => $this->akunKas->id,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $returJurnal->id,
            'akun_id' => $this->akunHutang->id,
            'debit' => 40000,
            'kredit' => 0,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $returJurnal->id,
            'akun_id' => $this->akunStok->id,
            'debit' => 0,
            'kredit' => 40000,
        ]);
    }

    public function test_retur_pembelian_melebihi_sisa_ditolak(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 6, 'harga' => 15000],
        ]);

        // Sisa yang belum terjual tinggal 4; retur 5 harus ditolak
        $this->actingAsApi($this->user)
            ->postJson('/api/retur', [
                'tanggal' => '2026-08-15',
                'tipe_transaksi' => 'pembelian_retur',
                'sumber_id' => $pembelian->id,
                'items' => [
                    ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 10000],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Qty retur melebihi sisa stok yang belum terjual.');

        // Tidak ada retur tersimpan dan stok tidak berubah
        $this->assertSame(0, Transaksi::where('tipe_transaksi', 'pembelian_retur')->count());
        $this->assertSame(4.0, (float) $this->barang->fresh()->stok);
    }

    public function test_retur_penjualan_mengembalikan_stok_dan_membalik_hpp(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $penjualan = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        $this->assertSame(6.0, (float) $this->barang->fresh()->stok);

        $this->simpanRetur($this->user, 'penjualan_retur', $penjualan, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        // Stok dan batch kembali seperti sebelum penjualan
        $this->assertSame(10.0, (float) $this->barang->fresh()->stok);
        $this->assertSame(10.0, (float) StokBatch::first()->fresh()->qty_sisa);

        // Jurnal: Dr Penjualan 60.000, Cr Piutang 60.000, Dr Stok 40.000, Cr HPP 40.000 (tanpa kas)
        $returJurnal = Jurnal::orderByDesc('id')->first();
        $this->assertSame('penjualan_retur', $returJurnal->journalable->tipe_transaksi);
        $this->assertDatabaseMissing('jurnal_details', [
            'jurnal_id' => $returJurnal->id,
            'akun_id' => $this->akunKas->id,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $returJurnal->id,
            'akun_id' => $this->akunPenjualan->id,
            'debit' => 60000,
            'kredit' => 0,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $returJurnal->id,
            'akun_id' => $this->akunPiutang->id,
            'debit' => 0,
            'kredit' => 60000,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $returJurnal->id,
            'akun_id' => $this->akunStok->id,
            'debit' => 40000,
            'kredit' => 0,
        ]);

        // Pembalikan HPP memakai akun sistem HPP (kelompok barang tidak dikenal)
        $akunHpp = Akun::system('hpp');
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $returJurnal->id,
            'akun_id' => $akunHpp->id,
            'debit' => 0,
            'kredit' => 40000,
        ]);
    }

    public function test_retur_penjualan_melebihi_kuantitas_terjual_ditolak(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $penjualan = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/retur', [
                'tanggal' => '2026-08-15',
                'tipe_transaksi' => 'penjualan_retur',
                'sumber_id' => $penjualan->id,
                'items' => [
                    ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 15000],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Qty retur melebihi jumlah barang yang terjual.');

        $this->assertSame(0, Transaksi::where('tipe_transaksi', 'penjualan_retur')->count());
    }

    public function test_hapus_retur_pembelian_mengembalikan_stok(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $retur = $this->simpanRetur($this->user, 'pembelian_retur', $pembelian, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 10000],
        ]);

        $this->assertSame(6.0, (float) $this->barang->fresh()->stok);

        $this->actingAsApi($this->user)
            ->deleteJson('/api/retur/'.$retur->id)
            ->assertOk();

        // Stok dan batch balik ke 10
        $this->assertSame(10.0, (float) $this->barang->fresh()->stok);
        $this->assertSame(10.0, (float) StokBatch::first()->fresh()->qty_sisa);
        $this->assertDatabaseMissing('transaksis', ['id' => $retur->id]);
    }

    public function test_hapus_retur_penjualan_mengembalikan_stok(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $penjualan = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        $retur = $this->simpanRetur($this->user, 'penjualan_retur', $penjualan, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        $this->assertSame(10.0, (float) $this->barang->fresh()->stok);

        $this->actingAsApi($this->user)
            ->deleteJson('/api/retur/'.$retur->id)
            ->assertOk();

        // Stok kembali 6 (penjualan 4 tetap berlaku)
        $this->assertSame(6.0, (float) $this->barang->fresh()->stok);
        $this->assertSame(6.0, (float) StokBatch::first()->fresh()->qty_sisa);
        $this->assertDatabaseMissing('transaksis', ['id' => $retur->id]);
    }

    public function test_transaksi_berretur_tidak_bisa_diubah_atau_dihapus(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->simpanRetur($this->user, 'pembelian_retur', $pembelian, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->deleteJson('/api/transaksi/'.$pembelian->id)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Transaksi memiliki retur, tidak dapat dihapus.');

        $this->actingAsApi($this->user)
            ->putJson('/api/transaksi/'.$pembelian->id, [
                'tanggal' => '2026-08-02',
                'tipe_transaksi' => 'pembelian',
                'client_id' => $this->supplier->id,
                'items' => [
                    ['barang_id' => $this->barang->id, 'kuantitas' => 8, 'harga' => 10000],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Transaksi memiliki retur, tidak dapat diubah.');

        $this->assertDatabaseHas('transaksis', ['id' => $pembelian->id, 'total' => 100000]);
    }

    public function test_endpoint_sumber_memuat_detail_transaksi_untuk_retur(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->getJson('/api/retur/sumber/'.$pembelian->id.'/items')
            ->assertOk()
            ->assertJsonPath('id', $pembelian->id)
            ->assertJsonPath('nomor_transaksi', $pembelian->nomor_transaksi)
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.barang_id', $this->barang->id)
            ->assertJsonPath('items.0.qty_available', 10);
    }

    public function test_create_data_retur_hanya_memuat_transaksi_sesuai_tipe(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $penjualan = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        $this->actingAsApi($this->user)
            ->getJson('/api/retur/create-data?tipe=pembelian')
            ->assertOk()
            ->assertJsonCount(1, 'sumbers')
            ->assertJsonPath('sumbers.0.id', $pembelian->id);

        $this->actingAsApi($this->user)
            ->getJson('/api/retur/create-data?tipe=penjualan')
            ->assertOk()
            ->assertJsonCount(1, 'sumbers')
            ->assertJsonPath('sumbers.0.id', $penjualan->id);
    }

    public function test_retur_penjualan_barang_sama_dua_harga_berbeda_dihitung_presisi_per_baris(): void
    {
        // Pembelian modal: 20 pcs @ 10.000
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 20, 'harga' => 10000],
        ]);

        // Penjualan 2 baris barang yang sama tapi beda harga dan kuantitas
        $penjualan = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 8, 'harga' => 25000],
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 26000],
        ]);

        $details = $penjualan->detailTransaksis()->orderBy('id')->get();
        $this->assertCount(2, $details);
        $detail1 = $details[0];
        $detail2 = $details[1];

        // Cek item tersedia dari endpoint sumber: harus ada 2 row terpisah (8 dan 5)
        $this->actingAsApi($this->user)
            ->getJson('/api/retur/sumber/'.$penjualan->id.'/items')
            ->assertOk()
            ->assertJsonCount(2, 'items')
            ->assertJsonPath('items.0.detail_sumber_id', $detail1->id)
            ->assertJsonPath('items.0.qty_available', 8)
            ->assertJsonPath('items.1.detail_sumber_id', $detail2->id)
            ->assertJsonPath('items.1.qty_available', 5);

        // Retur 3 pcs dari baris 1 (@25.000) dan 2 pcs dari baris 2 (@26.000)
        $retur = $this->simpanRetur($this->user, 'penjualan_retur', $penjualan, [
            ['detail_sumber_id' => $detail1->id, 'barang_id' => $this->barang->id, 'kuantitas' => 3, 'harga' => 25000],
            ['detail_sumber_id' => $detail2->id, 'barang_id' => $this->barang->id, 'kuantitas' => 2, 'harga' => 26000],
        ]);

        // Total retur = 3*25000 + 2*26000 = 127.000
        $this->assertSame(127000.0, (float) $retur->total);

        // Stok awal 20 - terjual 13 + retur 5 = 12
        $this->assertSame(12.0, (float) $this->barang->fresh()->stok);

        // Pembalikan HPP = 5 pcs * 10.000 (modal) = 50.000 (bukan terduplikasi)
        $returJurnal = Jurnal::orderByDesc('id')->first();
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $returJurnal->id,
            'akun_id' => $this->akunStok->id,
            'debit' => 50000,
            'kredit' => 0,
        ]);

        // Cek sisa yang dapat diretur setelahnya: baris 1 sisa 5 (8-3), baris 2 sisa 3 (5-2)
        $this->actingAsApi($this->user)
            ->getJson('/api/retur/sumber/'.$penjualan->id.'/items')
            ->assertOk()
            ->assertJsonPath('items.0.qty_available', 5)
            ->assertJsonPath('items.1.qty_available', 3);

        // Mendorong retur melebihi sisa baris 1 (coba 6 pcs dari baris 1) harus ditolak
        $this->actingAsApi($this->user)
            ->postJson('/api/retur', [
                'tanggal' => '2026-08-16',
                'tipe_transaksi' => 'penjualan_retur',
                'sumber_id' => $penjualan->id,
                'items' => [
                    ['detail_sumber_id' => $detail1->id, 'barang_id' => $this->barang->id, 'kuantitas' => 6, 'harga' => 25000],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Qty retur melebihi jumlah barang yang terjual.');
    }

    public function test_retur_pembelian_barang_sama_dua_harga_berbeda_dihitung_presisi_per_baris(): void
    {
        // Pembelian 2 baris barang sama beda harga
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 12000],
        ]);

        $details = $pembelian->detailTransaksis()->orderBy('id')->get();
        $detail1 = $details[0];
        $detail2 = $details[1];

        // Retur 4 pcs dari baris 1 saja
        $retur = $this->simpanRetur($this->user, 'pembelian_retur', $pembelian, [
            ['detail_sumber_id' => $detail1->id, 'barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 10000],
        ]);

        $this->assertSame(40000.0, (float) $retur->total);
        $this->assertSame(16.0, (float) $this->barang->fresh()->stok);

        // Batch baris 1 berkurang ke 6, batch baris 2 tetap 10
        $this->assertSame(6.0, (float) StokBatch::where('detail_transaksi_id', $detail1->id)->first()->qty_sisa);
        $this->assertSame(10.0, (float) StokBatch::where('detail_transaksi_id', $detail2->id)->first()->qty_sisa);
    }
}
