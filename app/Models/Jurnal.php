<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Jurnal extends Model
{
    protected $fillable = [
        'nomor_jurnal',
        'tanggal',
        'kategori_id',
        'client_id',
        'keterangan',
        'created_by',
        'journalable_type',
        'journalable_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
        ];
    }

    /**
     * Get the jurnal details for this jurnal.
     *
     * @return HasMany<JurnalDetail, $this>
     */
    public function details(): HasMany
    {
        return $this->hasMany(JurnalDetail::class);
    }

    /**
     * Get the user who created this jurnal.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the client associated with this jurnal.
     *
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the parent model (transaksi) that generated this jurnal, if any.
     *
     * @return MorphTo<Model, $this>
     */
    public function journalable(): MorphTo
    {
        return $this->morphTo();
    }
}
