<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StokOpnameDetail extends Model
{
    protected $fillable = [
        'stok_opname_id',
        'barang_id',
        'stok_sistem',
        'stok_fisik',
        'selisih',
        'harga_satuan',
        'nilai_selisih',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'stok_sistem' => 'decimal:2',
            'stok_fisik' => 'decimal:2',
            'selisih' => 'decimal:2',
            'harga_satuan' => 'decimal:2',
            'nilai_selisih' => 'decimal:2',
        ];
    }

    /**
     * Get the stok opname for this detail.
     *
     * @return BelongsTo<StokOpname, $this>
     */
    public function stokOpname(): BelongsTo
    {
        return $this->belongsTo(StokOpname::class);
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
     * Get the beban breakdown lines for this detail (selisih kurang).
     *
     * @return HasMany<StokOpnameBeban, $this>
     */
    public function bebans(): HasMany
    {
        return $this->hasMany(StokOpnameBeban::class, 'stok_opname_detail_id');
    }
}
