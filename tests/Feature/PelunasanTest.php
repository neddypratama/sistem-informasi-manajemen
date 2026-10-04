<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Jurnal;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class PelunasanTest extends TestCase
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

    public function test_bayar_hutang_menghasilkan_jurnal_kas_dan_mengurangi_sisa(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $hutang = Jurnal::where('entitas_type', 'hutang')->first();
        $this->assertSame(100000.0, (float) $hutang->totalEntitas());
        $this->assertSame('belum_lunas', $hutang->statusEntitas());

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'hutang_id' => $hutang->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 100000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        $pembayaran = Jurnal::where('journalable_type', Jurnal::class)->first();
        $this->assertNotNull($pembayaran);

        // Bayar hutang: Dr Hutang, Cr Kas
        $detailKas = $pembayaran->details->firstWhere('akun_id', Akun::system('kas')->id);
        $detailHutang = $pembayaran->details->first(fn ($d) => $d->akun_id !== Akun::system('kas')->id);

        $this->assertSame(0.0, (float) $detailKas->debit);
        $this->assertSame(100000.0, (float) $detailKas->kredit);
        $this->assertSame(100000.0, (float) $detailHutang->debit);

        $hutang->refresh();
        $this->assertSame(0.0, $hutang->sisaEntitas());
        $this->assertSame('lunas', $hutang->statusEntitas());
    }

    public function test_terima_piutang_menghasilkan_jurnal_kas_dan_mengurangi_sisa(): void
    {
        $supplier = $this->buatClient('Supplier X', 'supplier');
        $customer = $this->buatClient('Customer A', 'customer');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 5000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        $piutang = Jurnal::where('entitas_type', 'piutang')->first();
        $this->assertSame(60000.0, (float) $piutang->totalEntitas());

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/piutang', [
                'piutang_id' => $piutang->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 60000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        $pembayaran = Jurnal::where('journalable_type', Jurnal::class)->first();
        $this->assertNotNull($pembayaran);

        // Terima piutang: Dr Kas, Cr Piutang
        $detailKas = $pembayaran->details->firstWhere('akun_id', Akun::system('kas')->id);
        $detailPiutang = $pembayaran->details->firstWhere('akun_id', Akun::system('piutang')->id);

        $this->assertSame(60000.0, (float) $detailKas->debit);
        $this->assertSame(0.0, (float) $detailKas->kredit);
        $this->assertSame(60000.0, (float) $detailPiutang->kredit);

        $this->assertSame(0.0, $piutang->sisaEntitas());
        $this->assertSame('lunas', $piutang->statusEntitas());
    }

    public function test_pembayaran_melebihi_sisa_ditolak(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $hutang = Jurnal::where('entitas_type', 'hutang')->first();

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'hutang_id' => $hutang->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 150000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('jumlah');

        $this->assertSame(0, Jurnal::where('journalable_type', Jurnal::class)->count());
    }

    public function test_hapus_pembayaran_mengembalikan_sisa_dan_status(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $hutang = Jurnal::where('entitas_type', 'hutang')->first();

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'hutang_id' => $hutang->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 100000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        $pembayaran = Jurnal::where('journalable_type', Jurnal::class)->first();

        $this->actingAsApi($this->user)
            ->deleteJson('/api/pelunasan/hutang/'.$pembayaran->id)
            ->assertOk();

        $this->assertSame(0, Jurnal::where('journalable_type', Jurnal::class)->count());

        $this->assertSame(100000.0, $hutang->sisaEntitas());
        $this->assertSame('belum_lunas', $hutang->statusEntitas());
    }

    public function test_retur_pembelian_mengurangi_total_hutang_asli(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $sumber = $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $hutang = Jurnal::where('entitas_type', 'hutang')->first();
        $this->assertSame(100000.0, (float) $hutang->totalEntitas());

        $this->simpanRetur($this->user, 'pembelian_retur', $sumber, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 10000],
        ], '2026-08-05', 'Retur sebagian');

        $this->assertSame(60000.0, $hutang->sisaEntitas());
        $this->assertSame('belum_lunas', $hutang->statusEntitas());
    }

    public function test_daftar_pelunasan_hanya_memuat_client_yang_masih_bersisa(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->getJson('/api/pelunasan/hutang')
            ->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.client_id', $supplier->id)
            ->assertJsonPath('items.0.client', 'Supplier A')
            ->assertJsonPath('items.0.sisa', 100000)
            ->assertJsonPath('items.0.jumlah_tags', 1);

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'hutang_id' => Jurnal::where('entitas_type', 'hutang')->first()->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 100000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        // Setelah lunas, client tidak lagi muncul sebagai kandidat pembayaran.
        $this->actingAsApi($this->user)
            ->getJson('/api/pelunasan/hutang')
            ->assertOk()
            ->assertJsonCount(0, 'items');
    }

    public function test_daftar_pelunasan_menggabungkan_hutang_per_client(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);
        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->getJson('/api/pelunasan/hutang')
            ->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.client_id', $supplier->id)
            ->assertJsonPath('items.0.jumlah_tags', 2)
            ->assertJsonPath('items.0.sisa', 150000)
            ->assertJsonPath('items.0.total', 150000);
    }

    public function test_bayar_hutang_gabungan_mengalokasikan_ke_seluruh_faktur(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);
        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 10000],
        ]);

        // Bayar 120.000 dari total 150.000: lunasi faktur pertama (100.000),
        // sisakan 20.000 untuk faktur kedua.
        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'client_id' => $supplier->id,
                'tipe' => 'hutang',
                'tanggal' => '2026-08-10',
                'jumlah' => 120000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        $this->assertSame(2, Jurnal::where('journalable_type', Jurnal::class)->count());
        // 2 jurnal pembelian + 2 jurnal pembayaran.
        $this->assertSame(4, Jurnal::count());

        $hutangs = Jurnal::where('entitas_type', 'hutang')->orderBy('id')->get();
        $this->assertSame(0.0, $hutangs[0]->sisaEntitas());
        $this->assertSame('lunas', $hutangs[0]->statusEntitas());
        $this->assertSame(30000.0, $hutangs[1]->sisaEntitas());
        $this->assertSame('belum_lunas', $hutangs[1]->statusEntitas());

        // Sisa gabungan per client menjadi 30.000.
        $this->actingAsApi($this->user)
            ->getJson('/api/pelunasan/hutang')
            ->assertOk()
            ->assertJsonPath('items.0.sisa', 30000)
            ->assertJsonPath('items.0.jumlah_tags', 1);
    }

    public function test_bayar_hutang_gabungan_melebihi_sisa_client_ditolak(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'client_id' => $supplier->id,
                'tipe' => 'hutang',
                'tanggal' => '2026-08-10',
                'jumlah' => 150000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('jumlah');

        $this->assertSame(0, Jurnal::where('journalable_type', Jurnal::class)->count());
    }

    public function test_terima_piutang_gabungan_mengalokasikan_ke_seluruh_faktur(): void
    {
        $supplier = $this->buatClient('Supplier X', 'supplier');
        $customer = $this->buatClient('Customer A', 'customer');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 8, 'harga' => 5000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);
        $this->simpanTransaksi($this->user, 'penjualan', $customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 4, 'harga' => 15000],
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/piutang', [
                'client_id' => $customer->id,
                'tipe' => 'piutang',
                'tanggal' => '2026-08-10',
                'jumlah' => 60000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        $this->assertSame(1, Jurnal::where('journalable_type', Jurnal::class)->count());

        $piutangs = Jurnal::where('entitas_type', 'piutang')->orderBy('id')->get();
        $this->assertSame(0.0, $piutangs[0]->sisaEntitas());
        $this->assertSame('lunas', $piutangs[0]->statusEntitas());
        $this->assertSame(60000.0, $piutangs[1]->sisaEntitas());
        $this->assertSame('belum_lunas', $piutangs[1]->statusEntitas());

        $this->actingAsApi($this->user)
            ->getJson('/api/pelunasan/piutang')
            ->assertOk()
            ->assertJsonPath('items.0.client_id', $customer->id)
            ->assertJsonPath('items.0.sisa', 60000)
            ->assertJsonPath('items.0.jumlah_tags', 1);
    }

    public function test_pembayaran_sebagian_menyisakan_status_belum_lunas(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $hutang = Jurnal::where('entitas_type', 'hutang')->first();

        $this->actingAsApi($this->user)
            ->postJson('/api/pelunasan/hutang', [
                'hutang_id' => $hutang->id,
                'tanggal' => '2026-08-10',
                'jumlah' => 40000,
                'akun_pembayaran_id' => Akun::system('kas')->id,
            ])
            ->assertCreated();

        $this->assertSame(60000.0, $hutang->sisaEntitas());
        $this->assertSame('belum_lunas', $hutang->statusEntitas());
        $this->assertSame(1, Transaksi::where('tipe_transaksi', 'pembelian')->count());
    }
}
