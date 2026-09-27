<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Transaksi extends Model
{
    protected $fillable = [
        'nomor_transaksi',
        'tanggal',
        'tipe_transaksi',
        'metode_pembayaran',
        'client_id',
        'retur_dari_id',
        'total',
        'keterangan',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'total' => 'decimal:2',
        ];
    }

    /**
     * Get the client for this transaksi.
     *
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the user who created this transaksi.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the detail transaksis for this transaksi.
     *
     * @return HasMany<DetailTransaksi, $this>
     */
    public function detailTransaksis(): HasMany
    {
        return $this->hasMany(DetailTransaksi::class);
    }

    /**
     * Get the jurnals generated from this transaksi.
     *
     * @return MorphMany<Jurnal, $this>
     */
    public function jurnals(): MorphMany
    {
        return $this->morphMany(Jurnal::class, 'journalable');
    }

    public function isPembelian(): bool
    {
        return $this->tipe_transaksi === 'pembelian';
    }

    public function isPenjualan(): bool
    {
        return $this->tipe_transaksi === 'penjualan';
    }

    public function isTunai(): bool
    {
        return $this->metode_pembayaran === 'tunai';
    }

    public function isKredit(): bool
    {
        return $this->metode_pembayaran === 'kredit';
    }

    public function isPembelianRetur(): bool
    {
        return $this->tipe_transaksi === 'pembelian_retur';
    }

    public function isPenjualanRetur(): bool
    {
        return $this->tipe_transaksi === 'penjualan_retur';
    }

    public function isRetur(): bool
    {
        return $this->isPembelianRetur() || $this->isPenjualanRetur();
    }

    /**
     * Get the source transaksi that this retur was created from.
     *
     * @return BelongsTo<Transaksi, $this>
     */
    public function returDari(): BelongsTo
    {
        return $this->belongsTo(Transaksi::class, 'retur_dari_id');
    }

    /**
     * Get the retur transaksis that reference this transaksi as their source.
     *
     * @return HasMany<Transaksi, $this>
     */
    public function returs(): HasMany
    {
        return $this->hasMany(Transaksi::class, 'retur_dari_id');
    }

    public function hasRetur(): bool
    {
        return $this->returs()->exists();
    }
}
