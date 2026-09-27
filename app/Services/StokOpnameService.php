<?php

namespace App\Services;

use App\Models\Akun;
use App\Models\Barang;
use App\Models\StokBatch;
use App\Models\StokOpname;
use App\Models\StokOpnameDetail;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StokOpnameService
{
    public function __construct(
        private FifoStockService $fifoStockService,
    ) {}

    /**
     * Membuat & menyelesaikan stok opname beserta detail dan jurnal selisihnya.
     *
     * @param  array<int, array{barang_id: int, beban_akun_id: int, arah: string, jumlah: float}>  $items
     */
    public function simpanOpname(
        string $tanggal,
        array $items,
        ?string $keterangan,
        int $createdBy,
    ): StokOpname {
        $opname = StokOpname::create([
            'no_opname' => $this->generateNomor($tanggal),
            'tanggal' => $tanggal,
            'keterangan' => $keterangan,
            'status' => 'selesai',
            'created_by' => $createdBy,
        ]);

        $grouped = collect($items)->groupBy('barang_id');

        foreach ($grouped as $barangId => $rows) {
            $barang = Barang::findOrFail($barangId);
            $stokSistem = (float) $barang->stok;

            $totalTambah = (float) $rows->where('arah', 'tambah')->sum('jumlah');
            $totalKurang = (float) $rows->where('arah', 'kurang')->sum('jumlah');
            $selisih = $totalTambah - $totalKurang;

            if (abs($selisih) < 0.005) {
                continue;
            }

            $stokFisik = round($stokSistem + $selisih, 4);
            $hargaSatuan = $this->hargaSatuanRataRata($barang->id);
            $nilaiSelisih = round($selisih * $hargaSatuan, 2);

            $detail = StokOpnameDetail::create([
                'stok_opname_id' => $opname->id,
                'barang_id' => $barang->id,
                'stok_sistem' => $stokSistem,
                'stok_fisik' => $stokFisik,
                'selisih' => $selisih,
                'harga_satuan' => $hargaSatuan,
                'nilai_selisih' => $nilaiSelisih,
            ]);

            foreach ($rows as $row) {
                if (empty($row['beban_akun_id'])) {
                    continue;
                }

                $akun = Akun::findOrFail($row['beban_akun_id']);
                $jumlah = (float) $row['jumlah'];
                $harga = (float) $detail->harga_satuan;

                $detail->bebans()->create([
                    'akun_beban_id' => $akun->id,
                    'arah' => $row['arah'],
                    'jumlah' => round($jumlah, 2),
                    'nilai' => round(round($jumlah, 2) * $harga, 2),
                ]);
            }

            if ($selisih > 0) {
                $this->tambahStok($barang, $selisih);
            } else {
                $this->kurangiStok($barang, abs($selisih));
            }

            unset($detail);
        }

        return $opname;
    }

    /**
     * Memeriksa apakah akun termasuk salah satu jenis beban telur.
     */
    protected function adalahBebanTelur(Akun $akun): bool
    {
        return in_array($akun->nama, [
            'Beban Telur Kotor',
            'Beban Telur Bentes',
            'Beban Telur Ceplok',
            'Beban Telur Prok',
            'Beban Telur Jumbo',
        ], true);
    }

    protected function cariBeban(string $nama): ?Akun
    {
        return Akun::where('nama', $nama)->where('status', 'aktif')->first();
    }

    /**
     * Menyiapkan kumpulan detail dari input, mengambil stok sistem terkini.
     *
     * @param  array<int, array{barang_id: int, stok_fisik: float, beban?: array<int, array{akun_beban_id: int, jumlah: float}>}>  $items
     * @return Collection<int, array{barang_id: int, stok_fisik: float, beban?: array<int, array{akun_beban_id: int, jumlah: float}>}>
     */
    protected function siapkanDetail(array $items): Collection
    {
        return collect($items)
            ->filter(fn ($row) => (float) ($row['stok_fisik'] ?? 0) >= 0)
            ->keyBy('barang_id')
            ->values();
    }

    /**
     * Harga satuan rata-rata tertimbang dari batch FIFO yang tersisa. Mengembalikan
     * 0 jika tidak ada batch tersisa (nilai selisih menjadi 0, tidak ada jurnal).
     */
    public function hargaSatuanRataRata(int $barangId): float
    {
        $batches = StokBatch::where('barang_id', $barangId)
            ->where('qty_sisa', '>', 0)
            ->get();

        $totalQty = (float) $batches->sum('qty_sisa');

        if ($totalQty <= 0) {
            return 0.0;
        }

        $totalNilai = (float) $batches->sum(fn ($b) => (float) $b->qty_sisa * (float) $b->harga_beli);

        return round($totalNilai / $totalQty, 2);
    }

    /**
     * Menambah stok: naikkan jumlah barang untuk selisih lebih hasil opname.
     * Selisih lebih bukan pembelian, jadi tidak membuat batch FIFO baru.
     */
    protected function tambahStok(Barang $barang, float $selisih): void
    {
        $this->fifoStockService->incrementStok($barang->id, $selisih);
    }

    /**
     * Mengurangi stok: kuras batch FIFO terlama terlebih dahulu, lalu turunkan
     * jumlah stok barang sesuai selisih. Batch yang tersisa cukup untuk semua
     * selisih karena fisik tidak pernah melebihi stok sistem.
     */
    protected function kurangiStok(Barang $barang, float $selisih): void
    {
        DB::transaction(function () use ($barang, $selisih): void {
            $sisa = $selisih;
            $batches = $this->fifoStockService->getFifoBatches($barang->id);

            foreach ($batches as $batch) {
                if ($sisa <= 0) {
                    break;
                }

                /** @var StokBatch $batch */
                $ambil = min((float) $batch->qty_sisa, $sisa);

                $batch->qty_sisa -= $ambil;
                $batch->save();

                $sisa -= $ambil;
            }

            $this->fifoStockService->decrementStok($barang->id, $selisih);
        });
    }

    protected function generateNomor(string $tanggal): string
    {
        $datePart = str_replace('-', '', $tanggal);

        $last = StokOpname::where('no_opname', 'like', "SO-{$datePart}-%")
            ->orderByDesc('id')
            ->value('no_opname');

        $sequence = $last ? (int) substr($last, -4) + 1 : 1;

        return sprintf('SO-%s-%04d', $datePart, $sequence);
    }
}
