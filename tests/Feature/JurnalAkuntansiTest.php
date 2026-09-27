<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Jurnal;
use App\Models\JurnalDetail;
use App\Models\Kategori;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class JurnalAkuntansiTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
    }

    protected function buatAkun(string $kode, string $nama, string $jenis, string $saldoNormal, ?string $systemCode = null, ?string $kategoriNama = null): Akun
    {
        $kategori = Kategori::create([
            'nama' => $kategoriNama ?? 'Kategori-'.$nama,
            'jenis' => $jenis,
            'status' => 'aktif',
        ]);

        return Akun::create([
            'kode' => $kode,
            'nama' => $nama,
            'kategori_id' => $kategori->id,
            'saldo_normal' => $saldoNormal,
            'status' => 'aktif',
            'system_code' => $systemCode,
        ]);
    }

    public function test_jurnal_beban_berhasil_disimpan(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $beban = $this->buatAkun('5101', 'Beban Gaji', 'beban', 'debit');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'beban',
            'tanggal' => '2026-08-20',
            'jumlah' => 75000,
            'akun_fixed' => $beban->id,
            'akun_lawan' => $kas->id,
            'keterangan' => 'Gaji karyawan',
        ]);

        $response->assertCreated();

        $jurnal = Jurnal::first();
        $this->assertNotNull($jurnal);
        $this->assertSame('2026-08-20', $jurnal->tanggal->format('Y-m-d'));
        $this->assertSame(1, Jurnal::count());
        $this->assertSame(2, JurnalDetail::count());

        $debitBeban = $jurnal->details->firstWhere('akun_id', $beban->id);
        $kreditKas = $jurnal->details->firstWhere('akun_id', $kas->id);
        $this->assertSame(75000, (int) $debitBeban->debit);
        $this->assertSame(75000, (int) $kreditKas->kredit);
    }

    public function test_jurnal_pendapatan_berhasil_disimpan_dengan_lawan_kas(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $pendapatan = $this->buatAkun('4101', 'Pendapatan Lain', 'pendapatan', 'kredit');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'pendapatan',
            'tanggal' => '2026-08-22',
            'jumlah' => 80000,
            'akun_fixed' => $pendapatan->id,
            'akun_lawan' => $kas->id,
            'keterangan' => 'Pendapatan bunga',
        ]);

        $response->assertCreated();

        $jurnal = Jurnal::first();
        $this->assertNotNull($jurnal);

        $debitKas = $jurnal->details->firstWhere('akun_id', $kas->id);
        $kreditPendapatan = $jurnal->details->firstWhere('akun_id', $pendapatan->id);
        $this->assertSame(80000, (int) $debitKas->debit);
        $this->assertSame(80000, (int) $kreditPendapatan->kredit);
    }

    public function test_jurnal_beban_tanpa_akun_kas_ditolak(): void
    {
        $beban = $this->buatAkun('5101', 'Beban Gaji', 'beban', 'debit');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'beban',
            'tanggal' => '2026-08-20',
            'jumlah' => 75000,
            'akun_fixed' => $beban->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['akun_lawan']);

        $this->assertSame(0, Jurnal::count());
    }

    public function test_jurnal_kas_masuk_berhasil_disimpan(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $pendapatan = $this->buatAkun('4101', 'Pendapatan Lain', 'pendapatan', 'kredit');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'kas',
            'arah' => 'masuk',
            'tanggal' => '2026-08-21',
            'jumlah' => 50000,
            'akun_fixed' => $kas->id,
            'akun_lawan' => $pendapatan->id,
        ]);

        $response->assertCreated();

        $jurnal = Jurnal::first();
        $this->assertNotNull($jurnal);

        $debitKas = $jurnal->details->firstWhere('akun_id', $kas->id);
        $kreditPendapatan = $jurnal->details->firstWhere('akun_id', $pendapatan->id);
        $this->assertSame(50000, (int) $debitKas->debit);
        $this->assertSame(50000, (int) $kreditPendapatan->kredit);
    }

    public function test_jurnal_akun_fixed_dan_lawan_sama_ditolak(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'kas',
            'arah' => 'masuk',
            'tanggal' => '2026-08-20',
            'jumlah' => 75000,
            'akun_fixed' => $kas->id,
            'akun_lawan' => $kas->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['akun_lawan']);

        $this->assertSame(0, Jurnal::count());
    }

    public function test_jurnal_akun_fixed_tidak_cocok_ditolak(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'beban',
            'tanggal' => '2026-08-20',
            'jumlah' => 75000,
            'akun_fixed' => $kas->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['akun_fixed']);

        $this->assertSame(0, Jurnal::count());
    }

    public function test_halaman_jurnal_dan_akun_dapat_di_akses(): void
    {
        $endpoints = [
            '/api/jurnal',
            '/api/jurnal/create-data',
            '/api/akun',
            '/api/akun/kategori-options',
            '/api/kategori',
            '/api/laporan/buku-besar',
            '/api/laporan/neraca',
            '/api/laporan/laba-rugi',
        ];

        foreach ($endpoints as $endpoint) {
            $this->actingAsApi($this->user)->getJson($endpoint)->assertOk();
        }
    }

    public function test_buku_besar_menampilkan_semua_akun_secara_default(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $beban = $this->buatAkun('5101', 'Beban Gaji', 'beban', 'debit');
        $this->buatAkun('1102', 'Piutang', 'aset', 'debit', 'piutang');

        $this->actingAsApi($this->user)
            ->postJson('/api/jurnal/jenis', [
                'jenis' => 'beban',
                'tanggal' => '2026-08-20',
                'jumlah' => 75000,
                'akun_fixed' => $beban->id,
                'akun_lawan' => $kas->id,
            ])
            ->assertCreated();

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/buku-besar')
            ->assertOk();

        // Tanpa filter akun_id, laporan memuat setiap akun yang punya mutasi.
        $kodeAkun = collect($response->json('laporan'))->pluck('akun.kode');

        $this->assertTrue($kodeAkun->contains($beban->kode));
        $this->assertTrue($kodeAkun->contains($kas->kode));

        // Akun tanpa mutasi tidak muncul di laporan, namun tetap tersedia sebagai opsi filter.
        $this->assertFalse($kodeAkun->contains('1102'));
        $this->assertTrue(collect($response->json('akuns'))->pluck('kode')->contains('1102'));
    }

    public function test_buku_besar_dapat_difilter_per_akun(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $beban = $this->buatAkun('5101', 'Beban Gaji', 'beban', 'debit');

        $this->actingAsApi($this->user)
            ->postJson('/api/jurnal/jenis', [
                'jenis' => 'beban',
                'tanggal' => '2026-08-20',
                'jumlah' => 75000,
                'akun_fixed' => $beban->id,
                'akun_lawan' => $kas->id,
            ])
            ->assertCreated();

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/laporan/buku-besar?akun_id='.$kas->id)
            ->assertOk()
            ->assertJsonCount(1, 'laporan')
            ->assertJsonPath('laporan.0.akun.kode', '1101');

        // Kas dikredit 75.000; saldo normal debit sehingga saldo akhir negatif.
        $this->assertSame(75000.0, (float) $response->json('laporan.0.kredit'));
        $this->assertSame(-75000.0, (float) $response->json('laporan.0.saldo'));
    }

    public function test_jurnal_umum_manual_dapat_disimpan_diubah_dan_dihapus(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $beban = $this->buatAkun('5101', 'Beban Gaji', 'beban', 'debit');

        $this->actingAsApi($this->user)
            ->postJson('/api/jurnal', [
                'tanggal' => '2026-08-20',
                'keterangan' => 'Bayar gaji',
                'items' => [
                    ['akun_id' => $beban->id, 'debit' => 50000, 'kredit' => 0],
                    ['akun_id' => $kas->id, 'debit' => 0, 'kredit' => 50000],
                ],
            ])
            ->assertCreated();

        $jurnal = Jurnal::firstOrFail();
        $this->assertSame(2, JurnalDetail::count());
        $this->assertNull($jurnal->journalable_id, 'Jurnal manual tidak boleh punya journalable.');

        $this->actingAsApi($this->user)
            ->putJson('/api/jurnal/'.$jurnal->id, [
                'tanggal' => '2026-08-21',
                'keterangan' => 'Bayar gaji (revisi)',
                'items' => [
                    ['akun_id' => $beban->id, 'debit' => 70000, 'kredit' => 0],
                    ['akun_id' => $kas->id, 'debit' => 0, 'kredit' => 70000],
                ],
            ])
            ->assertOk();

        $this->assertSame(2, JurnalDetail::count());
        $this->assertDatabaseHas('jurnal_details', [
            'jurnal_id' => $jurnal->id,
            'akun_id' => $beban->id,
            'debit' => 70000,
        ]);

        $this->actingAsApi($this->user)
            ->deleteJson('/api/jurnal/'.$jurnal->id)
            ->assertOk();

        $this->assertSame(0, Jurnal::count());
        $this->assertSame(0, JurnalDetail::count());
    }

    public function test_jurnal_kas_bisa_menggunakan_akun_bank_sebagai_akun_utama(): void
    {
        $akunBank = $this->buatAkun('1103', 'Bank BCA Binti', 'aset', 'debit', null, 'Bank BCA');
        $pendapatan = $this->buatAkun('4101', 'Pendapatan Lain', 'pendapatan', 'kredit');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'kas',
            'arah' => 'masuk',
            'tanggal' => '2026-08-23',
            'jumlah' => 120000,
            'akun_fixed' => $akunBank->id,
            'akun_lawan' => $pendapatan->id,
        ]);

        $response->assertCreated();

        $jurnal = Jurnal::firstOrFail();
        $debitBank = $jurnal->details->firstWhere('akun_id', $akunBank->id);
        $this->assertSame(120000, (int) $debitBank->debit);
    }

    public function test_jurnal_beban_dengan_akun_hpp_ditolak(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $hpp = $this->buatAkun('5101', 'Harga Pokok Penjualan', 'beban', 'debit', 'hpp');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'beban',
            'tanggal' => '2026-08-20',
            'jumlah' => 75000,
            'akun_fixed' => $hpp->id,
            'akun_lawan' => $kas->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['akun_fixed']);
        $this->assertSame(0, Jurnal::count());
    }

    public function test_jurnal_pendapatan_dengan_akun_penjualan_ditolak(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $penjualan = $this->buatAkun('4102', 'Penjualan Telur Horn', 'pendapatan', 'kredit', null, 'Penjualan Telur');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'pendapatan',
            'tanggal' => '2026-08-20',
            'jumlah' => 75000,
            'akun_fixed' => $penjualan->id,
            'akun_lawan' => $kas->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['akun_fixed']);
        $this->assertSame(0, Jurnal::count());
    }

    public function test_jurnal_beban_dengan_lawan_bukan_kas_bank_ditolak(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $beban = $this->buatAkun('5101', 'Beban Gaji', 'beban', 'debit');
        $bebanLain = $this->buatAkun('5102', 'Beban Sewa', 'beban', 'debit');

        $response = $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'beban',
            'tanggal' => '2026-08-20',
            'jumlah' => 75000,
            'akun_fixed' => $beban->id,
            'akun_lawan' => $bebanLain->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['akun_lawan']);
        $this->assertSame(0, Jurnal::count());
    }

    public function test_daftar_jurnal_dapat_difilter_per_jenis(): void
    {
        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $beban = $this->buatAkun('5101', 'Beban Gaji', 'beban', 'debit');
        $pendapatan = $this->buatAkun('4101', 'Pendapatan Lain', 'pendapatan', 'kredit');

        $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'beban',
            'tanggal' => '2026-08-20',
            'jumlah' => 75000,
            'akun_fixed' => $beban->id,
            'akun_lawan' => $kas->id,
        ])->assertCreated();

        $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'kas',
            'arah' => 'masuk',
            'tanggal' => '2026-08-21',
            'jumlah' => 50000,
            'akun_fixed' => $kas->id,
            'akun_lawan' => $pendapatan->id,
        ])->assertCreated();

        $responseKas = $this->actingAsApi($this->user)->getJson('/api/jurnal?jenis=kas');
        $this->assertSame(2, $responseKas->json('total'));

        $responseBeban = $this->actingAsApi($this->user)->getJson('/api/jurnal?jenis=beban');
        $this->assertSame(1, $responseBeban->json('total'));

        $responsePendapatan = $this->actingAsApi($this->user)->getJson('/api/jurnal?jenis=pendapatan');
        $this->assertSame(1, $responsePendapatan->json('total'));
    }

    public function test_entri_kas_hanya_untuk_admin_dan_superadmin(): void
    {
        $kepalaKas = $this->buatUserBerizin([
            'menu.akuntansi.jurnal',
            'menu.jurnal.kas',
            'menu.jurnal.beban',
            'menu.jurnal.pendapatan',
        ]);

        $kas = $this->buatAkun('1101', 'Kas', 'aset', 'debit', 'kas');
        $beban = $this->buatAkun('5101', 'Beban Gaji', 'beban', 'debit');
        $pendapatan = $this->buatAkun('4101', 'Pendapatan Lain', 'pendapatan', 'kredit');

        $this->actingAsApi($kepalaKas)
            ->postJson('/api/jurnal/jenis', [
                'jenis' => 'kas',
                'arah' => 'masuk',
                'tanggal' => '2026-08-21',
                'jumlah' => 50000,
                'akun_fixed' => $kas->id,
                'akun_lawan' => $pendapatan->id,
            ])
            ->assertForbidden();

        $this->assertSame(0, Jurnal::count());

        $this->actingAsApi($kepalaKas)
            ->postJson('/api/jurnal/jenis', [
                'jenis' => 'beban',
                'tanggal' => '2026-08-20',
                'jumlah' => 75000,
                'akun_fixed' => $beban->id,
                'akun_lawan' => $kas->id,
            ])
            ->assertCreated();

        $this->actingAsApi($kepalaKas)
            ->postJson('/api/jurnal/jenis', [
                'jenis' => 'pendapatan',
                'tanggal' => '2026-08-22',
                'jumlah' => 80000,
                'akun_fixed' => $pendapatan->id,
                'akun_lawan' => $kas->id,
            ])
            ->assertCreated();
    }
}
