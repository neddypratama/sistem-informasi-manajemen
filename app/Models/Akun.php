<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Akun extends Model
{
    protected $fillable = [
        'kode',
        'nama',
        'kategori_id',
        'saldo_normal',
        'system_code',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'saldo_normal' => 'string',
            'system_code' => 'string',
            'status' => 'string',
        ];
    }

    public static function system(string $code): ?self
    {
        return static::query()->where('system_code', $code)->where('status', 'aktif')->first();
    }

    /**
     * Akun kas dan bank aktif (kategori Aset Kas/Bank atau system_code kas).
     */
    public function scopeKasBank(Builder $query): Builder
    {
        return $query
            ->where('status', 'aktif')
            ->where(function ($q): void {
                $q->where('system_code', 'kas')
                    ->orWhereHas('kategori', fn ($k) => $k->whereIn('nama', ['Kas', 'Bank BCA', 'Bank BRI', 'Bank BNI']));
            });
    }

    public function adalahKasBank(): bool
    {
        $kategoriNama = $this->kategori?->nama;

        return $this->kategori?->jenis === 'aset'
            && ($this->system_code === 'kas' || in_array($kategoriNama, ['Kas', 'Bank BCA', 'Bank BRI', 'Bank BNI'], true));
    }

    /**
     * Get the kategori for this akun.
     *
     * @return BelongsTo<Kategori, $this>
     */
    public function kategori(): BelongsTo
    {
        return $this->belongsTo(Kategori::class);
    }

    /**
     * Get the jurnal details for this akun.
     *
     * @return HasMany<JurnalDetail, $this>
     */
    public function jurnalDetails(): HasMany
    {
        return $this->hasMany(JurnalDetail::class);
    }

    public function isAktif(): bool
    {
        return $this->status === 'aktif';
    }
}
