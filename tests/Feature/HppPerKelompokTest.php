<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\JenisBarang;
use App\Models\Jurnal;
use App\Models\Kategori;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class HppPerKelompokTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    public function test_opsi_beban_tidak_memuat_akun_hpp(): void
    {
        $this->buatAkunSistem();
        $kategori = Kategori::firstOrCreate(['nama' => 'HPP Telur'], ['jenis' => 'beban', 'status' => 'aktif']);
        Akun::create([
            'kode' => '5901',
            'nama' => 'HPP Telur',
            'kategori_id' => $kategori->id,
            'saldo_normal' => 'debit',
            'status' => 'aktif',
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/jurnal/create-data')
            ->assertOk();

        $namaFixedBeban = collect($response->json('jenisOptions.beban.fixed'))->pluck('nama')->all();

        $this->assertNotContains('HPP Telur', $namaFixedBeban);
        $this->assertNotContains('HPP Curah', $namaFixedBeban);
        // Akun beban biasa tetap muncul
        $this->assertContains('Selisih Stok', $namaFixedBeban);
    }

    public function test_akun_hpp_ditolak_sebagai_akun_utama_jurnal_beban(): void
    {
        $akuns = $this->buatAkunSistem();
        $kategori = Kategori::firstOrCreate(['nama' => 'HPP Telur'], ['jenis' => 'beban', 'status' => 'aktif']);
        $hpp = Akun::firstOrCreate(['nama' => 'HPP Telur'], [
            'kode' => '5901',
            'nama' => 'HPP Telur',
            'kategori_id' => $kategori->id,
            'saldo_normal' => 'debit',
            'status' => 'aktif',
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/jurnal/jenis', [
                'jenis' => 'beban',
                'tanggal' => '2026-09-01',
                'jumlah' => 50000,
                'akun_fixed' => $hpp->id,
                'akun_lawan' => $akuns['kas']->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['akun_fixed']);

        $this->assertSame(0, Jurnal::count());
    }

    public function test_hpp_per_kelompok_dibuat_otomatis_saat_penjualan(): void
    {
        $this->buatAkunSistem();
        $this->buatAkunDetail([]);

        $jenis = JenisBarang::create([
            'nama' => 'Telur Test',
            'keterangan' => null,
            'status' => 'aktif',
            'kelompok' => 'telur',
        ]);
        $barang = Barang::create([
            'jenis_barang_id' => $jenis->id,
            'kode_barang' => 'BRG-HT01',
            'nama_barang' => 'Telur Test',
            'satuan' => 'butir',
            'stok' => 0,
            'status' => 'aktif',
        ]);
        $supplier = $this->buatClient('Peternak Test', 'Peternak');
        $customer = $this->buatClient('Pedagang Test', 'Pedagang');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $barang->id, 'kuantitas' => 10, 'harga' => 2000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $customer, [
            ['barang_id' => $barang->id, 'kuantitas' => 5, 'harga' => 3000],
        ]);

        $kategori = Kategori::where('nama', 'HPP Telur')->first();
        $this->assertNotNull($kategori, 'Kategori HPP per kelompok harus dibuat otomatis');
        $this->assertSame('beban', $kategori->jenis);

        $akunHpp = Akun::where('nama', 'HPP Telur')->first();
        $this->assertNotNull($akunHpp, 'Akun HPP per kelompok harus dibuat otomatis');
        $this->assertSame($kategori->id, $akunHpp->kategori_id);
        $this->assertSame('debit', $akunHpp->saldo_normal);

        // Tidak ada akun/kategori HPP per jenis barang
        $this->assertNull(Kategori::where('nama', 'HPP Telur Test')->first());
        $this->assertNull(Akun::where('nama', 'HPP Telur Test')->first());

        $penjualanJurnal = Jurnal::orderByDesc('id')->first();
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $penjualanJurnal->id,
            'akun_id' => $akunHpp->id,
            'debit' => 10000,
        ]);
    }

    public function test_penjualan_kedua_memakai_akun_hpp_kelompok_yang_sama(): void
    {
        $this->buatAkunSistem();
        $this->buatAkunDetail([]);

        $jenis = JenisBarang::create([
            'nama' => 'Telur Test 2',
            'keterangan' => null,
            'status' => 'aktif',
            'kelompok' => 'telur',
        ]);
        $barang = Barang::create([
            'jenis_barang_id' => $jenis->id,
            'kode_barang' => 'BRG-HT02',
            'nama_barang' => 'Telur Test 2',
            'satuan' => 'butir',
            'stok' => 0,
            'status' => 'aktif',
        ]);
        $supplier = $this->buatClient('Peternak Test', 'Peternak');
        $customer = $this->buatClient('Pedagang Test', 'Pedagang');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $barang->id, 'kuantitas' => 10, 'harga' => 2000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $customer, [
            ['barang_id' => $barang->id, 'kuantitas' => 4, 'harga' => 3000],
        ]);

        $akunPertama = Akun::where('nama', 'HPP Telur')->firstOrFail();

        // Transaksi berikutnya tidak membuat akun/kategori duplikat
        $this->simpanTransaksi($this->user, 'penjualan', $customer, [
            ['barang_id' => $barang->id, 'kuantitas' => 2, 'harga' => 3000],
        ]);

        $this->assertSame(1, Akun::where('nama', 'HPP Telur')->count());
        $this->assertSame(1, Kategori::where('nama', 'HPP Telur')->count());
        $this->assertSame(2, $akunPertama->jurnalDetails()->count());
    }

    public function test_jenis_berbeda_pada_kelompok_sama_berbagi_satu_akun_hpp(): void
    {
        $this->buatAkunSistem();
        $this->buatAkunDetail([]);

        $horn = JenisBarang::create(['nama' => 'Telur Horn', 'keterangan' => null, 'status' => 'aktif', 'kelompok' => 'telur']);
        $puyuh = JenisBarang::create(['nama' => 'Telur Puyuh', 'keterangan' => null, 'status' => 'aktif', 'kelompok' => 'telur']);
        $obat = JenisBarang::create(['nama' => 'Obat Test', 'keterangan' => null, 'status' => 'aktif', 'kelompok' => 'obat']);

        $barangHorn = Barang::create([
            'jenis_barang_id' => $horn->id,
            'kode_barang' => 'BRG-HN01',
            'nama_barang' => 'Telur Horn',
            'satuan' => 'butir',
            'stok' => 0,
            'status' => 'aktif',
        ]);
        $barangPuyuh = Barang::create([
            'jenis_barang_id' => $puyuh->id,
            'kode_barang' => 'BRG-PY01',
            'nama_barang' => 'Telur Puyuh',
            'satuan' => 'butir',
            'stok' => 0,
            'status' => 'aktif',
        ]);
        $barangObat = Barang::create([
            'jenis_barang_id' => $obat->id,
            'kode_barang' => 'BRG-OB01',
            'nama_barang' => 'Obat Test',
            'satuan' => 'box',
            'stok' => 0,
            'status' => 'aktif',
        ]);
        $supplier = $this->buatClient('Peternak Test', 'Peternak');
        $customer = $this->buatClient('Pedagang Test', 'Pedagang');

        foreach ([$barangHorn, $barangPuyuh, $barangObat] as $barang) {
            $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
                ['barang_id' => $barang->id, 'kuantitas' => 10, 'harga' => 2000],
            ]);
            $this->simpanTransaksi($this->user, 'penjualan', $customer, [
                ['barang_id' => $barang->id, 'kuantitas' => 5, 'harga' => 3000],
            ]);
        }

        // Dua jenis telur memakai satu akun HPP Telur
        $akunTelur = Akun::where('nama', 'HPP Telur')->firstOrFail();
        $this->assertSame(2, $akunTelur->jurnalDetails()->count());

        // Obat memakai akun HPP terpisah
        $akunObat = Akun::where('nama', 'HPP Obat-Obatan')->firstOrFail();
        $this->assertSame(1, $akunObat->jurnalDetails()->count());

        $this->assertSame(1, Akun::where('nama', 'HPP Telur')->count());
        $this->assertSame(1, Akun::where('nama', 'HPP Obat-Obatan')->count());
    }
}
