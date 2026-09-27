<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SpaShellRouteTest extends TestCase
{
    /**
     * @return array<string, array{string}>
     */
    public static function spaPaths(): array
    {
        return [
            'root' => ['/'],
            'login' => ['/login'],
            'satu segmen' => ['/barang'],
            'dua segmen' => ['/transaksi/riwayat'],
            'tiga segmen' => ['/akuntansi/pelunasan/hutang'],
            'segmen numerik' => ['/transaksi/12/ubah'],
        ];
    }

    #[DataProvider('spaPaths')]
    public function test_rute_spa_mengembalikan_shell_vue(string $path): void
    {
        $this->get($path)
            ->assertOk()
            ->assertSee('id="app"', false)
            ->assertSee('type="module"', false);
    }

    public function test_rute_api_tidak_tertangkap_shell_spa(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
    }

    public function test_rute_sanctum_dan_health_check_tidak_tertangkap_shell_spa(): void
    {
        $this->get('/sanctum/csrf-cookie')->assertNoContent();
        $this->get('/up')->assertOk()->assertDontSee('id="app"', false);
    }

    public function test_permintaan_aset_tidak_tertangkap_shell_spa(): void
    {
        $this->get('/tidak-ada.png')->assertNotFound();
    }
}
