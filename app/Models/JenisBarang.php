<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JenisBarang extends Model
{
    protected $table = 'jenis_barang';

    protected $fillable = [
        'nama',
        'kelompok',
        'keterangan',
        'status',
    ];

    /**
     * Get the barangs that belong to this jenis.
     *
     * @return HasMany<Barang, $this>
     */
    public function barangs(): HasMany
    {
        return $this->hasMany(Barang::class, 'jenis_barang_id');
    }
}
