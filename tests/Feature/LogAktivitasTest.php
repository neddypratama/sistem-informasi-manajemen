<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Kategori;
use App\Models\LogAktivitas;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class LogAktivitasTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Akun $akunKas;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $this->akuns = $this->buatAkunSistem();
        $this->akunKas = $this->akuns['kas'];

        $this->barang = $this->buatBarang();
        $this->supplier = $this->buatClient('Supplier A', 'supplier');
        $this->customer = $this->buatClient('Customer B', 'customer');
    }

    protected function buatAkunBeban(): Akun
    {
        $kategori = Kategori::create([
            'nama' => 'Beban Operasional',
            'jenis' => 'beban',
            'status' => 'aktif',
        ]);

        return Akun::create([
            'kode' => '5103',
            'nama' => 'Beban Listrik',
            'kategori_id' => $kategori->id,
            'saldo_normal' => 'debit',
            'status' => 'aktif',
            'system_code' => null,
        ]);
    }

    public function test_log_hanya_bisa_dibuka_oleh_pemilik_permission(): void
    {
        $tanpaIzin = $this->buatUserBerizin(['menu.master.client']);

        $this->actingAsApi($tanpaIzin)->getJson('/api/log-aktivitas')->assertForbidden();
        $this->actingAsApi($tanpaIzin)->getJson('/api/log-aktivitas/users')->assertForbidden();

        $berizin = $this->buatUserBerizin(['menu.akses.log']);

        $this->actingAsApi($berizin)->getJson('/api/log-aktivitas')->assertOk();
        $this->actingAsApi($berizin)->getJson('/api/log-aktivitas/users')->assertOk();
    }

    public function test_index_memfilter_modul_aksi_user_dan_pencarian(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        LogAktivitas::factory()->create([
            'user_id' => $userA->id,
            'modul' => 'transaksi',
            'aksi' => 'tambah',
            'deskripsi' => 'Menambah transaksi pembelian',
            'referensi' => 'TRX-PBL-001',
        ]);
        LogAktivitas::factory()->create([
            'user_id' => $userA->id,
            'modul' => 'jurnal',
            'aksi' => 'tambah',
            'deskripsi' => 'Menambah jurnal kas',
            'referensi' => 'JRN-001',
        ]);
        LogAktivitas::factory()->create([
            'user_id' => $userB->id,
            'modul' => 'transaksi',
            'aksi' => 'hapus',
            'deskripsi' => 'Menghapus transaksi penjualan',
            'referensi' => 'TRX-PJL-001',
        ]);

        $filterModul = $this->actingAsApi($this->user)->getJson('/api/log-aktivitas?modul=transaksi');
        $this->assertSame(2, $filterModul->json('total'));

        $filterUser = $this->actingAsApi($this->user)->getJson('/api/log-aktivitas?user_id='.$userA->id);
        $this->assertSame(2, $filterUser->json('total'));

        $filterAksi = $this->actingAsApi($this->user)->getJson('/api/log-aktivitas?aksi=hapus');
        $this->assertSame(1, $filterAksi->json('total'));

        $filterCari = $this->actingAsApi($this->user)->getJson('/api/log-aktivitas?search=TRX-PBL-001');
        $this->assertSame(1, $filterCari->json('total'));

        $filterPerUserModul = $this->actingAsApi($this->user)
            ->getJson('/api/log-aktivitas?user_id='.$userB->id.'&modul=transaksi');
        $this->assertSame(1, $filterPerUserModul->json('total'));
    }

    public function test_transaksi_dan_master_data_mencatat_log(): void
    {
        $this->actingAsApi($this->user)->postJson('/api/client', [
            'nama' => 'PT Maju Jaya',
            'alamat' => 'Jl. Raya No. 1',
            'no_telepon' => '081234567890',
            'tipe' => 'Pedagang',
            'status' => 'aktif',
        ])->assertCreated();

        $transaksi = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 10000],
        ]);

        $this->assertDatabaseHas('log_aktivitases', [
            'user_id' => $this->user->id,
            'modul' => 'client',
            'aksi' => 'tambah',
            'referensi' => 'PT Maju Jaya',
        ]);
        $this->assertDatabaseHas('log_aktivitases', [
            'user_id' => $this->user->id,
            'modul' => 'transaksi',
            'aksi' => 'tambah',
            'referensi' => $transaksi->nomor_transaksi,
        ]);
    }

    public function test_entri_jurnal_jenis_mencatat_log(): void
    {
        $beban = $this->buatAkunBeban();

        $this->actingAsApi($this->user)->postJson('/api/jurnal/jenis', [
            'jenis' => 'beban',
            'tanggal' => '2026-08-20',
            'jumlah' => 75000,
            'akun_fixed' => $beban->id,
            'akun_lawan' => $this->akunKas->id,
            'keterangan' => 'Biaya listrik',
        ])->assertCreated();

        $this->assertDatabaseHas('log_aktivitases', [
            'user_id' => $this->user->id,
            'modul' => 'jurnal',
            'aksi' => 'tambah',
            'deskripsi' => 'Menambah jurnal beban',
        ]);
    }

    public function test_hapus_transaksi_mencatat_log_hapus(): void
    {
        $transaksi = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)->deleteJson('/api/transaksi/'.$transaksi->id)->assertOk();

        $this->assertDatabaseHas('log_aktivitases', [
            'user_id' => $this->user->id,
            'modul' => 'transaksi',
            'aksi' => 'hapus',
            'referensi' => $transaksi->nomor_transaksi,
        ]);
        $this->assertSame(2, LogAktivitas::count());
    }

    public function test_perubahan_role_mencatat_log(): void
    {
        $role = Role::create([
            'name' => 'Role Baru',
            'description' => 'Role uji',
            'status' => 'active',
        ]);

        $this->actingAsApi($this->user)->putJson('/api/role/'.$role->id, [
            'name' => 'Role Baru 2',
            'description' => 'Role uji',
            'status' => 'active',
            'permissions' => [],
        ])->assertOk();

        $this->assertDatabaseHas('log_aktivitases', [
            'user_id' => $this->user->id,
            'modul' => 'role',
            'aksi' => 'ubah',
            'referensi' => 'Role Baru 2',
        ]);
    }
}
