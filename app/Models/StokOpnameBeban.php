<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StokOpnameBeban extends Model
{
    protected $fillable = [
        'stok_opname_detail_id',
        'akun_beban_id',
        'arah',
        'jumlah',
        'nilai',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'jumlah' => 'decimal:2',
            'nilai' => 'decimal:2',
        ];
    }

    /**
     * Get the stok opname detail that owns this beban.
     *
     * @return BelongsTo<StokOpnameDetail, $this>
     */
    public function detail(): BelongsTo
    {
        return $this->belongsTo(StokOpnameDetail::class, 'stok_opname_detail_id');
    }

    /**
     * Get the beban akun for this beban line.
     *
     * @return BelongsTo<Akun, $this>
     */
    public function akunBeban(): BelongsTo
    {
        return $this->belongsTo(Akun::class, 'akun_beban_id');
    }
}
