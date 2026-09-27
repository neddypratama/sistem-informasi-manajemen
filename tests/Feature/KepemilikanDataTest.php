<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Client;
use App\Models\Hutang;
use App\Models\Jurnal;
use App\Models\Permission;
use App\Models\Piutang;
use App\Models\Role;
use App\Models\StokOpname;
use App\Models\Transaksi;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

/**
 * Fitur F2: pembatasan data per user. User non-SuperAdmin/Admin hanya boleh
 * melihat & mengolah data yang dicatat oleh dirinya sendiri.
 */
class KepemilikanDataTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private const PERMISSIONS = [
        'menu.pembelian.telur',
        'menu.penjualan.telur',
        'menu.retur.penjualan',
        'menu.stok.opname',
        'menu.akuntansi.saldo_client',
        'menu.akuntansi.hutang',
        'menu.akuntansi.piutang',
        'menu.akuntansi.jurnal',
        'menu.akuntansi.kas',
        'menu.laporan.buku_besar',
        'menu.laporan.neraca',
        'menu.laporan.laba_rugi',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        $this->buatAkunSistem();
        $this->buatClient('Client Uji', 'Pedagang');
    }

    protected function buatUserBiasa(): User
    {
        return $this->buatUserBerizin(self::PERMISSIONS);
    }

    protected function buatUserAdmin(): User
    {
        $role = Role::create([
            'name' => 'Admin',
            'description' => 'Role Admin uji',
            'status' => 'active',
        ]);

        $role->permissions()->sync(
            collect(self::PERMISSIONS)
                ->map(fn (string $p) => Permission::firstOrCreate(['name' => $p])->id)
                ->all(),
        );

        return User::factory()->create(['role_id' => $role->id]);
    }

    protected function buatTransaksiMentah(User $user, string $tipe = 'pembelian', string $tanggal = '2026-08-10'): Transaksi
    {
        $client = Client::firstOrFail();
        $prefix = $tipe === 'pembelian' ? 'PB' : 'PJ';

        return Transaksi::create([
            'nomor_transaksi' => $prefix.'-20260810-'.strtoupper(substr(uniqid(), -4)),
            'tanggal' => $tanggal,
            'tipe_transaksi' => $tipe,
            'metode_pembayaran' => 'kredit',
            'client_id' => $client->id,
            'total' => 100000,
            'keterangan' => 'Transaksi milik '.$user->name,
            'created_by' => $user->id,
        ]);
    }

    protected function buatJurnalKas(User $user, float $debit): Jurnal
    {
        $kas = Akun::system('kas');
        $hutang = Akun::system('hutang');

        $jurnal = Jurnal::create([
            'nomor_jurnal' => 'JNL-'.uniqid(),
            'tanggal' => '2026-08-10',
            'client_id' => null,
            'keterangan' => 'Jurnal uji '.$user->name,
            'created_by' => $user->id,
        ]);

        $jurnal->details()->create(['akun_id' => $kas->id, 'debit' => $debit, 'kredit' => 0]);
        $jurnal->details()->create(['akun_id' => $hutang->id, 'debit' => 0, 'kredit' => $debit]);

        return $jurnal;
    }

    public function test_user_biasa_hanya_melihat_transaksi_milik_sendiri(): void
    {
        $userA = $this->buatUserBiasa();
        $userB = $this->buatUserBiasa();
        $transaksiA = $this->buatTransaksiMentah($userA, 'pembelian');
        $this->buatTransaksiMentah($userB, 'penjualan');

        $this->actingAsApi($userA)
            ->getJson('/api/transaksi?tipe=pembelian')
            ->assertOk()
            ->assertJsonFragment(['nomor_transaksi' => $transaksiA->nomor_transaksi]);

        $this->actingAsApi($userB)
            ->getJson('/api/transaksi?tipe=penjualan')
            ->assertOk()
            ->assertJsonMissing(['nomor_transaksi' => $transaksiA->nomor_transaksi]);
    }

    public function test_riwayat_transaksi_tanpa_filter_hanya_untuk_admin(): void
    {
        $userBiasa = $this->buatUserBiasa();
        $admin = $this->buatUserAdmin();

        $this->actingAsApi($userBiasa)->getJson('/api/transaksi')->assertForbidden();
        $this->actingAsApi($admin)->getJson('/api/transaksi')->assertOk();
    }

    public function test_riwayat_retur_dibatasi_per_tipe(): void
    {
        $userBiasa = $this->buatUserBiasa();

        // Bukan admin: hanya tipe retur yang diizinkan per permission yang dimiliki.
        $this->actingAsApi($userBiasa)->getJson('/api/retur?tipe=pembelian')->assertForbidden();
        $this->actingAsApi($userBiasa)->getJson('/api/retur?tipe=penjualan')->assertOk();
    }

    public function test_user_biasa_dapat_melihat_detail_transaksi_milik_sendiri(): void
    {
        $userA = $this->buatUserBiasa();
        $transaksiA = $this->buatTransaksiMentah($userA);

        $this->actingAsApi($userA)
            ->getJson("/api/transaksi/{$transaksiA->id}")
            ->assertOk()
            ->assertJsonPath('transaksi.id', $transaksiA->id);
    }

    public function test_user_biasa_tidak_bisa_mengakses_transaksi_milik_user_lain(): void
    {
        $userA = $this->buatUserBiasa();
        $userB = $this->buatUserBiasa();
        $transaksiA = $this->buatTransaksiMentah($userA);

        $this->actingAsApi($userB)->getJson("/api/transaksi/{$transaksiA->id}")->assertNotFound();
        $this->actingAsApi($userB)->getJson("/api/transaksi/{$transaksiA->id}/edit-data")->assertNotFound();
        $this->actingAsApi($userB)->deleteJson("/api/transaksi/{$transaksiA->id}")->assertNotFound();
    }

    public function test_user_biasa_hanya_melihat_jurnal_milik_sendiri(): void
    {
        $userA = $this->buatUserBiasa();
        $userB = $this->buatUserBiasa();
        $jurnalA = $this->buatJurnalKas($userA, 50000);

        $this->actingAsApi($userA)
            ->getJson('/api/jurnal')
            ->assertOk()
            ->assertJsonFragment(['id' => $jurnalA->id]);

        $this->actingAsApi($userB)
            ->getJson('/api/jurnal')
            ->assertOk()
            ->assertJsonMissing(['id' => $jurnalA->id]);

        $this->actingAsApi($userB)
            ->getJson("/api/jurnal/{$jurnalA->id}")
            ->assertNotFound();
    }

    public function test_user_biasa_hanya_melihat_stok_opname_milik_sendiri(): void
    {
        $userA = $this->buatUserBiasa();
        $userB = $this->buatUserBiasa();

        $opnameA = StokOpname::create([
            'no_opname' => 'OP-20260810-0001',
            'tanggal' => '2026-08-10',
            'keterangan' => 'Opname milik A',
            'status' => 'draft',
            'created_by' => $userA->id,
        ]);

        $this->actingAsApi($userA)
            ->getJson('/api/stok-opname')
            ->assertOk()
            ->assertJsonFragment(['id' => $opnameA->id]);

        $this->actingAsApi($userB)
            ->getJson('/api/stok-opname')
            ->assertOk()
            ->assertJsonMissing(['id' => $opnameA->id]);

        $this->actingAsApi($userB)
            ->getJson("/api/stok-opname/{$opnameA->id}")
            ->assertNotFound();
    }

    public function test_user_biasa_hanya_melihat_hutang_piutang_dan_tagihan_milik_sendiri(): void
    {
        $userA = $this->buatUserBiasa();
        $userB = $this->buatUserBiasa();
        $client = Client::firstOrFail();

        $hutangA = Hutang::create([
            'no_hutang' => 'HT-20260810-0001',
            'tanggal' => '2026-08-10',
            'client_id' => $client->id,
            'total' => 100000,
            'keterangan' => 'Hutang milik A',
            'status' => 'belum_lunas',
            'created_by' => $userA->id,
        ]);

        $piutangA = Piutang::create([
            'no_piutang' => 'PT-20260810-0001',
            'tanggal' => '2026-08-10',
            'client_id' => $client->id,
            'total' => 200000,
            'keterangan' => 'Piutang milik A',
            'status' => 'belum_lunas',
            'created_by' => $userA->id,
        ]);

        $this->actingAsApi($userA)
            ->getJson('/api/hutang')
            ->assertOk()
            ->assertJsonFragment(['id' => $hutangA->id]);

        $this->actingAsApi($userA)
            ->getJson('/api/piutang')
            ->assertOk()
            ->assertJsonFragment(['id' => $piutangA->id]);

        $this->actingAsApi($userA)
            ->getJson('/api/tagihan')
            ->assertOk()
            ->assertJsonFragment(['client_id' => $client->id]);

        $this->actingAsApi($userB)
            ->getJson('/api/hutang')
            ->assertOk()
            ->assertJsonMissing(['id' => $hutangA->id]);

        $this->actingAsApi($userB)
            ->getJson('/api/piutang')
            ->assertOk()
            ->assertJsonMissing(['id' => $piutangA->id]);

        $this->actingAsApi($userB)
            ->getJson('/api/tagihan')
            ->assertOk()
            ->assertJsonMissing(['client_id' => $client->id]);
    }

    public function test_pelunasan_hanya_menampilkan_tagihan_milik_sendiri(): void
    {
        $userA = $this->buatUserBiasa();
        $userB = $this->buatUserBiasa();
        $client = Client::firstOrFail();

        Hutang::create([
            'no_hutang' => 'HT-20260810-0001',
            'tanggal' => '2026-08-10',
            'client_id' => $client->id,
            'total' => 100000,
            'keterangan' => 'Hutang milik A',
            'status' => 'belum_lunas',
            'created_by' => $userA->id,
        ]);

        $this->actingAsApi($userA)
            ->getJson('/api/pelunasan/hutang')
            ->assertOk()
            ->assertJsonPath('items.0.client', $client->nama);

        $this->actingAsApi($userB)
            ->getJson('/api/pelunasan/hutang')
            ->assertOk()
            ->assertJsonCount(0, 'items');
    }

    public function test_kas_dan_laporan_dibatasi_per_user(): void
    {
        $userA = $this->buatUserBiasa();
        $userB = $this->buatUserBiasa();

        $this->buatJurnalKas($userA, 50000);
        $this->buatJurnalKas($userB, 25000);

        $kasA = $this->actingAsApi($userA)->getJson('/api/kas?tanggal=2026-08-10')->assertOk();
        $kasB = $this->actingAsApi($userB)->getJson('/api/kas?tanggal=2026-08-10')->assertOk();

        $akunKas = Akun::system('kas');
        $itemA = collect($kasA->json('items'))->firstWhere('id', $akunKas->id);
        $itemB = collect($kasB->json('items'))->firstWhere('id', $akunKas->id);

        $this->assertSame(50000.0, (float) $itemA['pemasukan']);
        $this->assertSame(25000.0, (float) $itemB['pemasukan']);

        $this->actingAsApi($userB)
            ->getJson('/api/laporan/buku-besar?akun_id='.$akunKas->id)
            ->assertOk()
            ->assertJsonMissing(['keterangan' => 'Jurnal uji A']);

        $this->actingAsApi($userB)
            ->getJson('/api/laporan/neraca')
            ->assertOk();

        $this->actingAsApi($userB)
            ->getJson('/api/laporan/laba-rugi')
            ->assertOk();
    }

    public function test_dashboard_transaksi_dibatasi_per_user_tapi_stok_global(): void
    {
        $userA = $this->buatUserBiasa();
        $userB = $this->buatUserBiasa();

        $this->buatBarang('BRG-A', 'Barang A', 'Sembako', 'telur');
        $this->buatTransaksiMentah($userA, 'pembelian');

        $dashboardA = $this->actingAsApi($userA)->getJson('/api/dashboard?preset=custom&dari=2026-08-01&sampai=2026-08-31')->assertOk();
        $dashboardB = $this->actingAsApi($userB)->getJson('/api/dashboard?preset=custom&dari=2026-08-01&sampai=2026-08-31')->assertOk();

        // Nilai penjualan/pembelian mengikuti kepemilikan transaksi.
        $this->assertEquals(100000, $dashboardA->json('kpi.pembelian'));
        $this->assertEquals(0, $dashboardB->json('kpi.pembelian'));

        // Stok bersifat global sehingga sama untuk semua user.
        $this->assertSame(
            $dashboardA->json('kpi.jumlahStok'),
            $dashboardB->json('kpi.jumlahStok'),
        );
        $this->assertEquals(0, $dashboardB->json('kpi.jumlahStok'));

        // User B tidak melihat transaksi milik user A di chart periode.
        $this->assertEquals(100000, array_sum($dashboardA->json('chart.pembelian')));
        $this->assertEquals(0, array_sum($dashboardB->json('chart.pembelian')));
    }

    public function test_arus_kas_dan_aktivitas_dashboard_dibatasi_per_user(): void
    {
        $userA = $this->buatUserBiasa();
        $userB = $this->buatUserBiasa();
        $client = Client::firstOrFail();

        $this->buatJurnalKas($userA, 50000);
        $this->buatTransaksiMentah($userA, 'pembelian', Carbon::now('Asia/Jakarta')->toDateString());
        $this->buatHutang($client, 100000, $userA);
        $this->buatPiutang($client, 30000, $userA);

        $periode = '?preset=custom&dari=2026-08-01&sampai=2026-08-31';
        $dashboardA = $this->actingAsApi($userA)->getJson('/api/dashboard'.$periode)->assertOk();
        $dashboardB = $this->actingAsApi($userB)->getJson('/api/dashboard'.$periode)->assertOk();

        // Arus kas mengikuti kepemilikan jurnal kas.
        $this->assertEquals(50000, $dashboardA->json('arusKas.pemasukan'));
        $this->assertEquals(0, $dashboardB->json('arusKas.pemasukan'));

        // Transaksi hari ini hanya terhitung untuk pemiliknya.
        $this->assertEquals(1, $dashboardA->json('aktivitasHariIni.transaksi.jumlah'));
        $this->assertEquals(0, $dashboardB->json('aktivitasHariIni.transaksi.jumlah'));

        // Rekap hutang > piutang juga mengikuti kepemilikan tagihan.
        $this->assertEquals(1, $dashboardA->json('aktivitasHariIni.hutangLebihBesar.jumlah'));
        $this->assertEquals(70000, $dashboardA->json('aktivitasHariIni.hutangLebihBesar.selisih'));
        $this->assertEquals(0, $dashboardB->json('aktivitasHariIni.hutangLebihBesar.jumlah'));
        $this->assertEquals(0, $dashboardB->json('aktivitasHariIni.hutangLebihBesar.selisih'));
    }

    public function test_admin_melihat_semua_data(): void
    {
        $admin = $this->buatUserAdmin();
        $userA = $this->buatUserBiasa();
        $transaksiA = $this->buatTransaksiMentah($userA, 'pembelian');
        $jurnalA = $this->buatJurnalKas($userA, 50000);

        $this->actingAsApi($admin)
            ->getJson('/api/transaksi')
            ->assertOk()
            ->assertJsonFragment(['id' => $transaksiA->id]);

        $this->actingAsApi($admin)
            ->getJson("/api/transaksi/{$transaksiA->id}")
            ->assertOk();

        $this->actingAsApi($admin)
            ->getJson('/api/jurnal')
            ->assertOk()
            ->assertJsonFragment(['id' => $jurnalA->id]);
    }

    public function test_superadmin_melihat_semua_data(): void
    {
        $superadmin = User::factory()->create();
        $userA = $this->buatUserBiasa();
        $hutangA = Hutang::create([
            'no_hutang' => 'HT-20260810-0001',
            'tanggal' => '2026-08-10',
            'client_id' => Client::firstOrFail()->id,
            'total' => 100000,
            'keterangan' => 'Hutang milik A',
            'status' => 'belum_lunas',
            'created_by' => $userA->id,
        ]);

        $this->actingAsApi($superadmin)
            ->getJson('/api/hutang')
            ->assertOk()
            ->assertJsonFragment(['id' => $hutangA->id]);
    }
}
