<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Hutang;
use App\Models\Jurnal;
use App\Models\Kategori;
use App\Models\PembayaranHutang;
use App\Models\PembayaranPiutang;
use App\Models\Piutang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class HutangPiutangApiTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->buatAkunSistem();
    }

    public function test_tambah_hutang_berhasil_membuat_record_dan_jurnal(): void
    {
        $supplier = $this->buatClient('Supplier Test', 'supplier');

        $response = $this->actingAsApi($this->user)
            ->postJson('/api/hutang/tambah', [
                'tanggal' => '2026-09-01',
                'client_id' => $supplier->id,
                'total' => 500000,
                'keterangan' => 'Pembelian kredit manual',
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Transaksi tambah hutang berhasil disimpan.');

        $this->assertDatabaseHas('hutangs', [
            'client_id' => $supplier->id,
            'total' => 500000,
            'status' => 'belum_lunas',
            'keterangan' => 'Pembelian kredit manual',
        ]);

        $hutang = Hutang::first();
        $this->assertNotNull($hutang->jurnal_id);

        $jurnal = Jurnal::find($hutang->jurnal_id);
        $this->assertNotNull($jurnal);

        // Tambah hutang: Debit Kas, Kredit Hutang
        $detailKas = $jurnal->details->firstWhere('akun_id', Akun::system('kas')->id);
        $detailHutang = $jurnal->details->firstWhere('akun_id', Akun::system('hutang')->id);

        $this->assertSame(500000.0, (float) $detailKas->debit);
        $this->assertSame(500000.0, (float) $detailHutang->kredit);
    }

    public function test_bayar_hutang_berhasil_mengalokasikan_ke_faktur_fifo(): void
    {
        $supplier = $this->buatClient('Supplier FIFO', 'supplier');

        Hutang::create([
            'no_hutang' => 'HT-20260901-0001',
            'tanggal' => '2026-09-01',
            'client_id' => $supplier->id,
            'total' => 300000,
            'status' => 'belum_lunas',
            'created_by' => $this->user->id,
        ]);

        Hutang::create([
            'no_hutang' => 'HT-20260902-0001',
            'tanggal' => '2026-09-02',
            'client_id' => $supplier->id,
            'total' => 200000,
            'status' => 'belum_lunas',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAsApi($this->user)
            ->postJson('/api/hutang/bayar', [
                'tanggal' => '2026-09-05',
                'client_id' => $supplier->id,
                'jumlah' => 400000,
                'keterangan' => 'Bayar sebagian fifo',
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Pembayaran hutang berhasil disimpan.');

        $this->assertSame(2, PembayaranHutang::count());

        $hutangs = Hutang::orderBy('tanggal')->get();
        $this->assertSame('lunas', $hutangs[0]->status);
        $this->assertSame(0.0, $hutangs[0]->sisa());

        $this->assertSame('belum_lunas', $hutangs[1]->status);
        $this->assertSame(100000.0, $hutangs[1]->sisa());
    }

    public function test_tambah_piutang_berhasil_membuat_record_dan_jurnal(): void
    {
        $customer = $this->buatClient('Customer Test', 'customer');

        $response = $this->actingAsApi($this->user)
            ->postJson('/api/piutang/tambah', [
                'tanggal' => '2026-09-01',
                'client_id' => $customer->id,
                'total' => 750000,
                'keterangan' => 'Penjualan kredit manual',
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Transaksi tambah piutang berhasil disimpan.');

        $this->assertDatabaseHas('piutangs', [
            'client_id' => $customer->id,
            'total' => 750000,
            'status' => 'belum_lunas',
            'keterangan' => 'Penjualan kredit manual',
        ]);

        $piutang = Piutang::first();
        $this->assertNotNull($piutang->jurnal_id);

        $jurnal = Jurnal::find($piutang->jurnal_id);
        $this->assertNotNull($jurnal);

        // Tambah piutang: Debit Piutang, Kredit Kas
        $detailPiutang = $jurnal->details->firstWhere('akun_id', Akun::system('piutang')->id);
        $detailKas = $jurnal->details->firstWhere('akun_id', Akun::system('kas')->id);

        $this->assertSame(750000.0, (float) $detailPiutang->debit);
        $this->assertSame(750000.0, (float) $detailKas->kredit);
    }

    public function test_bayar_piutang_berhasil_mengalokasikan_ke_faktur_fifo(): void
    {
        $customer = $this->buatClient('Customer FIFO', 'customer');

        Piutang::create([
            'no_piutang' => 'PT-20260901-0001',
            'tanggal' => '2026-09-01',
            'client_id' => $customer->id,
            'total' => 400000,
            'status' => 'belum_lunas',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAsApi($this->user)
            ->postJson('/api/piutang/bayar', [
                'tanggal' => '2026-09-05',
                'client_id' => $customer->id,
                'jumlah' => 400000,
                'keterangan' => 'Pelunasan piutang',
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Penerimaan piutang berhasil disimpan.');

        $this->assertSame(1, PembayaranPiutang::count());

        $piutang = Piutang::first();
        $this->assertSame('lunas', $piutang->status);
        $this->assertSame(0.0, $piutang->sisa());
    }

    public function test_bayar_hutang_gagal_jika_melebihi_sisa(): void
    {
        $supplier = $this->buatClient('Supplier Overpay', 'supplier');

        Hutang::create([
            'no_hutang' => 'HT-20260901-0001',
            'tanggal' => '2026-09-01',
            'client_id' => $supplier->id,
            'total' => 100000,
            'status' => 'belum_lunas',
            'created_by' => $this->user->id,
        ]);

        $response = $this->actingAsApi($this->user)
            ->postJson('/api/hutang/bayar', [
                'tanggal' => '2026-09-05',
                'client_id' => $supplier->id,
                'jumlah' => 200000,
            ]);

        $response->assertStatus(422);
        $this->assertSame(0, PembayaranHutang::count());
    }

    public function test_bayar_hutang_dengan_akun_bank_mencatat_kas_bank_terpilih(): void
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

        Hutang::create([
            'no_hutang' => 'HT-20260903-0001',
            'tanggal' => '2026-09-01',
            'client_id' => $supplier->id,
            'total' => 250000,
            'status' => 'belum_lunas',
            'created_by' => $this->user->id,
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/hutang/bayar', [
                'tanggal' => '2026-09-05',
                'client_id' => $supplier->id,
                'jumlah' => 250000,
                'akun_pembayaran_id' => $akunBank->id,
            ])
            ->assertCreated();

        $pembayaran = PembayaranHutang::first();
        $this->assertSame($akunBank->id, $pembayaran->akun_pembayaran_id);

        $jurnal = Jurnal::find($pembayaran->jurnal_id);
        $detailKas = $jurnal->details->firstWhere('akun_id', Akun::system('kas')->id);
        $detailBank = $jurnal->details->firstWhere('akun_id', $akunBank->id);
        $detailHutang = $jurnal->details->firstWhere('akun_id', Akun::system('hutang')->id);

        $this->assertNull($detailKas);
        $this->assertSame(250000.0, (float) $detailBank->kredit);
        $this->assertSame(250000.0, (float) $detailHutang->debit);
    }

    public function test_tambah_hutang_wajib_memilih_akun_pembayaran(): void
    {
        $supplier = $this->buatClient('Supplier Tanpa Akun', 'supplier');

        $this->actingAsApi($this->user)
            ->postJson('/api/hutang/tambah', [
                'tanggal' => '2026-09-01',
                'client_id' => $supplier->id,
                'total' => 100000,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('akun_pembayaran_id');

        $this->assertSame(0, Hutang::count());
    }

    public function test_kas_bank_options_memuat_akun_kas_dan_bank(): void
    {
        $bankBca = Kategori::create(['nama' => 'Bank BCA', 'jenis' => 'aset', 'status' => 'aktif']);
        $akunBank = Akun::create([
            'kode' => '1103',
            'nama' => 'Kas Bank BCA',
            'kategori_id' => $bankBca->id,
            'saldo_normal' => 'debit',
            'status' => 'aktif',
            'system_code' => null,
        ]);

        $this->actingAsApi($this->user)
            ->getJson('/api/akun/kas-bank-options')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['id' => Akun::system('kas')->id, 'system_code' => 'kas'])
            ->assertJsonFragment(['id' => $akunBank->id, 'kategori' => 'Bank BCA']);
    }
}
