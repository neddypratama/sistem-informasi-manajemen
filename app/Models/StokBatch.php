<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StokBatch extends Model
{
    protected $fillable = [
        'barang_id',
        'detail_transaksi_id',
        'tanggal',
        'qty_masuk',
        'qty_sisa',
        'harga_beli',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'qty_masuk' => 'decimal:2',
            'qty_sisa' => 'decimal:2',
            'harga_beli' => 'decimal:2',
        ];
    }

    /**
     * Get the barang for this stok batch.
     *
     * @return BelongsTo<Barang, $this>
     */
    public function barang(): BelongsTo
    {
        return $this->belongsTo(Barang::class);
    }

    /**
     * Get the detail transaksi (pembelian) that created this batch.
     *
     * @return BelongsTo<DetailTransaksi, $this>
     */
    public function detailTransaksi(): BelongsTo
    {
        return $this->belongsTo(DetailTransaksi::class, 'detail_transaksi_id');
    }
}
