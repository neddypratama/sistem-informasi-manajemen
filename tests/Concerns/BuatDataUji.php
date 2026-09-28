<?php

namespace Tests\Concerns;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use App\Models\Hutang;
use App\Models\JenisBarang;
use App\Models\Kategori;
use App\Models\Permission;
use App\Models\Piutang;
use App\Models\Role;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * Pembuatan data uji yang dipakai lintas feature test: bagan akun sistem,
 * barang, client, role berizin, dan transaksi via API.
 */
trait BuatDataUji
{
    /**
     * Bagan akun minimal yang dibutuhkan JurnalService.
     *
     * @return array<string, Akun> Ditandai dengan system_code: kas, piutang, stok, hutang, penjualan, hpp.
     */
    protected function buatAkunSistem(): array
    {
        $kategoris = [
            'aset' => Kategori::create(['nama' => 'Aset', 'jenis' => 'aset', 'status' => 'aktif']),
            'liabilitas' => Kategori::create(['nama' => 'Liabilitas', 'jenis' => 'liabilitas', 'status' => 'aktif']),
            'pendapatan' => Kategori::create(['nama' => 'Pendapatan', 'jenis' => 'pendapatan', 'status' => 'aktif']),
            'beban' => Kategori::create(['nama' => 'Beban', 'jenis' => 'beban', 'status' => 'aktif']),
        ];

        $definisi = [
            ['1101', 'Kas', 'aset', 'debit', 'kas'],
            ['1102', 'Piutang', 'aset', 'debit', 'piutang'],
            ['1201', 'Stok', 'aset', 'debit', 'stok'],
            ['2101', 'Hutang', 'liabilitas', 'kredit', 'hutang'],
            ['4101', 'Penjualan', 'pendapatan', 'kredit', 'penjualan'],
            ['5101', 'HPP', 'beban', 'debit', 'hpp'],
            ['5102', 'Selisih Stok', 'beban', 'debit', 'selisih_stok'],
        ];

        $akuns = [];

        foreach ($definisi as [$kode, $nama, $jenis, $saldoNormal, $systemCode]) {
            $akuns[$systemCode] = Akun::create([
                'kode' => $kode,
                'nama' => $nama,
                'kategori_id' => $kategoris[$jenis]->id,
                'saldo_normal' => $saldoNormal,
                'status' => 'aktif',
                'system_code' => $systemCode,
            ]);
        }

        return $akuns;
    }

    /**
     * Buat akun detail bernama (tanpa system_code) untuk pengujian resolver JurnalService.
     *
     * @param  array<string, Akun>  $akuns  hasil buatAkunSistem()
     * @return array<string, Akun>
     */
    protected function buatAkunDetail(array $akuns): array
    {
        $aset = Kategori::where('jenis', 'aset')->firstOrFail();
        $liabilitas = Kategori::where('jenis', 'liabilitas')->firstOrFail();
        $pendapatan = Kategori::where('jenis', 'pendapatan')->firstOrFail();
        $beban = Kategori::where('jenis', 'beban')->firstOrFail();

        $detail = [
            // Stok per kelompok
            ['nama' => 'Stok Telur', 'kategori_id' => $aset->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Stok Pakan', 'kategori_id' => $aset->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Stok Obat-Obatan', 'kategori_id' => $aset->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Stok Tray', 'kategori_id' => $aset->id, 'saldo_normal' => 'debit'],
            // Stok Pakan Curah (unit terpisah)
            ['nama' => 'Stok Pakan Curah', 'kategori_id' => $aset->id, 'saldo_normal' => 'debit', 'system_code' => 'stok_pakan_curah'],
            // Hutang per kelompok
            ['nama' => 'Hutang Peternak', 'kategori_id' => $liabilitas->id, 'saldo_normal' => 'kredit'],
            ['nama' => 'Hutang Supplier', 'kategori_id' => $liabilitas->id, 'saldo_normal' => 'kredit'],
            // Hutang Pakan Curah (unit terpisah)
            ['nama' => 'Saldo Bp.Supriyadi', 'kategori_id' => $liabilitas->id, 'saldo_normal' => 'kredit'],
            ['nama' => 'Hutang Pakan Curah', 'kategori_id' => $liabilitas->id, 'saldo_normal' => 'kredit', 'system_code' => 'hutang_pakan_curah'],
            // Piutang per tipe client
            ['nama' => 'Piutang Pedagang', 'kategori_id' => $aset->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Piutang Peternak', 'kategori_id' => $aset->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Piutang Karyawan', 'kategori_id' => $aset->id, 'saldo_normal' => 'debit'],
            // Piutang Pakan Curah (unit terpisah)
            ['nama' => 'Piutang Pakan Curah', 'kategori_id' => $aset->id, 'saldo_normal' => 'debit', 'system_code' => 'piutang_pakan_curah'],
            // Penjualan per jenis
            ['nama' => 'Penjualan Telur Bebek', 'kategori_id' => $pendapatan->id, 'saldo_normal' => 'kredit'],
            ['nama' => 'Penjualan Telur Horn', 'kategori_id' => $pendapatan->id, 'saldo_normal' => 'kredit'],
            ['nama' => 'Penjualan Telur Puyuh', 'kategori_id' => $pendapatan->id, 'saldo_normal' => 'kredit'],
            ['nama' => 'Penjualan Pakan Sentrat/Pabrikan', 'kategori_id' => $pendapatan->id, 'saldo_normal' => 'kredit'],
            ['nama' => 'Penjualan Obat-Obatan', 'kategori_id' => $pendapatan->id, 'saldo_normal' => 'kredit'],
            ['nama' => 'Penjualan EggTray', 'kategori_id' => $pendapatan->id, 'saldo_normal' => 'kredit'],
            // Penjualan Pakan Curah (unit terpisah)
            ['nama' => 'Penjualan Pakan Curah', 'kategori_id' => $pendapatan->id, 'saldo_normal' => 'kredit', 'system_code' => 'penjualan_pakan_curah'],
            // HPP Curah (unit terpisah)
            ['nama' => 'HPP Curah', 'kategori_id' => $beban->id, 'saldo_normal' => 'debit', 'system_code' => 'hpp_pakan_curah'],
            // Beban hasil stok opname
            ['nama' => 'Beban Selisih Stok', 'kategori_id' => $beban->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Beban Telur Kotor', 'kategori_id' => $beban->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Beban Telur Bentes', 'kategori_id' => $beban->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Beban Telur Ceplok', 'kategori_id' => $beban->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Beban Telur Prok', 'kategori_id' => $beban->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Beban Telur Jumbo', 'kategori_id' => $beban->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Beban Barang Kadaluarsa', 'kategori_id' => $beban->id, 'saldo_normal' => 'debit'],
            ['nama' => 'Beban Tray Terpakai', 'kategori_id' => $beban->id, 'saldo_normal' => 'debit'],
        ];

        $result = [];
        $counter = 9000;

        foreach ($detail as $item) {
            $result[$item['nama']] = Akun::create([
                'kode' => (string) $counter++,
                'nama' => $item['nama'],
                'kategori_id' => $item['kategori_id'],
                'saldo_normal' => $item['saldo_normal'],
                'status' => 'aktif',
                'system_code' => $item['system_code'] ?? null,
            ]);
        }

        return $result;
    }

    protected function buatBarang(
        string $kode = 'BRG-001',
        string $nama = 'Beras',
        string $namaJenis = 'Sembako',
        ?string $kelompok = null,
    ): Barang {
        $jenis = JenisBarang::firstOrCreate(
            ['nama' => $namaJenis],
            [
                'keterangan' => null,
                'status' => 'aktif',
                'kelompok' => $kelompok,
            ],
        );

        return Barang::create([
            'jenis_barang_id' => $jenis->id,
            'kode_barang' => $kode,
            'nama_barang' => $nama,
            'satuan' => 'kg',
            'stok' => 0,
            'status' => 'aktif',
        ]);
    }

    protected function buatClient(string $nama, string $tipe): Client
    {
        // Petakan nilai lama (supplier/customer) ke enum baru (Supplier/Pedagang).
        $tipe = match (strtolower($tipe)) {
            'supplier' => 'Supplier',
            'customer' => 'Pedagang',
            default => $tipe,
        };

        return Client::create([
            'nama' => $nama,
            'alamat' => null,
            'no_telepon' => null,
            'tipe' => $tipe,
            'status' => 'aktif',
        ]);
    }

    /**
     * Buat tagihan hutang langsung (tanpa jurnal) untuk uji agregat dashboard.
     */
    protected function buatHutang(Client $client, float $total, User $user, string $tanggal = '2026-08-10'): Hutang
    {
        return Hutang::create([
            'no_hutang' => 'HT-'.Str::upper(Str::random(8)),
            'tanggal' => $tanggal,
            'client_id' => $client->id,
            'total' => $total,
            'keterangan' => 'Hutang uji',
            'status' => 'belum_lunas',
            'created_by' => $user->id,
        ]);
    }

    /**
     * Buat tagihan piutang langsung (tanpa jurnal) untuk uji agregat dashboard.
     */
    protected function buatPiutang(Client $client, float $total, User $user, string $tanggal = '2026-08-10'): Piutang
    {
        return Piutang::create([
            'no_piutang' => 'PT-'.Str::upper(Str::random(8)),
            'tanggal' => $tanggal,
            'client_id' => $client->id,
            'total' => $total,
            'keterangan' => 'Piutang uji',
            'status' => 'belum_lunas',
            'created_by' => $user->id,
        ]);
    }

    /**
     * Buat user dengan role yang memiliki permission tertentu.
     *
     * Nama role dibuat unik agar tidak bentrok dengan `UserFactory` yang
     * membuat role `SuperAdmin` (yang melewati semua pemeriksaan izin).
     *
     * @param  array<int, string>  $permissions
     */
    protected function buatUserBerizin(array $permissions): User
    {
        $role = Role::create([
            'name' => 'Role-'.uniqid(),
            'description' => 'Role uji',
            'status' => 'active',
        ]);

        $ids = collect($permissions)->map(
            fn (string $permission) => Permission::firstOrCreate(['name' => $permission])->id,
        );

        $role->permissions()->sync($ids);

        return User::factory()->create(['role_id' => $role->id]);
    }

    /**
     * Simpan transaksi lewat API dan kembalikan model hasilnya.
     *
     * @param  array<int, array{barang_id: int, kuantitas: int|float, harga: int|float}>  $items
     */
    protected function simpanTransaksi(
        User $user,
        string $tipe,
        Client $client,
        array $items,
        string $tanggal = '2026-08-01',
        ?string $keterangan = null,
    ): Transaksi {
        $this->actingAsApi($user)
            ->postJson('/api/transaksi', [
                'tanggal' => $tanggal,
                'tipe_transaksi' => $tipe,
                'client_id' => $client->id,
                'keterangan' => $keterangan,
                'items' => $items,
            ])
            ->assertCreated();

        return Transaksi::where('tipe_transaksi', $tipe)->orderByDesc('id')->firstOrFail();
    }

    /**
     * Simpan retur lewat API dan kembalikan model hasilnya.
     *
     * @param  array<int, array{barang_id: int, kuantitas: int|float, harga: int|float}>  $items
     */
    protected function simpanRetur(
        User $user,
        string $tipe,
        Transaksi $sumber,
        array $items,
        string $tanggal = '2026-08-15',
        ?string $keterangan = null,
    ): Transaksi {
        $preparedItems = collect($items)->map(function (array $item) use ($sumber) {
            if (! isset($item['detail_sumber_id'])) {
                $matchingLine = $sumber->detailTransaksis()
                    ->where('barang_id', $item['barang_id'])
                    ->first();

                if ($matchingLine) {
                    $item['detail_sumber_id'] = $matchingLine->id;
                }
            }

            return $item;
        })->toArray();

        $this->actingAsApi($user)
            ->postJson('/api/retur', [
                'tanggal' => $tanggal,
                'tipe_transaksi' => $tipe,
                'sumber_id' => $sumber->id,
                'keterangan' => $keterangan,
                'items' => $preparedItems,
            ])
            ->assertCreated();

        return Transaksi::where('tipe_transaksi', $tipe)->orderByDesc('id')->firstOrFail();
    }
}
