<?php

namespace App\Services;

use App\Models\Barang;
use App\Models\DetailTransaksi;
use App\Models\StokBatch;
use App\Models\StokBatchUsage;
use App\Models\Transaksi;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class FifoStockService
{
    /**
     * Menambahkan stok dan membuat batch baru untuk transaksi pembelian.
     */
    public function addStockFromPurchase(DetailTransaksi $detail): StokBatch
    {
        $batch = StokBatch::create([
            'barang_id' => $detail->barang_id,
            'detail_transaksi_id' => $detail->id,
            'tanggal' => $detail->transaksi->tanggal,
            'qty_masuk' => $detail->kuantitas,
            'qty_sisa' => $detail->kuantitas,
            'harga_beli' => $detail->harga,
        ]);

        $this->incrementStok($detail->barang_id, $detail->kuantitas);

        return $batch;
    }

    /**
     * Mengurangi stok menggunakan metode FIFO dan menghasilkan batch usages.
     * Mengembalikan total HPP dari seluruh batch yang digunakan.
     */
    public function reduceStockForSale(DetailTransaksi $detail): float
    {
        $sisa = $detail->kuantitas;

        $batches = $this->getFifoBatches($detail->barang_id);

        $totalHpp = 0;
        $usages = [];

        foreach ($batches as $batch) {
            if ($sisa <= 0) {
                break;
            }

            /** @var StokBatch $batch */
            $ambil = min($batch->qty_sisa, $sisa);

            $subtotal = $ambil * $batch->harga_beli;

            $usages[] = [
                'detail_transaksi_id' => $detail->id,
                'stok_batch_id' => $batch->id,
                'qty' => $ambil,
                'harga' => $batch->harga_beli,
                'subtotal' => $subtotal,
            ];

            $batch->qty_sisa -= $ambil;
            $batch->save();

            $totalHpp += $subtotal;
            $sisa -= $ambil;
        }

        if ($sisa > 0) {
            throw new RuntimeException('Stok barang tidak mencukupi.');
        }

        foreach ($usages as $usage) {
            StokBatchUsage::create($usage);
        }

        $this->decrementStok($detail->barang_id, $detail->kuantitas);

        return $totalHpp;
    }

    /**
     * Mengambil batch FIFO yang masih memiliki sisa stok,
     * diurutkan berdasarkan tanggal masuk paling awal, lalu id terkecil.
     *
     * @return Collection<int, StokBatch>
     */
    public function getFifoBatches(int $barangId)
    {
        return StokBatch::where('barang_id', $barangId)
            ->where('qty_sisa', '>', 0)
            ->orderBy('tanggal')
            ->orderBy('id')
            ->get();
    }

    /**
     * Menghitung total HPP dari usage pada suatu detail penjualan.
     */
    public function calculateHpp(DetailTransaksi $detail): float
    {
        return (float) $detail->stokBatchUsages()->sum('subtotal');
    }

    /**
     * Mengembalikan stok ke batch saat pembelian dibatalkan.
     */
    public function restoreStockFromPurchase(DetailTransaksi $detail): void
    {
        StokBatch::where('detail_transaksi_id', $detail->id)->delete();
        $this->decrementStok($detail->barang_id, $detail->kuantitas);
    }

    /**
     * Mengembalikan stok dan qty_sisa batch saat penjualan dibatalkan.
     */
    public function restoreStockFromSale(DetailTransaksi $detail): void
    {
        $usages = StokBatchUsage::where('detail_transaksi_id', $detail->id)->get();

        foreach ($usages as $usage) {
            /** @var StokBatch */
            $batch = StokBatch::find($usage->stok_batch_id);

            if ($batch) {
                $batch->qty_sisa += $usage->qty;
                $batch->save();
            }
        }

        StokBatchUsage::where('detail_transaksi_id', $detail->id)->delete();
        $this->incrementStok($detail->barang_id, $detail->kuantitas);
    }

    /**
     * Menambahkan stok barang dengan penguncian baris agar aman dari race condition.
     */
    public function incrementStok(int $barangId, float $qty): void
    {
        DB::table('barangs')
            ->where('id', $barangId)
            ->increment('stok', $qty);
    }

    /**
     * Mengurangi stok barang, pastikan tidak menjadi negatif.
     */
    public function decrementStok(int $barangId, float $qty): void
    {
        $affected = DB::table('barangs')
            ->where('id', $barangId)
            ->where('stok', '>=', $qty)
            ->decrement('stok', $qty);

        if ($affected === 0) {
            throw new RuntimeException('Stok barang tidak mencukupi.');
        }
    }

    /**
     * Menghitung kuantitas dari suatu baris detail sumber yang sudah pernah diretur.
     */
    public function qtySudahDiretur(int $sourceDetailId, ?int $exceptReturDetailId = null): float
    {
        return (float) DetailTransaksi::where('detail_sumber_id', $sourceDetailId)
            ->when($exceptReturDetailId, fn ($q) => $q->where('id', '!=', $exceptReturDetailId))
            ->sum('kuantitas');
    }

    /**
     * Mengecek sisa qty yang masih bisa diretur untuk satu baris detail pembelian.
     */
    public function sisaStokPembelianBisaDireturPerLine(DetailTransaksi $sourceDetail): float
    {
        return (float) StokBatch::where('detail_transaksi_id', $sourceDetail->id)->sum('qty_sisa');
    }

    /**
     * Mengecek sisa qty yang masih bisa diretur untuk satu baris detail penjualan.
     */
    public function qtyTerjualBisaDireturPerLine(DetailTransaksi $sourceDetail): float
    {
        $soldQty = (float) StokBatchUsage::where('detail_transaksi_id', $sourceDetail->id)->sum('qty');
        $alreadyReturned = $this->qtySudahDiretur($sourceDetail->id);

        return max(0.0, $soldQty - $alreadyReturned);
    }

    /**
     * Mengecek qty yang masih bisa diretur dari pembelian sumber untuk barang (agregat fallback).
     *
     * @return float total sisa stok yang belum terjual dari pembelian sumber
     */
    public function sisaStokPembelianBisaDiretur(int $barangId, int $sumberTransaksiId): float
    {
        $detailIds = DetailTransaksi::where('transaksi_id', $sumberTransaksiId)
            ->where('barang_id', $barangId)
            ->pluck('id');

        return (float) StokBatch::whereIn('detail_transaksi_id', $detailIds)->sum('qty_sisa');
    }

    /**
     * Mengecek qty yang sudah terjual (bisa diretur balik) dari penjualan sumber (agregat fallback).
     *
     * @return float total qty terjual dari penjualan sumber
     */
    public function qtyTerjualBisaDiretur(int $barangId, int $sumberTransaksiId): float
    {
        $detailIds = DetailTransaksi::where('transaksi_id', $sumberTransaksiId)
            ->where('barang_id', $barangId)
            ->pluck('id');

        return (float) StokBatchUsage::whereIn('detail_transaksi_id', $detailIds)->sum('qty');
    }

    /**
     * Mengurangi stok dan sisa batch saat barang diretur ke supplier
     * (retur pembelian). Qty dikurangi dari batch pembelian sumber yang belum terjual.
     */
    public function reduceStockForPurchaseReturn(DetailTransaksi $detail): void
    {
        $sumber = Transaksi::findOrFail($detail->transaksi->retur_dari_id);

        if ($detail->detail_sumber_id) {
            $detailIds = collect([$detail->detail_sumber_id]);
        } else {
            $detailIds = $sumber->detailTransaksis()
                ->where('barang_id', $detail->barang_id)
                ->pluck('id');
        }

        $batches = StokBatch::whereIn('detail_transaksi_id', $detailIds)
            ->where('qty_sisa', '>', 0)
            ->orderBy('tanggal')
            ->orderBy('id')
            ->get();

        $sisa = $detail->kuantitas;

        foreach ($batches as $batch) {
            if ($sisa <= 0) {
                break;
            }

            /** @var StokBatch $batch */
            $ambil = min($batch->qty_sisa, $sisa);

            $batch->qty_sisa -= $ambil;
            $batch->save();

            $sisa -= $ambil;
        }

        if ($sisa > 0) {
            throw new RuntimeException('Qty retur melebihi sisa stok yang belum terjual.');
        }

        $this->decrementStok($detail->barang_id, $detail->kuantitas);
    }

    /**
     * Membatalkan efek retur pembelian: kembalikan sisa batch ke kondisi semula
     * dan tambahkan kembali stok barang.
     */
    public function restoreStockFromPurchaseReturn(DetailTransaksi $detail): void
    {
        $sumber = Transaksi::findOrFail($detail->transaksi->retur_dari_id);

        if ($detail->detail_sumber_id) {
            $detailIds = collect([$detail->detail_sumber_id]);
        } else {
            $detailIds = $sumber->detailTransaksis()
                ->where('barang_id', $detail->barang_id)
                ->pluck('id');
        }

        $batches = StokBatch::whereIn('detail_transaksi_id', $detailIds)
            ->orderBy('tanggal')
            ->orderBy('id')
            ->get();

        $sisa = $detail->kuantitas;

        foreach ($batches as $batch) {
            if ($sisa <= 0) {
                break;
            }

            /** @var StokBatch $batch */
            if ((float) $batch->qty_masuk - (float) $batch->qty_sisa < $sisa) {
                break;
            }

            $ambil = min((float) $batch->qty_masuk - (float) $batch->qty_sisa, $sisa);

            $batch->qty_sisa += $ambil;
            $batch->save();

            $sisa -= $ambil;
        }

        if ($sisa > 0) {
            throw new RuntimeException('Gagal mengembalikan stok retur pembelian.');
        }

        $this->incrementStok($detail->barang_id, $detail->kuantitas);
    }

    /**
     * Menambah stok dan mengembalikan qty ke batch yang dipakai penjualan sumber
     * saat barang diretur oleh customer (retur penjualan).
     */
    public function addStockForSalesReturn(DetailTransaksi $detail): void
    {
        $sumber = Transaksi::findOrFail($detail->transaksi->retur_dari_id);

        if ($detail->detail_sumber_id) {
            $detailIds = collect([$detail->detail_sumber_id]);

            $soldQty = (float) StokBatchUsage::where('detail_transaksi_id', $detail->detail_sumber_id)->sum('qty');
            $alreadyReturned = $this->qtySudahDiretur($detail->detail_sumber_id, $detail->id);
            $available = max(0.0, $soldQty - $alreadyReturned);

            if ($detail->kuantitas > $available + 0.0001) {
                throw new RuntimeException('Qty retur melebihi jumlah barang yang terjual.');
            }
        } else {
            $detailIds = $sumber->detailTransaksis()
                ->where('barang_id', $detail->barang_id)
                ->pluck('id');
        }

        $usages = StokBatchUsage::whereIn('detail_transaksi_id', $detailIds)
            ->orderBy('id')
            ->get();

        $sisa = $detail->kuantitas;

        foreach ($usages as $usage) {
            if ($sisa <= 0) {
                break;
            }

            /** @var StokBatch|null $batch */
            $batch = StokBatch::find($usage->stok_batch_id);

            if ($batch === null) {
                continue;
            }

            $ambil = min($usage->qty, $sisa);

            $batch->qty_sisa += $ambil;
            $batch->save();

            $sisa -= $ambil;
        }

        if ($sisa > 0) {
            throw new RuntimeException('Qty retur melebihi jumlah barang yang terjual.');
        }

        $this->incrementStok($detail->barang_id, $detail->kuantitas);
    }

    /**
     * Membatalkan efek retur penjualan: kembalikan qty batch dan stok ke kondisi
     * sebelum retur dibuat.
     */
    public function restoreStockFromSalesReturn(DetailTransaksi $detail): void
    {
        $this->decrementStok($detail->barang_id, $detail->kuantitas);

        $sumber = Transaksi::findOrFail($detail->transaksi->retur_dari_id);

        if ($detail->detail_sumber_id) {
            $detailIds = collect([$detail->detail_sumber_id]);
        } else {
            $detailIds = $sumber->detailTransaksis()
                ->where('barang_id', $detail->barang_id)
                ->pluck('id');
        }

        $usages = StokBatchUsage::whereIn('detail_transaksi_id', $detailIds)
            ->orderBy('id')
            ->get();

        $sisa = $detail->kuantitas;

        foreach ($usages as $usage) {
            if ($sisa <= 0) {
                break;
            }

            /** @var StokBatch|null $batch */
            $batch = StokBatch::find($usage->stok_batch_id);

            if ($batch === null) {
                continue;
            }

            $ambil = min($usage->qty, $sisa);

            $batch->qty_sisa -= $ambil;
            $batch->save();

            $sisa -= $ambil;
        }

        if ($sisa > 0) {
            throw new RuntimeException('Gagal mengembalikan stok retur penjualan.');
        }
    }

    /**
     * Menghitung HPP dari qty yang diretur balik pada retur penjualan,
     * berdasarkan batch yang dipakai penjualan sumber.
     */
    public function hppSalesReturn(DetailTransaksi $detail): float
    {
        $sumber = Transaksi::findOrFail($detail->transaksi->retur_dari_id);

        if ($detail->detail_sumber_id) {
            $detailIds = collect([$detail->detail_sumber_id]);
        } else {
            $detailIds = $sumber->detailTransaksis()
                ->where('barang_id', $detail->barang_id)
                ->pluck('id');
        }

        $usages = StokBatchUsage::whereIn('detail_transaksi_id', $detailIds)
            ->orderBy('id')
            ->get();

        $sisa = $detail->kuantitas;
        $total = 0.0;

        foreach ($usages as $usage) {
            if ($sisa <= 0) {
                break;
            }

            $ambil = min($usage->qty, $sisa);

            $total += $ambil * $usage->harga;
            $sisa -= $ambil;
        }

        return $total;
    }
}
