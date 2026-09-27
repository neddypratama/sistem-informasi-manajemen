<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $fillable = ['name', 'description', 'status'];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions')
            ->withTimestamps();
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->name === 'SuperAdmin';
    }

    /**
     * Role admin yang boleh mencatat entri kas manual (dan melihat seluruh data).
     */
    public function isAdmin(): bool
    {
        return in_array($this->name, ['SuperAdmin', 'Admin'], true);
    }

    /**
     * Role yang boleh melihat seluruh data internal (transaksi, jurnal,
     * hutang/piutang, laporan, dll.), bukan hanya data miliknya sendiri.
     */
    public function bisaMelihatSemuaData(): bool
    {
        return in_array($this->name, ['SuperAdmin', 'Admin'], true);
    }

    public function hasPermission(string $permission): bool
    {
        return $this->isSuperAdmin()
            || $this->permissions()->where('permissions.name', $permission)->exists();
    }
}
