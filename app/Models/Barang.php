<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Barang extends Model
{
    protected $fillable = [
        'jenis_barang_id',
        'kode_barang',
        'nama_barang',
        'satuan',
        'stok',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'stok' => 'decimal:2',
        ];
    }

    /**
     * Get the jenis barang for this barang.
     *
     * @return BelongsTo<JenisBarang, $this>
     */
    public function jenisBarang(): BelongsTo
    {
        return $this->belongsTo(JenisBarang::class, 'jenis_barang_id');
    }

    /**
     * Get the detail transaksis for this barang.
     *
     * @return HasMany<DetailTransaksi, $this>
     */
    public function detailTransaksis(): HasMany
    {
        return $this->hasMany(DetailTransaksi::class);
    }

    /**
     * Get the stok batches for this barang.
     *
     * @return HasMany<StokBatch, $this>
     */
    public function stokBatches(): HasMany
    {
        return $this->hasMany(StokBatch::class);
    }

    /**
     * Get the remaining fifo batches ordered by date then id.
     *
     * @return HasMany<StokBatch, $this>
     */
    public function stokBatchTersisa(): HasMany
    {
        return $this->hasMany(StokBatch::class)
            ->where('qty_sisa', '>', 0)
            ->orderBy('tanggal')
            ->orderBy('id');
    }

    /**
     * Get the stok opname details for this barang.
     *
     * @return HasMany<StokOpnameDetail, $this>
     */
    public function stokOpnameDetails(): HasMany
    {
        return $this->hasMany(StokOpnameDetail::class);
    }
}
