<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use App\Models\Jurnal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class PakanCurahJurnalTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Barang $barangCurah;

    private Barang $barangSentrat;

    private Client $supplier;

    private Client $customer;

    private array $akuns;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->akuns = $this->buatAkunSistem();
        $this->buatAkunDetail($this->akuns);

        $this->barangCurah = $this->buatBarang('BRG-C1', 'Jagung OC', 'Pakan Curah', 'pakan');
        $this->barangSentrat = $this->buatBarang('BRG-S1', 'Sentrat A', 'Pakan Sentrat/Pabrikan', 'pakan');

        $this->supplier = $this->buatClient('Supplier Curah', 'Supplier');
        $this->customer = $this->buatClient('Pembeli Curah', 'Pedagang');
    }

    public function test_pembelian_curah_memakai_stok_pakan_curah_dan_hutang_pakan_curah(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);

        $this->assertSame(1, Jurnal::count());

        $stok = Akun::system('stok_pakan_curah');
        $hutang = Akun::system('hutang_pakan_curah');

        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $stok->id,
            'debit' => 200000,
            'kredit' => 0,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $hutang->id,
            'debit' => 0,
            'kredit' => 200000,
        ]);

        // Akun stok/hutang umum tidak terpakai
        $this->assertDatabaseMissing('jurnal_details', ['akun_id' => $this->akuns['stok']->id]);
        $this->assertDatabaseMissing('jurnal_details', ['akun_id' => $this->akuns['hutang']->id]);
    }

    public function test_penjualan_curah_memakai_piutang_dan_penjualan_serta_hpp_pakan_curah(): void
    {
        // Beli dulu agar ada stok
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);

        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 50, 'harga' => 2500],
        ]);

        $piutang = Akun::system('piutang_pakan_curah');
        $penjualan = Akun::system('penjualan_pakan_curah');
        $hpp = Akun::system('hpp_pakan_curah');
        $stok = Akun::system('stok_pakan_curah');

        // Dr Piutang Pakan Curah
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $piutang->id,
            'debit' => 125000,
            'kredit' => 0,
        ]);
        // Cr Penjualan Pakan Curah
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $penjualan->id,
            'debit' => 0,
            'kredit' => 125000,
        ]);
        // Dr HPP Pakan Curah (FIFO: 50 × 2000 = 100000)
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $hpp->id,
            'debit' => 100000,
            'kredit' => 0,
        ]);
        // Cr Stok Pakan Curah
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $stok->id,
            'debit' => 0,
            'kredit' => 100000,
        ]);

        // Akun generik tidak terpakai untuk penjualan
        $this->assertDatabaseMissing('jurnal_details', ['akun_id' => $this->akuns['piutang']->id]);
        $this->assertDatabaseMissing('jurnal_details', ['akun_id' => $this->akuns['hpp']->id]);
    }

    public function test_retur_pembelian_curah_membalik_stok_dan_hutang_pakan_curah(): void
    {
        $beli = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);

        $this->simpanRetur($this->user, 'pembelian_retur', $beli, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 20, 'harga' => 2000],
        ]);

        $hutang = Akun::system('hutang_pakan_curah');
        $stok = Akun::system('stok_pakan_curah');

        // Dr Hutang Pakan Curah
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $hutang->id,
            'debit' => 40000,
            'kredit' => 0,
        ]);
        // Cr Stok Pakan Curah
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $stok->id,
            'debit' => 0,
            'kredit' => 40000,
        ]);
    }

    public function test_retur_penjualan_curah_membalik_piutang_penjualan_dan_hpp(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);

        $jual = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 50, 'harga' => 2500],
        ]);

        $this->simpanRetur($this->user, 'penjualan_retur', $jual, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 10, 'harga' => 2500],
        ]);

        $piutang = Akun::system('piutang_pakan_curah');
        $penjualan = Akun::system('penjualan_pakan_curah');
        $hpp = Akun::system('hpp_pakan_curah');
        $stok = Akun::system('stok_pakan_curah');

        // Cr Piutang Pakan Curah (25000)
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $piutang->id,
            'debit' => 0,
            'kredit' => 25000,
        ]);
        // Dr Penjualan Pakan Curah
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $penjualan->id,
            'debit' => 25000,
            'kredit' => 0,
        ]);
        // Dr Stok Pakan Curah (HPP balik: 10 × 2000 = 20000)
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $stok->id,
            'debit' => 20000,
            'kredit' => 0,
        ]);
        // Cr HPP Pakan Curah
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $hpp->id,
            'debit' => 0,
            'kredit' => 20000,
        ]);
    }

    public function test_transaksi_campuran_curah_dan_sentrat_menghasilkan_baris_jurnal_terpisah(): void
    {
        // Beli kedua barang dulu
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 100, 'harga' => 2000],
        ]);
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barangSentrat->id, 'kuantitas' => 50, 'harga' => 5000],
        ]);

        $jual = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barangCurah->id, 'kuantitas' => 30, 'harga' => 2500],
            ['barang_id' => $this->barangSentrat->id, 'kuantitas' => 10, 'harga' => 6000],
        ]);

        $jurnalPenjualan = $jual->jurnals->last();

        // Harus ada 2 baris piutang (Curah + Pedagang)
        $piutangCurah = Akun::system('piutang_pakan_curah');
        $piutangPedagang = Akun::where('nama', 'Piutang Pedagang')->first();

        $details = $jurnalPenjualan->details;
        $idAkuns = $details->pluck('akun_id')->all();

        $this->assertContains($piutangCurah->id, $idAkuns);
        $this->assertContains($piutangPedagang->id, $idAkuns);

        // Stok Pakan Curah dan Stok Pakan harus berbeda baris
        $stokCurah = Akun::system('stok_pakan_curah');
        $stokPakan = Akun::where('nama', 'Stok Pakan')->first();
        $this->assertContains($stokCurah->id, $idAkuns);
        $this->assertContains($stokPakan->id, $idAkuns);
    }
}
