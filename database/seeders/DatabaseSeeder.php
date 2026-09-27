<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->seedRoles();
        $this->call(KategoriSeeder::class);
        $this->call(AkunDetailSeeder::class);
        $this->call(JenisBarangSeeder::class);
        $this->call(BarangSeeder::class);
        $this->call(ClientSeeder::class);

        $roles = Role::pluck('id', 'name');

        User::create([
            'name' => 'Super Administrator',
            'username' => 'superadmin',
            'email' => 'superadmin@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('1234'),
            'role_id' => $roles['SuperAdmin'],
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Administrator',
            'username' => 'admin',
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('1234'),
            'role_id' => $roles['Admin'],
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Petugas Pembelian Telur',
            'username' => 'pembelian_telur',
            'email' => 'pembelian_telur@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('1234'),
            'role_id' => $roles['Pembelian Telur'],
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Petugas Penjualan Pakan & Obat',
            'username' => 'penjualan_pakan_obat',
            'email' => 'penjualan_pakan_obat@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('1234'),
            'role_id' => $roles['Penjualan Pakan dan Obat'],
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Petugas Kas Tunai',
            'username' => 'kas_tunai',
            'email' => 'kas_tunai@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('1234'),
            'role_id' => $roles['Kas Tunai'],
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Petugas Kas Transfer',
            'username' => 'kas_transfer',
            'email' => 'kas_transfer@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('1234'),
            'role_id' => $roles['Kas Transfer'],
            'status' => 'active',
        ]);

    }

    private function seedRoles(): void
    {
        $perms = collect([
            // Master Data
            'menu.master.jenis_barang' => 'Menu Master Data > Jenis Barang',
            'menu.master.barang' => 'Menu Master Data > Barang',
            'menu.master.client' => 'Menu Master Data > Client',

            // Pembelian
            'menu.pembelian.telur' => 'Menu Pembelian > Pembelian Telur',
            'menu.pembelian.pakan' => 'Menu Pembelian > Pembelian Pakan',
            'menu.pembelian.obat' => 'Menu Pembelian > Pembelian Obat',
            'menu.pembelian.tray' => 'Menu Pembelian > Pembelian Tray',

            // Penjualan
            'menu.penjualan.telur' => 'Menu Penjualan > Penjualan Telur',
            'menu.penjualan.pakan' => 'Menu Penjualan > Penjualan Pakan',
            'menu.penjualan.obat' => 'Menu Penjualan > Penjualan Obat',
            'menu.penjualan.tray' => 'Menu Penjualan > Penjualan Tray',

            // Retur & Riwayat
            'menu.retur.penjualan' => 'Menu Retur & Riwayat > Retur Penjualan',
            'menu.retur.pembelian' => 'Menu Retur & Riwayat > Retur Pembelian',
            'menu.transaksi.riwayat' => 'Menu Retur & Riwayat > Riwayat Transaksi',

            // Stok
            'menu.stok.barang' => 'Menu Stok > Stok Barang',
            'menu.stok.fifo' => 'Menu Stok > FIFO',
            'menu.stok.opname' => 'Menu Stok > Stok Opname',
            'menu.stok.riwayat' => 'Menu Stok > Riwayat Stok',
            'menu.stok.laporan' => 'Menu Stok > Laporan Stok Barang',

            // Akuntansi
            'menu.akuntansi.saldo_client' => 'Menu Akuntansi > Saldo Per Client',
            'menu.akuntansi.hutang' => 'Menu Akuntansi > Hutang',
            'menu.akuntansi.piutang' => 'Menu Akuntansi > Piutang',
            'menu.akuntansi.jurnal' => 'Menu Akuntansi > Jurnal Umum',
            'menu.akuntansi.kas' => 'Menu Akuntansi > Monitoring Kas',

            // Entri Jurnal
            'menu.jurnal.kas' => 'Menu Entri Jurnal > Kas',
            'menu.jurnal.beban' => 'Menu Entri Jurnal > Beban',
            'menu.jurnal.pendapatan' => 'Menu Entri Jurnal > Pendapatan',
            'menu.jurnal.akun' => 'Menu Entri Jurnal > Akun',
            'menu.jurnal.kategori' => 'Menu Entri Jurnal > Kategori Akun',

            // Laporan
            'menu.laporan.buku_besar' => 'Menu Laporan > Buku Besar',
            'menu.laporan.neraca' => 'Menu Laporan > Neraca',
            'menu.laporan.laba_rugi' => 'Menu Laporan > Laba Rugi',
            'menu.laporan.laba_rugi_curah' => 'Menu Laporan > Laba Rugi Pakan Curah',

            // Akses
            'menu.akses.role' => 'Menu Akses > Role Permission',
            'menu.akses.user' => 'Menu Akses > User',
            'menu.akses.log' => 'Menu Akses > Log Aktivitas',
        ])->map(function ($desc, $name) {
            return Permission::updateOrCreate(['name' => $name], ['description' => $desc]);
        });

        $permIds = $perms->pluck('id', 'name');

        $assignments = [
            'SuperAdmin' => $permIds->keys()->all(),
            'Admin' => [
                'menu.master.jenis_barang', 'menu.master.barang', 'menu.master.client',
                'menu.pembelian.telur', 'menu.pembelian.pakan', 'menu.pembelian.obat', 'menu.pembelian.tray',
                'menu.penjualan.telur', 'menu.penjualan.pakan', 'menu.penjualan.obat', 'menu.penjualan.tray',
                'menu.retur.penjualan', 'menu.retur.pembelian', 'menu.transaksi.riwayat',
                'menu.stok.barang', 'menu.stok.fifo', 'menu.stok.opname', 'menu.stok.riwayat',
                'menu.stok.laporan',
                'menu.akuntansi.saldo_client', 'menu.akuntansi.hutang', 'menu.akuntansi.piutang', 'menu.akuntansi.jurnal', 'menu.akuntansi.kas',
                'menu.jurnal.kas', 'menu.jurnal.beban', 'menu.jurnal.pendapatan', 'menu.jurnal.akun', 'menu.jurnal.kategori',
                'menu.laporan.buku_besar', 'menu.laporan.neraca', 'menu.laporan.laba_rugi', 'menu.laporan.laba_rugi_curah',
                'menu.akses.log',
            ],
            'Pembelian Telur' => [
                'menu.pembelian.telur',
            ],
            'Penjualan Pakan dan Obat' => [
                'menu.penjualan.pakan', 'menu.penjualan.obat',
            ],
            'Kas Tunai' => [
                'menu.akuntansi.saldo_client', 'menu.akuntansi.hutang', 'menu.akuntansi.piutang', 'menu.akuntansi.jurnal', 'menu.akuntansi.kas',
                'menu.jurnal.kas', 'menu.jurnal.beban', 'menu.jurnal.pendapatan', 'menu.jurnal.akun', 'menu.jurnal.kategori',
                'menu.laporan.buku_besar', 'menu.laporan.neraca', 'menu.laporan.laba_rugi', 'menu.laporan.laba_rugi_curah',
            ],
            'Kas Transfer' => [
                'menu.pembelian.pakan', 'menu.pembelian.obat', 'menu.pembelian.tray',
                'menu.penjualan.telur', 'menu.penjualan.tray',
            ],
        ];

        foreach ($assignments as $name => $permNames) {
            $role = Role::updateOrCreate(
                ['name' => $name],
                ['description' => "Role $name", 'status' => 'active'],
            );
            $role->permissions()->sync(collect($permNames)->map(fn ($p) => $permIds[$p])->all());
        }
    }
}
