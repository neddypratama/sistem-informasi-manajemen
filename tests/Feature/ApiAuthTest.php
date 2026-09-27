<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiAuthTest extends TestCase
{
    use RefreshDatabase;

    private function role(string $name, array $permissions): Role
    {
        $role = Role::create(['name' => $name, 'description' => "Role $name", 'status' => 'active']);
        $ids = collect($permissions)->map(fn ($p) => Permission::create(['name' => $p])->id);
        $role->permissions()->sync($ids);

        return $role;
    }

    private function user(Role $role, string $username): User
    {
        return User::factory()->create(['username' => $username, 'role_id' => $role->id, 'status' => 'active']);
    }

    public function test_api_dashboard_menolak_tanpa_auth(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
        $this->getJson('/api/dashboard/stok')->assertUnauthorized();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_user_authenticated_bisa_mengambil_data_diri(): void
    {
        $role = $this->role('SuperAdmin', ['view.akuntansi']);
        $user = $this->user($role, 'apitest');

        Sanctum::actingAs($user);

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.username', 'apitest')
            ->assertJsonPath('user.role.name', 'SuperAdmin');
    }

    public function test_dashboard_mengembalikan_agregat(): void
    {
        $role = $this->role('SuperAdmin', []);
        $user = $this->user($role, 'apitest2');

        Sanctum::actingAs($user);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'periode' => ['preset', 'dari', 'sampai', 'label'],
                'kpi' => [
                    'penjualan',
                    'penjualanGrowth',
                    'pembelian',
                    'pembelianGrowth',
                    'nilaiPersediaan',
                    'jumlahStok',
                    'piutang',
                    'piutangJumlah',
                    'hutang',
                    'hutangJumlah',
                    'kasBank',
                    'kasBankLabel',
                ],
                'chart' => ['granularity', 'labels', 'pembelian', 'penjualan', 'hpp', 'labaKotor', 'margin'],
                'arusKas' => ['pemasukan', 'pengeluaran', 'bersih', 'pemasukanSeries', 'pengeluaranSeries', 'puncak'],
                'aktivitasHariIni' => [
                    'tanggal',
                    'tanggalLabel',
                    'transaksi' => ['jumlah', 'total'],
                    'barangAktif',
                    'clientAktif',
                    'hutangLebihBesar' => ['jumlah', 'selisih'],
                    'jurnal' => ['seimbang', 'tidakSeimbang'],
                    'auditTerakhir',
                ],
            ]);
    }

    public function test_permission_ditegakkan_untuk_api(): void
    {
        $role = $this->role('Gudang', ['menu.stok.barang']);
        $user = $this->user($role, 'apitest3');

        Sanctum::actingAs($user);

        $this->getJson('/api/stok')->assertOk();
        $this->getJson('/api/jurnal')->assertForbidden();
        $this->getJson('/api/role')->assertForbidden();
    }

    public function test_master_crud_menjalankan_validasi(): void
    {
        $role = $this->role('Admin', ['menu.master.jenis_barang', 'menu.master.client']);
        $user = $this->user($role, 'apitest4');

        Sanctum::actingAs($user);

        $this->postJson('/api/jenis-barang', ['nama' => 'Obat', 'status' => 'aktif'])
            ->assertCreated()
            ->assertJsonPath('nama', 'Obat');

        $this->postJson('/api/client', ['nama' => 'PT Contoh'])
            ->assertStatus(422);
    }

    public function test_login_dan_logout_menggunakan_sesi_stateful(): void
    {
        $this->role('SuperAdmin', []);
        $user = $this->user(Role::where('name', 'SuperAdmin')->first(), 'apitest5');

        $this->withServerVariables(['HTTP_REFERER' => 'http://localhost/'])
            ->get('/sanctum/csrf-cookie')
            ->assertNoContent();

        $this->withServerVariables(['HTTP_REFERER' => 'http://localhost/'])
            ->postJson('/api/login', [
                'username' => 'apitest5',
                'password' => 'password',
            ], ['X-CSRF-TOKEN' => $this->app['session']->token()])
            ->assertOk()
            ->assertJsonPath('user.username', 'apitest5')
            ->assertJsonPath('user.role.name', 'SuperAdmin');

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.username', 'apitest5');

        $this->withServerVariables(['HTTP_REFERER' => 'http://localhost/'])
            ->postJson('/api/logout', [], ['X-CSRF-TOKEN' => $this->app['session']->token()])
            ->assertOk();

        $this->app['auth']->forgetGuards();

        $this->getJson('/api/me')->assertUnauthorized();
    }
}
