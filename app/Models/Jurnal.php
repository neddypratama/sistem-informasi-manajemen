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
        'entitas_type',
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
     * Get payments (child journals) linked to this invoice journal.
     *
     * @return HasMany<Jurnal, $this>
     */
    public function pembayarans(): HasMany
    {
        return $this->hasMany(Jurnal::class, 'journalable_id')->where('journalable_type', static::class);
    }

    public function totalEntitas(): float
    {
        $this->loadMissing('details.akun.kategori');

        if ($this->entitas_type === 'hutang') {
            return (float) $this->details
                ->filter(fn ($d) => $d->akun?->system_code === 'hutang' || $d->akun?->kategori?->jenis === 'liabilitas')
                ->sum('kredit');
        }

        if ($this->entitas_type === 'piutang') {
            return (float) $this->details
                ->filter(fn ($d) => $d->akun?->system_code === 'piutang' || $d->akun?->kategori?->jenis === 'aset')
                ->sum('debit');
        }

        return 0.0;
    }

    public function dibayarEntitas(): float
    {
        $this->loadMissing('pembayarans.details.akun.kategori');

        if ($this->entitas_type === 'hutang') {
            return (float) $this->pembayarans->sum(function ($pj) {
                return (float) $pj->details
                    ->filter(fn ($d) => $d->akun?->system_code === 'hutang' || $d->akun?->kategori?->jenis === 'liabilitas')
                    ->sum('debit');
            });
        }

        if ($this->entitas_type === 'piutang') {
            return (float) $this->pembayarans->sum(function ($pj) {
                return (float) $pj->details
                    ->filter(fn ($d) => $d->akun?->system_code === 'piutang' || $d->akun?->kategori?->jenis === 'aset')
                    ->sum('kredit');
            });
        }

        return 0.0;
    }

    public function returEntitas(): float
    {
        if (! $this->journalable_id || $this->journalable_type !== Transaksi::class) {
            return 0.0;
        }

        $returJurnals = Jurnal::whereHasMorph(
            'journalable',
            [Transaksi::class],
            fn ($q) => $q->where('retur_dari_id', $this->journalable_id)
        )->with('details.akun.kategori')->get();

        if ($this->entitas_type === 'hutang') {
            return (float) $returJurnals->sum(function ($rj) {
                return (float) $rj->details
                    ->filter(fn ($d) => $d->akun?->system_code === 'hutang' || $d->akun?->kategori?->jenis === 'liabilitas')
                    ->sum('debit');
            });
        }

        if ($this->entitas_type === 'piutang') {
            return (float) $returJurnals->sum(function ($rj) {
                return (float) $rj->details
                    ->filter(fn ($d) => $d->akun?->system_code === 'piutang' || $d->akun?->kategori?->jenis === 'aset')
                    ->sum('kredit');
            });
        }

        return 0.0;
    }

    public function sisaEntitas(): float
    {
        return max(0, round($this->totalEntitas() - $this->dibayarEntitas() - $this->returEntitas(), 2));
    }

    public function statusEntitas(): string
    {
        return $this->sisaEntitas() <= 0.001 ? 'lunas' : 'belum_lunas';
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
