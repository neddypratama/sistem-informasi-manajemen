<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kategori extends Model
{
    protected $fillable = [
        'nama',
        'jenis',
        'keterangan',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'jenis' => 'string',
            'status' => 'string',
        ];
    }

    /**
     * Get the akuns in this kategori.
     *
     * @return HasMany<Akun, $this>
     */
    public function akuns(): HasMany
    {
        return $this->hasMany(Akun::class);
    }
}
