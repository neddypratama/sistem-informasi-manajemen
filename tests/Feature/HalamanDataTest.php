<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\Client;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

/**
 * Setiap halaman SPA memuat datanya dari satu endpoint API. Test ini memastikan
 * endpoint tersebut dapat diakses dan mengembalikan payload yang dipakai UI.
 * Shell HTML-nya sendiri diuji terpisah pada SpaShellRouteTest.
 */
class HalamanDataTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Barang $barang;

    private Client $supplier;

    private Client $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->buatAkunSistem();
        $this->barang = $this->buatBarang();
        $this->supplier = $this->buatClient('Supplier A', 'supplier');
        $this->customer = $this->buatClient('Customer B', 'customer');
    }

    /**
     * @return array<string, array{string}>
     */
    public static function endpointHalaman(): array
    {
        return [
            'dashboard' => ['/api/dashboard'],
            'dashboard stok' => ['/api/dashboard/stok'],
            'jenis barang' => ['/api/jenis-barang'],
            'barang' => ['/api/barang'],
            'client' => ['/api/client'],
            'form transaksi' => ['/api/transaksi/create-data'],
            'riwayat transaksi' => ['/api/transaksi'],
            'form retur' => ['/api/retur/create-data'],
            'stok' => ['/api/stok'],
            'stok fifo' => ['/api/stok/fifo'],
            'riwayat stok' => ['/api/stok/riwayat'],
            'laporan stok' => ['/api/stok/laporan'],
            'saldo client' => ['/api/tagihan'],
            'monitoring kas' => ['/api/kas'],
            'jurnal umum' => ['/api/jurnal'],
            'form jurnal' => ['/api/jurnal/create-data'],
            'akun' => ['/api/akun'],
            'kategori akun' => ['/api/kategori'],
            'buku besar' => ['/api/laporan/buku-besar'],
            'neraca' => ['/api/laporan/neraca'],
            'laba rugi' => ['/api/laporan/laba-rugi'],
            'laba rugi pakan curah' => ['/api/laporan/laba-rugi-curah'],
            'bayar hutang' => ['/api/pelunasan/hutang'],
            'terima piutang' => ['/api/pelunasan/piutang'],
            'role' => ['/api/role'],
            'user' => ['/api/user'],
        ];
    }

    #[DataProvider('endpointHalaman')]
    public function test_endpoint_halaman_dapat_diakses_dengan_auth(string $endpoint): void
    {
        $this->actingAsApi($this->user)->getJson($endpoint)->assertOk();
    }

    public function test_endpoint_halaman_menolak_tanpa_auth(): void
    {
        foreach (['/api/dashboard', '/api/transaksi', '/api/stok', '/api/jurnal'] as $endpoint) {
            $this->getJson($endpoint)->assertUnauthorized();
        }
    }

    public function test_detail_transaksi_memuat_rincian_barang_dan_total(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ], '2026-08-01');

        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 12000],
        ], '2026-08-05');

        $penjualan = $this->simpanTransaksi($this->user, 'penjualan', $this->customer, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 12, 'harga' => 15000],
        ], '2026-08-10');

        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi/'.$penjualan->id)
            ->assertOk()
            ->assertJsonPath('transaksi.nomor_transaksi', $penjualan->nomor_transaksi)
            ->assertJsonPath('transaksi.tipe_transaksi', 'penjualan')
            ->assertJsonPath('transaksi.client', 'Customer B')
            ->assertJsonPath('transaksi.total', 180000)
            ->assertJsonCount(1, 'transaksi.details')
            ->assertJsonPath('transaksi.details.0.kode_barang', 'BRG-001')
            ->assertJsonPath('transaksi.details.0.kuantitas', 12)
            ->assertJsonPath('transaksi.details.0.subtotal', 180000);
    }

    public function test_form_transaksi_memuat_semua_client_aktif(): void
    {
        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi/create-data?tipe=pembelian')
            ->assertOk()
            ->assertJsonCount(2, 'clients')
            ->assertJsonPath('clients.0.nama', 'Customer B')
            ->assertJsonPath('clients.1.nama', 'Supplier A');

        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi/create-data?tipe=penjualan')
            ->assertOk()
            ->assertJsonCount(2, 'clients');
    }

    public function test_riwayat_transaksi_dapat_difilter_per_tipe(): void
    {
        $pembelian = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $retur = $this->simpanRetur($this->user, 'pembelian_retur', $pembelian, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 2, 'harga' => 10000],
        ], '2026-08-03');

        $nomorRetur = $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?tipe=retur')
            ->assertOk()
            ->json('data.*.nomor_transaksi');

        $this->assertSame([$retur->nomor_transaksi], $nomorRetur);

        $nomorPembelian = $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?tipe=pembelian')
            ->assertOk()
            ->json('data.*.nomor_transaksi');

        $this->assertSame([$pembelian->nomor_transaksi], $nomorPembelian);

        // Tanpa filter, keduanya tampil.
        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('total_nilai', fn ($value) => $value == 120000);

        // Total dihitung dari seluruh hasil filter, bukan hanya halaman aktif.
        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?tipe=retur')
            ->assertOk()
            ->assertJsonPath('total_nilai', fn ($value) => $value == 20000);

        $this->assertSame(2, Transaksi::count());
    }

    /**
     * Pencarian teks ikut menelusuri nama barang lewat detail transaksi.
     * Dua detail dengan nama barang yang sama-sama mengandung kata kunci
     * wajib tetap satu baris transaksi dan total yang tidak digandakan.
     */
    public function test_riwayat_transaksi_dapat_dicari_berdasarkan_nama_barang(): void
    {
        $berasPremium = $this->buatBarang('BRG-002', 'Beras Premium', 'Sembako');
        $jagungPakan = $this->buatBarang('BRG-003', 'Jagung Pakan', 'Pakan', 'pakan');

        $pembelianBeras = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
            ['barang_id' => $berasPremium->id, 'kuantitas' => 5, 'harga' => 20000],
        ], '2026-08-01');

        $pembelianPakan = $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $jagungPakan->id, 'kuantitas' => 8, 'harga' => 5000],
        ], '2026-08-04');

        // Dua detail sama-sama mengandung "Beras" tetap satu transaksi.
        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?search=Beras')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pembelianBeras->id)
            ->assertJsonPath('total_nilai', fn ($value) => $value == 200000);

        // Pencocokan parsial tanpa mempedulikan huruf besar/kecil.
        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?search=beras')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // Nomor transaksi tetap bisa dicari.
        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?search='.$pembelianPakan->nomor_transaksi)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pembelianPakan->id);

        // Nama client tetap bisa dicari.
        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?search=Supplier')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // Kata kunci yang tidak cocok di mana pun tidak mengembalikan apa pun.
        $this->actingAsApi($this->user)
            ->getJson('/api/transaksi?search=zamrud')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_dashboard_mengembalikan_agregat_transaksi(): void
    {
        $this->simpanTransaksi($this->user, 'pembelian', $this->supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $response = $this->actingAsApi($this->user)
            ->getJson('/api/dashboard?preset=custom&dari=2026-08-01&sampai=2026-08-31')
            ->assertOk()
            ->assertJsonPath('periode.preset', 'custom')
            ->assertJsonPath('kpi.pembelian', fn ($value) => $value == 100000)
            ->assertJsonPath('kpi.penjualan', fn ($value) => $value == 0)
            ->assertJsonPath('kpi.jumlahStok', fn ($value) => $value == 10)
            ->assertJsonPath('chart.granularity', 'harian')
            ->assertJsonPath('chart.pembelian', fn ($values) => abs(array_sum($values) - 100000) < 0.01)
            ->assertJsonPath('arusKas.pemasukan', fn ($value) => $value == 0)
            ->assertJsonPath('arusKas.pengeluaran', fn ($value) => $value == 0)
            ->assertJsonPath('arusKas.bersih', fn ($value) => $value == 0)
            ->assertJsonPath('aktivitasHariIni.jurnal.seimbang', true)
            ->assertJsonPath('aktivitasHariIni.jurnal.tidakSeimbang', 0)
            ->assertJsonPath('aktivitasHariIni.transaksi.jumlah', 0)
            ->assertJsonPath('aktivitasHariIni.barangAktif', 1)
            // Pembelian kredit membuat 1 hutang supplier tanpa piutang penyeimbang.
            ->assertJsonPath('aktivitasHariIni.hutangLebihBesar.jumlah', 1)
            ->assertJsonPath('aktivitasHariIni.hutangLebihBesar.selisih', fn ($value) => $value == 100000)
            ->assertJsonStructure([
                'kpi' => ['penjualan', 'pembelian', 'nilaiPersediaan', 'kasBank'],
                'chart' => ['granularity', 'labels', 'pembelian', 'penjualan', 'hpp', 'labaKotor'],
                'arusKas' => ['pemasukan', 'pengeluaran', 'bersih', 'pemasukanSeries', 'pengeluaranSeries', 'puncak'],
                'aktivitasHariIni' => ['tanggal', 'tanggalLabel', 'transaksi', 'jurnal', 'auditTerakhir'],
            ]);

        // Seri arus kas selalu sepanjang label chart agar mudah digabungkan di UI.
        $this->assertCount(count($response->json('chart.labels')), $response->json('arusKas.pemasukanSeries'));
        $this->assertCount(count($response->json('chart.labels')), $response->json('arusKas.pengeluaranSeries'));
    }
}
