<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Piutang extends Model
{
    protected $fillable = [
        'no_piutang',
        'tanggal',
        'client_id',
        'total',
        'keterangan',
        'status',
        'created_by',
        'jurnal_id',
        'akun_pembayaran_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'total' => 'decimal:2',
            'status' => 'string',
            'akun_pembayaran_id' => 'integer',
        ];
    }

    /**
     * Get the client for this piutang.
     *
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the user who created this piutang.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the jurnal that recognised the piutang.
     *
     * @return BelongsTo<Jurnal, $this>
     */
    public function jurnal(): BelongsTo
    {
        return $this->belongsTo(Jurnal::class);
    }

    /**
     * Get the akun pembayaran used for this piutang.
     *
     * @return BelongsTo<Akun, $this>
     */
    public function akunPembayaran(): BelongsTo
    {
        return $this->belongsTo(Akun::class, 'akun_pembayaran_id');
    }

    /**
     * Get the pembayaran for this piutang.
     *
     * @return HasMany<PembayaranPiutang, $this>
     */
    public function pembayarans(): HasMany
    {
        return $this->hasMany(PembayaranPiutang::class);
    }

    public function sisa(): float
    {
        return (float) $this->total - (float) $this->pembayarans()->sum('jumlah');
    }

    public function isLunas(): bool
    {
        return $this->status === 'lunas';
    }

    public function setStatusFromSisa(): void
    {
        $this->status = $this->sisa() <= 0 ? 'lunas' : 'belum_lunas';
        $this->save();
    }
}
