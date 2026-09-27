<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * Autentikasi user untuk request ke route `auth:sanctum`.
     *
     * Mengembalikan `$this` agar bisa dirangkai: `$this->actingAsApi($user)->postJson(...)`.
     * `Sanctum::actingAs()` sendiri mengembalikan User, bukan test case, sehingga
     * tidak bisa dirangkai langsung.
     *
     * @param  array<int, string>  $abilities
     */
    protected function actingAsApi(User $user, array $abilities = ['*']): static
    {
        Sanctum::actingAs($user, $abilities);

        return $this;
    }
}
