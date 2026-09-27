<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DetailTransaksi extends Model
{
    protected $fillable = [
        'transaksi_id',
        'detail_sumber_id',
        'barang_id',
        'kuantitas',
        'harga',
        'subtotal',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'kuantitas' => 'decimal:2',
            'harga' => 'decimal:2',
            'subtotal' => 'decimal:2',
        ];
    }

    /**
     * Get the source detail for a retur detail line.
     *
     * @return BelongsTo<DetailTransaksi, $this>
     */
    public function detailSumber(): BelongsTo
    {
        return $this->belongsTo(self::class, 'detail_sumber_id');
    }

    /**
     * Get retur detail lines associated with this source detail.
     *
     * @return HasMany<DetailTransaksi, $this>
     */
    public function detailReturs(): HasMany
    {
        return $this->hasMany(self::class, 'detail_sumber_id');
    }

    /**
     * Get the transaksi for this detail.
     *
     * @return BelongsTo<Transaksi, $this>
     */
    public function transaksi(): BelongsTo
    {
        return $this->belongsTo(Transaksi::class);
    }

    /**
     * Get the barang for this detail.
     *
     * @return BelongsTo<Barang, $this>
     */
    public function barang(): BelongsTo
    {
        return $this->belongsTo(Barang::class);
    }

    /**
     * Get the stok batch created from this detail (pembelian).
     *
     * @return HasMany<StokBatch, $this>
     */
    public function stokBatch(): HasMany
    {
        return $this->hasMany(StokBatch::class, 'detail_transaksi_id');
    }

    /**
     * Get the stok batch usages for this detail (penjualan).
     *
     * @return HasMany<StokBatchUsage, $this>
     */
    public function stokBatchUsages(): HasMany
    {
        return $this->hasMany(StokBatchUsage::class, 'detail_transaksi_id');
    }
}
