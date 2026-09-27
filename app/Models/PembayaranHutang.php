<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PembayaranHutang extends Model
{
    protected $fillable = [
        'hutang_id',
        'tanggal',
        'jumlah',
        'keterangan',
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
            'jumlah' => 'decimal:2',
            'akun_pembayaran_id' => 'integer',
        ];
    }

    /**
     * Get the hutang being paid.
     *
     * @return BelongsTo<Hutang, $this>
     */
    public function hutang(): BelongsTo
    {
        return $this->belongsTo(Hutang::class);
    }

    /**
     * Get the user who recorded this payment.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the jurnal that recorded this payment.
     *
     * @return BelongsTo<Jurnal, $this>
     */
    public function jurnal(): BelongsTo
    {
        return $this->belongsTo(Jurnal::class);
    }

    /**
     * Get the akun pembayaran used for this payment.
     *
     * @return BelongsTo<Akun, $this>
     */
    public function akunPembayaran(): BelongsTo
    {
        return $this->belongsTo(Akun::class, 'akun_pembayaran_id');
    }
}
