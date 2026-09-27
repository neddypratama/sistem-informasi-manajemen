<?php

namespace Tests\Feature;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\Jurnal;
use App\Models\StokOpname;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuatDataUji;
use Tests\TestCase;

class StokOpnameTest extends TestCase
{
    use BuatDataUji;
    use RefreshDatabase;

    private User $user;

    private Barang $barang;

    private Akun $bebanKadaluarsa;

    private Akun $bebanSelisihStok;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->buatAkunSistem();
        $this->buatAkunDetail([]);
        $this->barang = $this->buatBarang();
        $this->bebanKadaluarsa = Akun::where('nama', 'Beban Barang Kadaluarsa')->firstOrFail();
        $this->bebanSelisihStok = Akun::where('nama', 'Beban Selisih Stok')->firstOrFail();
    }

    public function test_create_data_memuat_stok_sistem_seluruh_barang_aktif(): void
    {
        $this->barang->update(['stok' => 12.5]);

        $this->actingAsApi($this->user)
            ->getJson('/api/stok-opname/create-data')
            ->assertOk()
            ->assertJsonCount(1, 'barangs')
            ->assertJsonPath('barangs.0.barang_id', $this->barang->id)
            ->assertJsonPath('barangs.0.stok_sistem', 12.5);
    }

    public function test_opname_selisih_kurang_mengurangi_stok_dan_membuat_jurnal(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->assertSame(10.0, (float) $this->barang->fresh()->stok);

        $this->actingAsApi($this->user)
            ->postJson('/api/stok-opname', [
                'tanggal' => '2026-08-20',
                'keterangan' => 'Opname bulanan',
                'items' => [
                    [
                        'barang_id' => $this->barang->id,
                        'beban_akun_id' => $this->bebanKadaluarsa->id,
                        'arah' => 'kurang',
                        'jumlah' => 2,
                    ],
                ],
            ])
            ->assertCreated();

        $opname = StokOpname::first();
        $this->assertNotNull($opname);
        $this->assertSame('selesai', $opname->status);
        $this->assertSame(1, $opname->details()->count());

        $detail = $opname->details()->first();
        $this->assertSame(10.0, (float) $detail->stok_sistem);
        $this->assertSame(8.0, (float) $detail->stok_fisik);
        $this->assertSame(-2.0, (float) $detail->selisih);
        $this->assertSame(10000.0, (float) $detail->harga_satuan);
        $this->assertSame(-20000.0, (float) $detail->nilai_selisih);

        $this->assertSame(8.0, (float) $this->barang->fresh()->stok);

        $jurnal = Jurnal::where('journalable_type', $opname->getMorphClass())
            ->where('journalable_id', $opname->id)
            ->firstOrFail();
        $stok = Akun::system('stok');
        $detailStok = $jurnal->details->firstWhere('akun_id', $stok->id);
        $detailBeban = $jurnal->details->firstWhere('akun_id', $this->bebanKadaluarsa->id);

        $this->assertSame(20000.0, (float) $detailBeban->debit);
        $this->assertSame(0.0, (float) $detailBeban->kredit);
        $this->assertSame(0.0, (float) $detailStok->debit);
        $this->assertSame(20000.0, (float) $detailStok->kredit);
    }

    public function test_opname_selisih_lebih_menambah_stok_dan_membuat_jurnal(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/stok-opname', [
                'tanggal' => '2026-08-20',
                'items' => [
                    [
                        'barang_id' => $this->barang->id,
                        'beban_akun_id' => $this->bebanSelisihStok->id,
                        'arah' => 'tambah',
                        'jumlah' => 3,
                    ],
                ],
            ])
            ->assertCreated();

        $opname = StokOpname::first();
        $detail = $opname->details()->first();
        $this->assertSame(3.0, (float) $detail->selisih);
        $this->assertSame(30000.0, (float) $detail->nilai_selisih);

        $this->assertSame(13.0, (float) $this->barang->fresh()->stok);

        $jurnal = Jurnal::where('journalable_type', $opname->getMorphClass())
            ->where('journalable_id', $opname->id)
            ->firstOrFail();
        $detailStok = $jurnal->details->firstWhere('akun_id', Akun::system('stok')->id);
        $detailAkun = $jurnal->details->firstWhere('akun_id', $this->bebanSelisihStok->id);

        $this->assertSame(30000.0, (float) $detailStok->debit);
        $this->assertSame(0.0, (float) $detailStok->kredit);
        $this->assertSame(0.0, (float) $detailAkun->debit);
        $this->assertSame(30000.0, (float) $detailAkun->kredit);
    }

    public function test_create_data_memuat_opsi_beban_per_kelompok(): void
    {
        $this->actingAsApi($this->user)
            ->getJson('/api/stok-opname/create-data')
            ->assertOk()
            ->assertJsonPath('beban_options.telur.0.nama', 'Beban Selisih Stok')
            ->assertJsonPath('beban_options.pakan.0.nama', 'Beban Selisih Stok')
            ->assertJsonPath('beban_options.obat.0.nama', 'Beban Selisih Stok')
            ->assertJsonPath('beban_options.tray.0.nama', 'Beban Selisih Stok')
            ->assertJsonFragment(['nama' => 'Beban Telur Kotor'])
            ->assertJsonFragment(['nama' => 'Beban Barang Kadaluarsa'])
            ->assertJsonFragment(['nama' => 'Beban Tray Terpakai'])
            ->assertJsonMissing(['nama' => 'Pendapatan/Laba dari Penyesuaian Persediaan']);
    }

    public function test_opname_campur_arah_pada_barang_sama_menghasilkan_jurnal_seimbang(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/stok-opname', [
                'tanggal' => '2026-08-20',
                'items' => [
                    [
                        'barang_id' => $this->barang->id,
                        'beban_akun_id' => $this->bebanKadaluarsa->id,
                        'arah' => 'kurang',
                        'jumlah' => 2,
                    ],
                    [
                        'barang_id' => $this->barang->id,
                        'beban_akun_id' => $this->bebanSelisihStok->id,
                        'arah' => 'tambah',
                        'jumlah' => 3,
                    ],
                ],
            ])
            ->assertCreated();

        $opname = StokOpname::first();
        $detail = $opname->details()->first();
        $this->assertSame(1.0, (float) $detail->selisih);
        $this->assertSame(10000.0, (float) $detail->nilai_selisih);
        $this->assertSame(2, $detail->bebans()->count());
        $this->assertSame(11.0, (float) $this->barang->fresh()->stok);

        $jurnal = Jurnal::where('journalable_type', $opname->getMorphClass())
            ->where('journalable_id', $opname->id)
            ->firstOrFail();
        $this->assertSame(
            (float) $jurnal->details()->sum('debit'),
            (float) $jurnal->details()->sum('kredit'),
        );

        $stokId = Akun::system('stok')->id;
        $linesStok = $jurnal->details->where('akun_id', $stokId);
        $this->assertSame(30000.0, (float) $linesStok->sum('debit'));
        $this->assertSame(20000.0, (float) $linesStok->sum('kredit'));
    }

    public function test_opname_selisih_kurang_tanpa_beban_akun_id_ditolak(): void
    {
        $this->actingAsApi($this->user)
            ->postJson('/api/stok-opname', [
                'tanggal' => '2026-08-20',
                'items' => [
                    [
                        'barang_id' => $this->barang->id,
                        'arah' => 'kurang',
                        'jumlah' => 2,
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.beban_akun_id']);
    }

    public function test_daftar_dan_detail_opname(): void
    {
        $supplier = $this->buatClient('Supplier A', 'supplier');

        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $this->barang->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/stok-opname', [
                'tanggal' => '2026-08-20',
                'keterangan' => 'Opname bulanan',
                'items' => [
                    [
                        'barang_id' => $this->barang->id,
                        'beban_akun_id' => $this->bebanKadaluarsa->id,
                        'arah' => 'kurang',
                        'jumlah' => 2,
                    ],
                ],
            ])
            ->assertCreated();

        $opname = StokOpname::first();

        $this->actingAsApi($this->user)
            ->getJson('/api/stok-opname')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.no_opname', $opname->no_opname)
            ->assertJsonPath('data.0.selisih', -20000)
            ->assertJsonPath('data.0.jumlah_barang', 1)
            ->assertJsonPath('total_nilai_selisih', fn ($value) => $value == -20000);

        $this->actingAsApi($this->user)
            ->getJson('/api/stok-opname/'.$opname->id)
            ->assertOk()
            ->assertJsonPath('opname.no_opname', $opname->no_opname)
            ->assertJsonCount(1, 'details')
            ->assertJsonPath('details.0.selisih', -2)
            ->assertJsonPath('details.0.nilai_selisih', -20000);
    }

    public function test_opname_dua_baris_beban_berbeda_untuk_satu_barang(): void
    {
        $bebes = Akun::where('nama', 'Beban Telur Bentes')->firstOrFail();
        $kotor = Akun::where('nama', 'Beban Telur Kotor')->firstOrFail();
        $telur = $this->buatBarang('BRG-T1', 'Telur Bebek', 'Telur Bebek', 'telur');

        $supplier = $this->buatClient('Supplier A', 'supplier');
        $this->simpanTransaksi($this->user, 'pembelian', $supplier, [
            ['barang_id' => $telur->id, 'kuantitas' => 10, 'harga' => 10000],
        ]);

        $this->actingAsApi($this->user)
            ->postJson('/api/stok-opname', [
                'tanggal' => '2026-08-20',
                'items' => [
                    [
                        'barang_id' => $telur->id,
                        'beban_akun_id' => $bebes->id,
                        'arah' => 'kurang',
                        'jumlah' => 2,
                    ],
                    [
                        'barang_id' => $telur->id,
                        'beban_akun_id' => $kotor->id,
                        'arah' => 'kurang',
                        'jumlah' => 3,
                    ],
                ],
            ])
            ->assertCreated();

        $opname = StokOpname::first();
        $detail = $opname->details()->with('bebans')->first();
        $this->assertSame(-5.0, (float) $detail->selisih);
        $this->assertSame(-50000.0, (float) $detail->nilai_selisih);
        $this->assertSame(2, $detail->bebans->count());

        $this->assertSame(5.0, (float) $telur->fresh()->stok);

        $jurnal = Jurnal::where('journalable_type', $opname->getMorphClass())
            ->where('journalable_id', $opname->id)
            ->firstOrFail();
        $detailBebes = $jurnal->details->firstWhere('akun_id', $bebes->id);
        $detailKotor = $jurnal->details->firstWhere('akun_id', $kotor->id);
        $linesStok = $jurnal->details->where('akun_id', Akun::system('stok')->id);

        $this->assertSame(20000.0, (float) $detailBebes->debit);
        $this->assertSame(30000.0, (float) $detailKotor->debit);
        $this->assertSame(50000.0, (float) $linesStok->sum('kredit'));
    }
}
