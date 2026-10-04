<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Jurnal;
use App\Models\Kategori;
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

        $this->assertDatabaseHas('jurnals', [
            'client_id' => $supplier->id,
            'entitas_type' => 'hutang',
            'keterangan' => 'Pembelian kredit manual',
        ]);

        $jurnal = Jurnal::where('entitas_type', 'hutang')->first();
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

        $this->buatHutang($supplier, 300000, $this->user, '2026-09-01');
        $this->buatHutang($supplier, 200000, $this->user, '2026-09-02');

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

        $this->assertSame(2, Jurnal::where('journalable_type', Jurnal::class)->count());

        $hutangs = Jurnal::where('entitas_type', 'hutang')->orderBy('tanggal')->get();
        $this->assertSame('lunas', $hutangs[0]->statusEntitas());
        $this->assertSame(0.0, $hutangs[0]->sisaEntitas());

        $this->assertSame('belum_lunas', $hutangs[1]->statusEntitas());
        $this->assertSame(100000.0, $hutangs[1]->sisaEntitas());
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

        $this->assertDatabaseHas('jurnals', [
            'client_id' => $customer->id,
            'entitas_type' => 'piutang',
            'keterangan' => 'Penjualan kredit manual',
        ]);

        $jurnal = Jurnal::where('entitas_type', 'piutang')->first();
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

        $this->buatPiutang($customer, 400000, $this->user, '2026-09-01');

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

        $this->assertSame(1, Jurnal::where('journalable_type', Jurnal::class)->count());

        $piutang = Jurnal::where('entitas_type', 'piutang')->first();
        $this->assertSame('lunas', $piutang->statusEntitas());
        $this->assertSame(0.0, $piutang->sisaEntitas());
    }

    public function test_bayar_hutang_gagal_jika_melebihi_sisa(): void
    {
        $supplier = $this->buatClient('Supplier Overpay', 'supplier');

        $this->buatHutang($supplier, 100000, $this->user, '2026-09-01');

        $response = $this->actingAsApi($this->user)
            ->postJson('/api/hutang/bayar', [
                'tanggal' => '2026-09-05',
                'client_id' => $supplier->id,
                'jumlah' => 200000,
            ]);

        $response->assertStatus(422);
        $this->assertSame(0, Jurnal::where('journalable_type', Jurnal::class)->count());
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

        $this->buatHutang($supplier, 250000, $this->user, '2026-09-01');

        $this->actingAsApi($this->user)
            ->postJson('/api/hutang/bayar', [
                'tanggal' => '2026-09-05',
                'client_id' => $supplier->id,
                'jumlah' => 250000,
                'akun_pembayaran_id' => $akunBank->id,
            ])
            ->assertCreated();

        $pembayaran = Jurnal::where('journalable_type', Jurnal::class)->first();
        $this->assertNotNull($pembayaran);

        $detailKas = $pembayaran->details->firstWhere('akun_id', Akun::system('kas')->id);
        $detailBank = $pembayaran->details->firstWhere('akun_id', $akunBank->id);
        $detailHutang = $pembayaran->details->firstWhere('akun_id', Akun::system('hutang')->id);

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

        $this->assertSame(0, Jurnal::where('entitas_type', 'hutang')->count());
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
