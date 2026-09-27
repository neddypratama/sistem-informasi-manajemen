<?php

namespace App\Models;

use Database\Factories\LogAktivitasFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LogAktivitas extends Model
{
    /** @use HasFactory<LogAktivitasFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $table = 'log_aktivitases';

    protected $fillable = [
        'user_id',
        'modul',
        'aksi',
        'deskripsi',
        'referensi',
        'created_at',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
