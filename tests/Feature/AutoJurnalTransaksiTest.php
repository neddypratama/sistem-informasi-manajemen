<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use App\Models\Hutang;
use App\Models\Jurnal;
use App\Models\Piutang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class AutoJurnalTransaksiTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Barang $barang;

    private Client $supplier;

    private Client $customer;

    private Akun $akunKas;

    private Akun $akunPiutang;

    private Akun $akunStok;

    private Akun $akunHutang;

    private Akun $akunPenjualan;

    private array $akuns;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->akuns = $this->buatAkunSistem();
        $this->akunKas = $this->akuns['kas'];
        $this->akunPiutang = $this->akuns['piutang'];
        $this->akunStok = $this->akuns['stok'];
        $this->akunHutang = $this->akuns['hutang'];
        $this->akunPenjualan = $this->akuns['penjualan'];

        $this->barang = $this->buatBarang();
        $this->supplier = $this->buatClient('Supplier A', 'supplier');
        $this->customer = $this->buatClient('Customer B', 'customer');
    }

    public function test_pembelian_membuat_jurnal_persediaan_dan_hutang_tanpa_kas(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->assertSame(1, Jurnal::count());

        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $this->akunStok->id,
            'debit' => 100000,
            'kredit' => 0,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $this->akunHutang->id,
            'debit' => 0,
            'kredit' => 100000,
        ]);

        // Kas tidak tersentuh karena transaksi selalu kredit
        $this->assertDatabaseMissing('jurnal_details', ['akun_id' => $this->akunKas->id]);

        // Pembelian selalu membentuk hutang supplier
        $this->assertSame(1, Hutang::count());
        $this->assertSame('belum_lunas', Hutang::first()->status);
        $this->assertSame(100000.0, (float) Hutang::first()->total);
    }

    public function test_penjualan_membuat_jurnal_piutang_penjualan_dan_hpp(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        $penjualanJurnal = Jurnal::orderByDesc('id')->first();

        // Piutang debit 60.000, Penjualan kredit 60.000, HPP debit 40.000, Stok kredit 40.000
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $penjualanJurnal->id,
            'akun_id' => $this->akunPiutang->id,
            'debit' => 60000,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $penjualanJurnal->id,
            'akun_id' => $this->akunPenjualan->id,
            'kredit' => 60000,
        ]);

        // Kelompok tak dikenal memakai akun sistem HPP (5101)
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $penjualanJurnal->id,
            'akun_id' => $this->akuns['hpp']->id,
            'debit' => 40000,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $penjualanJurnal->id,
            'akun_id' => $this->akunStok->id,
            'kredit' => 40000,
        ]);

        $this->assertDatabaseMissing('jurnal_details', [
            'jurnal_id' => $penjualanJurnal->id,
            'akun_id' => $this->akunKas->id,
        ]);

        // Penjualan selalu membentuk piutang customer
        $this->assertSame(1, Piutang::count());
        $this->assertSame('belum_lunas', Piutang::first()->status);
        $this->assertSame(60000.0, (float) Piutang::first()->total);
    }

    public function test_delete_transaksi_menghapus_jurnal_dan_piutang(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $penjualan = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        $this->assertSame(2, Jurnal::count());
        $this->assertSame(1, Piutang::count());

        $this->actingAsApi($this->user)
            ->deleteJson('/api/transaksi/'.$penjualan->id)
            ->assertOk();

        $this->assertSame(1, Jurnal::count());
        $this->assertSame(0, Piutang::count());
        $this->assertDatabaseMissing('transaksis', ['id' => $penjualan->id]);
    }

    public function test_metode_pembayaran_selalu_kredit_meski_dikirim_tunai(): void
    {
        $transaksi = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->assertSame('kredit', $transaksi->metode_pembayaran);
        $this->assertSame(1, Hutang::count());
    }

    public function test_pembelian_telur_memakai_stok_telur_dan_hutang_peternak(): void
    {
        $akuns = $this->buatAkunDetail($this->akuns);
        $peternak = $this->buatClient('Peternak A', 'Peternak');
        $barangTelur = $this->buatBarang('BRG-T01', 'Telur Bebek', 'Telur Bebek', 'telur');

        $this->simpanTransaksi($this->user, 'pembelian', $peternak, [
            ['barang_id' => $barangTelur->id, 'kuantitas' => 5, 'harga' => 2000],
        ]);

        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $akuns['Stok Telur']->id,
            'debit' => 10000,
            'kredit' => 0,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $akuns['Hutang Peternak']->id,
            'debit' => 0,
            'kredit' => 10000,
        ]);
    }

    public function test_pembelian_pakan_memakai_akun_hutang_per_client(): void
    {
        $this->buatAkunDetail($this->akuns);
        $supplier = $this->buatClient('Sentrat SK', 'supplier');
        $barangPakan = $this->buatBarang('BRG-P02', 'Sentrat 511', 'Pakan Sentrat/Pabrikan', 'pakan');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $barangPakan->id, 'kuantitas' => 20, 'harga' => 5000],
        ]);

        $akunHutangClient = Akun::where('nama', 'Hutang Sentrat SK')->first();
        $this->assertNotNull($akunHutangClient);
        $this->assertSame('kredit', $akunHutangClient->saldo_normal);
        $this->assertSame('Liabilitas', $akunHutangClient->kategori->nama);

        $this->assertDatabaseHas('jurnal_details', [
            'akun_id' => $akunHutangClient->id,
            'debit' => 0,
            'kredit' => 100000,
        ]);

        // Pembelian berikutnya untuk client yang sama memakai akun yang sama.
        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $barangPakan->id, 'kuantitas' => 10, 'harga' => 5000],
        ]);

        $this->assertSame(1, Akun::where('nama', 'Hutang Sentrat SK')->count());
        $this->assertSame(2, $akunHutangClient->jurnalDetails()->count());
    }

    public function test_penjualan_pakan_memakai_piutang_peternak_dan_penjualan_pakan(): void
    {
        $akuns = $this->buatAkunDetail($this->akuns);
        $supplier = $this->buatClient('Supplier Pakan', 'supplier');
        $peternak = $this->buatClient('Peternak B', 'Peternak');
        $barangPakan = $this->buatBarang('BRG-P01', 'Sentrat 144', 'Pakan Sentrat/Pabrikan', 'pakan');

        // Beli dulu agar ada stok
        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $barangPakan->id, 'kuantitas' => 100, 'harga' => 5000],
        ]);

        // Jual ke peternak
        $this->simpanTransaksi($this->user, 'penjualan', $peternak, [
            ['barang_id' => $barangPakan->id, 'kuantitas' => 10, 'harga' => 7000],
        ]);

        $penjualanJurnal = Jurnal::orderByDesc('id')->first();

        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $penjualanJurnal->id,
            'akun_id' => $akuns['Piutang Peternak']->id,
            'debit' => 70000,
        ]);
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $penjualanJurnal->id,
            'akun_id' => $akuns['Penjualan Pakan Sentrat/Pabrikan']->id,
            'kredit' => 70000,
        ]);
    }
}
