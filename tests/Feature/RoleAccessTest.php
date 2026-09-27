<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    public function test_superadmin_dapat_mengakses_semua_endpoint(): void
    {
        // UserFactory memakai role SuperAdmin, yang melewati semua pemeriksaan izin.
        $user = User::factory()->create();

        foreach ([
            '/api/dashboard',
            '/api/role',
            '/api/user',
            '/api/jenis-barang',
            '/api/transaksi?tipe=pembelian&kategori=telur',
            '/api/transaksi/create-data?tipe=pembelian&kategori=telur',
            '/api/stok',
            '/api/jurnal',
            '/api/akun',
            '/api/laporan/neraca',
            '/api/laporan/laba-rugi-curah',
        ] as $endpoint) {
            $this->actingAsApi($user)->getJson($endpoint)->assertOk();
        }
    }

    public function test_admin_tidak_bisa_mengakses_manajemen_role_dan_user(): void
    {
        $user = $this->buatUserBerizin([
            'menu.master.jenis_barang',
            'menu.pembelian.telur',
            'menu.penjualan.telur',
            'menu.stok.barang',
        ]);

        $this->actingAsApi($user)->getJson('/api/role')->assertForbidden();
        $this->actingAsApi($user)->getJson('/api/user')->assertForbidden();

        $this->actingAsApi($user)->getJson('/api/jenis-barang')->assertOk();
        $this->actingAsApi($user)->getJson('/api/transaksi/create-data?tipe=pembelian&kategori=telur')->assertOk();
    }

    public function test_gudang_bisa_mengelola_master_dan_melihat_stok_tapi_tidak_akses_transaksi(): void
    {
        $user = $this->buatUserBerizin([
            'menu.master.jenis_barang',
            'menu.stok.barang',
            'menu.transaksi.riwayat',
        ]);

        $this->actingAsApi($user)->getJson('/api/jenis-barang')->assertOk();
        $this->actingAsApi($user)->getJson('/api/stok')->assertOk();

        // Tanpa izin kategori transaksi, data form & penyimpanan transaksi ditolak.
        $this->actingAsApi($user)->getJson('/api/transaksi/create-data?tipe=pembelian&kategori=telur')->assertForbidden();
        $this->actingAsApi($user)->postJson('/api/transaksi', [])->assertForbidden();

        $this->actingAsApi($user)->getJson('/api/role')->assertForbidden();
        $this->actingAsApi($user)->getJson('/api/jurnal')->assertForbidden();
    }

    public function test_kasir_bisa_buat_transaksi_tapi_tidak_akses_master(): void
    {
        $user = $this->buatUserBerizin([
            'menu.pembelian.telur', 'menu.penjualan.telur', 'menu.stok.barang',
        ]);
        $barang = $this->buatBarang();
        $supplier = $this->buatClient('Supplier A', 'supplier');
        $this->buatAkunSistem();

        $this->actingAsApi($user)
            ->postJson('/api/transaksi', [
                'tanggal' => '2026-08-01',
                'tipe_transaksi' => 'pembelian',
                'client_id' => $supplier->id,
                'items' => [
                    ['barang_id' => $barang->id, 'kuantitas' => 10, 'harga' => 10000],
                ],
            ])
            ->assertCreated();

        $this->actingAsApi($user)->getJson('/api/jenis-barang')->assertForbidden();
        $this->actingAsApi($user)->getJson('/api/barang')->assertForbidden();
        $this->actingAsApi($user)->getJson('/api/client')->assertForbidden();
        $this->actingAsApi($user)->getJson('/api/role')->assertForbidden();
    }

    public function test_akuntan_bisa_melihat_akuntansi_tertentu_tapi_tidak_akses_jurnal(): void
    {
        $user = $this->buatUserBerizin([
            'menu.akuntansi.kas',
            'menu.laporan.buku_besar',
        ]);

        $this->actingAsApi($user)->getJson('/api/kas')->assertOk();
        $this->actingAsApi($user)->getJson('/api/laporan/buku-besar')->assertOk();

        // Tanpa menu.akuntansi.jurnal, akses jurnal & akun ditolak.
        $this->actingAsApi($user)->getJson('/api/jurnal')->assertForbidden();
        $this->actingAsApi($user)->getJson('/api/jurnal/create-data')->assertForbidden();
        $this->actingAsApi($user)->postJson('/api/jurnal', [])->assertForbidden();
        $this->actingAsApi($user)->getJson('/api/akun')->assertForbidden();
    }

    public function test_role_dan_user_dapat_dikelola_lewat_api(): void
    {
        $admin = $this->buatUserBerizin(['menu.akses.role', 'menu.akses.user']);

        $this->actingAsApi($admin)
            ->postJson('/api/role', [
                'name' => 'Staf',
                'description' => 'Staf baru',
                'status' => 'active',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('roles', ['name' => 'Staf']);

        $this->actingAsApi($admin)
            ->postJson('/api/user', [
                'name' => 'Staf Baru',
                'username' => 'stafbaru',
                'email' => 'staf@example.com',
                'password' => 'secret123',
                'role_id' => Role::where('name', 'Staf')->value('id'),
                'status' => 'active',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('users', ['username' => 'stafbaru']);
    }

    public function test_user_nonaktif_tidak_bisa_login(): void
    {
        $user = User::factory()->create(['username' => 'nonaktif', 'status' => 'inactive']);

        // Referer dari frontend membuat Sanctum memperlakukan request sebagai
        // stateful, sehingga controller punya akses ke session.
        $this->withServerVariables(['HTTP_REFERER' => 'http://localhost/'])
            ->postJson('/api/login', [
                'username' => $user->username,
                'password' => 'password',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Akun Anda telah dinonaktifkan.');
    }
}
