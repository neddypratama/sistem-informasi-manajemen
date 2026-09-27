<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class ExcelExportTest extends TestCase
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

    /**
     * @return array<int, string>
     */
    private function exportUrls(): array
    {
        return [
            '/api/transaksi/export-excel',
            '/api/stok/export-excel',
            '/api/stok/riwayat/{barang}/export-excel',
            '/api/stok/laporan/export-excel',
            '/api/stok-opname/export-excel',
            '/api/jurnal/export-excel',
            '/api/laporan/buku-besar/export-excel',
            '/api/laporan/neraca/export-excel',
            '/api/laporan/laba-rugi/export-excel',
            '/api/laporan/laba-rugi-curah/export-excel',
            '/api/hutang/export-excel',
            '/api/piutang/export-excel',
            '/api/kas/export-excel',
            '/api/tagihan/export-excel',
        ];
    }

    /**
     * Baca isi file xlsx dari respons stream.
     *
     * @return Worksheet
     */
    private function readWorksheet(TestResponse $response)
    {
        $content = $response->streamedContent();

        $this->assertStringStartsWith('PK', $content, 'Respons bukan file .xlsx (zip).');

        $path = tempnam(sys_get_temp_dir(), 'xlsx').'.xlsx';
        file_put_contents($path, $content);

        try {
            return IOFactory::load($path)->getActiveSheet();
        } finally {
            @unlink($path);
        }
    }

    public function test_semua_endpoint_export_mengembalikan_file_xlsx(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');
        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        foreach ($this->exportUrls() as $url) {
            $response = $this->actingAsApi($this->user)
                ->get(str_replace('{barang}', (string) $this->barang->id, $url))
                ->assertOk()
                ->assertHeader(
                    'Content-Type',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                );

            $this->readWorksheet($response);
        }
    }

    public function test_export_transaksi_memuat_baris_data(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $userBiasa = $this->buatUserBerizin(['menu.pembelian.telur']);

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $sheet = $this->readWorksheet(
            $this->actingAsApi($userBiasa)->get('/api/transaksi/export-excel?tipe=pembelian')->assertOk(),
        );

        $this->assertSame('Nomor', $sheet->getCell('A1')->getValue());
        $this->assertNull($sheet->getCell('A2')->getValue(), 'User biasa tidak boleh mengekspor transaksi milik user lain.');

        $this->simpanTransaksi($userBiasa, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 5, 'harga' => 20000],
        ]);

        $sheet = $this->readWorksheet(
            $this->actingAsApi($userBiasa)->get('/api/transaksi/export-excel?tipe=pembelian')->assertOk(),
        );

        $this->assertNotNull($sheet->getCell('A2')->getValue(), 'User biasa mengekspor transaksi miliknya sendiri.');
        $this->assertNull($sheet->getCell('A3')->getValue());
    }

    public function test_export_tanpa_izin_ditolak(): void
    {
        $userTanpaIzin = $this->buatUserBerizin([]);

        $this->actingAsApi($userTanpaIzin)
            ->get('/api/transaksi/export-excel')
            ->assertForbidden();

        $this->actingAsApi($userTanpaIzin)
            ->get('/api/kas/export-excel')
            ->assertForbidden();
    }
}
