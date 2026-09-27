<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StokOpname extends Model
{
    protected $fillable = [
        'no_opname',
        'tanggal',
        'keterangan',
        'status',
        'created_by',
        'jurnal_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'status' => 'string',
        ];
    }

    /**
     * Get the user who created this stok opname.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the jurnal created for this stok opname (if any).
     *
     * @return BelongsTo<Jurnal, $this>
     */
    public function jurnal(): BelongsTo
    {
        return $this->belongsTo(Jurnal::class);
    }

    /**
     * Get the details for this stok opname.
     *
     * @return HasMany<StokOpnameDetail, $this>
     */
    public function details(): HasMany
    {
        return $this->hasMany(StokOpnameDetail::class);
    }

    public function isSelesai(): bool
    {
        return $this->status === 'selesai';
    }
}
