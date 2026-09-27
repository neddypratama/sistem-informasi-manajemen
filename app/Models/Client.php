<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = [
        'nama',
        'alamat',
        'no_telepon',
        'tipe',
        'keterangan',
        'status',
    ];

    /**
     * Get the transaksis for this client.
     *
     * @return HasMany<Transaksi, $this>
     */
    public function transaksis(): HasMany
    {
        return $this->hasMany(Transaksi::class);
    }
}
