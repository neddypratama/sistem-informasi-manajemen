<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PembayaranPiutang extends Model
{
    protected $fillable = [
        'piutang_id',
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
     * Get the piutang being collected.
     *
     * @return BelongsTo<Piutang, $this>
     */
    public function piutang(): BelongsTo
    {
        return $this->belongsTo(Piutang::class);
    }

    /**
     * Get the user who recorded this receipt.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the jurnal that recorded this receipt.
     *
     * @return BelongsTo<Jurnal, $this>
     */
    public function jurnal(): BelongsTo
    {
        return $this->belongsTo(Jurnal::class);
    }

    /**
     * Get the akun pembayaran used for this receipt.
     *
     * @return BelongsTo<Akun, $this>
     */
    public function akunPembayaran(): BelongsTo
    {
        return $this->belongsTo(Akun::class, 'akun_pembayaran_id');
    }
}
