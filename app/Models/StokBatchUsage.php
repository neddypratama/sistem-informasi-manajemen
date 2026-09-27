<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StokBatchUsage extends Model
{
    protected $fillable = [
        'detail_transaksi_id',
        'stok_batch_id',
        'qty',
        'harga',
        'subtotal',
    ];

    /**
     * Get the detail transaksi (penjualan) for this usage.
     *
     * @return BelongsTo<DetailTransaksi, $this>
     */
    public function detailTransaksi(): BelongsTo
    {
        return $this->belongsTo(DetailTransaksi::class, 'detail_transaksi_id');
    }

    /**
     * Get the stok batch used for this usage.
     *
     * @return BelongsTo<StokBatch, $this>
     */
    public function stokBatch(): BelongsTo
    {
        return $this->belongsTo(StokBatch::class);
    }
}
