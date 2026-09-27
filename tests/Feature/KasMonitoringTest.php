<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Hutang;
use App\Models\Kategori;
use App\Models\Piutang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class KasMonitoringTest extends TestCase
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

    public function test_kas_menampilkan_saldo_kemarin_pemasukan_pengeluaran_saldo_akhir(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');
        $customer = $this->buatClient('Customer A', 'customer');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 15000],
        ]);

        // Kas keluar: bayar hutang 100.000 pada 10 Agu.
        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'hutang_id' => Hutang::first()->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 100000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        // Kas masuk: terima piutang 150.000 pada 11 Agu.
        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/piutang', [
                'piutang_id' => Piutang::first()->id,
                'tanggal' => '2026-08-11',
                'jumlah' => 150000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/kas?tanggal=2026-08-11')
            ->assertOk();

        $this->assertSame('2026-08-11', $response->json('tanggal'));

        $kas = collect($response->json('items'))->firstWhere('system_code', 'kas');
        $this->assertNotNull($kas);
        $this->assertSame(-100000.0, (float) $kas['saldo_kemarin']);
        $this->assertSame(150000.0, (float) $kas['pemasukan']);
        $this->assertSame(0.0, (float) $kas['pengeluaran']);
        $this->assertSame(50000.0, (float) $kas['saldo_akhir']);

        $this->assertSame(150000.0, (float) $response->json('total_masuk'));
        $this->assertSame(0.0, (float) $response->json('total_keluar'));
        $this->assertSame(50000.0, (float) $response->json('total_akhir'));
    }

    public function test_saldo_kemarin_menghitung_mutasi_sebelum_tanggal(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        // Mutasi tanggal 10 Agu.
        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'hutang_id' => Hutang::first()->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 40000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/kas?tanggal=2026-08-11')
            ->assertOk()
            ->assertJsonPath('tanggal', '2026-08-11');

        $kas = collect($response->json('items'))->firstWhere('system_code', 'kas');
        $this->assertSame(-40000.0, (float) $kas['saldo_kemarin']);
        $this->assertSame(0.0, (float) $kas['pemasukan']);
        $this->assertSame(0.0, (float) $kas['pengeluaran']);
        $this->assertSame(-40000.0, (float) $kas['saldo_akhir']);
    }

    public function test_monitoring_memuat_akun_bank_terpisah(): void
    {
        $supplier = $this->buatClient('Supplier Bank', 'supplier');

        $bankBca = Kategori::create(['nama' => 'Bank BCA', 'jenis' => 'aset', 'status' => 'aktif']);
        $akunBank = Akun::create([
            'kode' => '1103',
            'nama' => 'Kas Bank BCA',
            'kategori_id' => $bankBca->id,
            'saldo_normal' => 'debit',
            'status' => 'aktif',
            'system_code' => null,
        ]);

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'hutang_id' => Hutang::first()->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 100000,
                'akun_pembayaran_id' => $akunBank->id,
            ])
            ->assertCreated();

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/kas?tanggal=2026-08-10')
            ->assertOk();

        $bank = collect($response->json('items'))->firstWhere('id', $akunBank->id);
        $this->assertNotNull($bank);
        $this->assertSame('Bank BCA', $bank['kategori']);
        $this->assertSame(0.0, (float) $bank['saldo_kemarin']);
        $this->assertSame(0.0, (float) $bank['pemasukan']);
        $this->assertSame(100000.0, (float) $bank['pengeluaran']);
        $this->assertSame(-100000.0, (float) $bank['saldo_akhir']);

        $kas = collect($response->json('items'))->firstWhere('system_code', 'kas');
        $this->assertSame(0.0, (float) $kas['pengeluaran'], 'Bayaran via bank tidak boleh menyentuh kas tunai.');
    }

    public function test_kas_tanpa_mutasi_mengembalikan_nilai_nol(): void
    {
        $this->actingAsApi($this->user)
            ->getJson('/api/kas')
            ->assertOk()
            ->assertJsonPath('total_masuk', 0)
            ->assertJsonPath('total_keluar', 0)
            ->assertJsonPath('total_akhir', 0);
    }
}
