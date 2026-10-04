<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class DataImportTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    public function test_can_download_template_excel(): void
    {
        $user = $this->buatUserBerizin(['menu.laporan.laba_rugi_curah']);

        $moduls = ['client', 'barang', 'akun', 'hutang_piutang', 'jurnal', 'pembelian', 'penjualan', 'retur'];

        foreach ($moduls as $modul) {
            $response = $this->actingAsApi($user)->get("/api/import/template/{$modul}");
            $response->assertOk();
            $this->assertEquals(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                $response->headers->get('content-type')
            );
        }
    }
}
