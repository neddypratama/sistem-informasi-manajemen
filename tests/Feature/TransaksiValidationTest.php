<?php

namespace Tests\Feature;

use App\Models\Barang;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class TransaksiValidationTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->buatAkunSistem();
    }

    public function test_validasi_transaksi_mengembalikan_pesan_bahasa_indonesia_bukan_raw_key(): void
    {
        $supplier = $this->buatClient('Supplier Test', 'supplier');

        // Mengirimkan transaksi tanpa barang dan tanpa tanggal
        $response = $this->actingAsApi($this->user)
            ->postJson('/api/transaksi', [
                'tipe_transaksi' => 'pembelian',
                'client_id' => $supplier->id,
                'items' => [],
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tanggal', 'items']);

        $json = $response->json();
        $errors = $json['errors'];

        // Pastikan tidak ada pesan yang mengembalikan kunci mentah "validation.*"
        foreach ($errors as $field => $messages) {
            foreach ($messages as $message) {
                $this->assertStringNotContainsString('validation.', $message, "Pesan validasi untuk {$field} masih berupa kunci mentah: {$message}");
            }
        }

        // Pastikan pesan dalam Bahasa Indonesia
        $this->assertStringContainsString('wajib diisi', $errors['tanggal'][0]);
        $this->assertStringContainsString('Minimal satu barang wajib diisi', $errors['items'][0]);
    }

    public function test_penjualan_dengan_dua_barang_sama_melebihi_stok_menampilkan_pesan_stok_tidak_mencukupi(): void
    {
        $supplier = $this->buatClient('Supplier Test', 'supplier');
        $customer = $this->buatClient('Customer Test', 'customer');
        $barang = $this->buatBarang('Telur Ayam', 'TLR', 10); // Stok = 10

        // Pembelian awal untuk mengisi stok FIFO
        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $barang->id, 'kuantitas' => 10, 'harga' => 20000],
        ]);

        // Coba penjualan dengan 2 item barang yang sama tapi total kuantitas (8 + 5 = 13) melebihi stok (10)
        $response = $this->actingAsApi($this->user)
            ->postJson('/api/transaksi', [
                'tanggal' => '2026-09-01',
                'tipe_transaksi' => 'penjualan',
                'client_id' => $customer->id,
                'items' => [
                    ['barang_id' => $barang->id, 'kuantitas' => 8, 'harga' => 25000],
                    ['barang_id' => $barang->id, 'kuantitas' => 5, 'harga' => 26000],
                ],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Stok barang tidak mencukupi.');
    }
}
