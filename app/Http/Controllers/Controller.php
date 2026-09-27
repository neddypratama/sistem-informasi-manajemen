<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

abstract class Controller
{
    /**
     * Kolom & arah sorting dari query string, dengan whitelist kolom.
     *
     * @param  array<int, string>  $allowed
     * @return array{0: string, 1: string}
     */
    protected function sortParams(array $allowed, string $default, string $defaultOrder = 'asc'): array
    {
        $sort = request()->query('sort');
        $order = request()->query('order', $defaultOrder);

        return [
            is_string($sort) && in_array($sort, $allowed, true) ? $sort : $default,
            is_string($order) && in_array(strtolower($order), ['asc', 'desc'], true) ? strtolower($order) : $defaultOrder,
        ];
    }

    /**
     * Pastikan record adalah milik user yang sedang login. User dengan role
     * yang boleh melihat semua data (SuperAdmin/Admin) tidak dibatasi.
     *
     * @throws NotFoundHttpException
     */
    protected function pastikanKepemilikan(?Model $model): void
    {
        if ($model === null || auth()->user()?->bisaMelihatSemuaData()) {
            return;
        }

        if ((int) $model->created_by !== (int) auth()->id()) {
            abort(404);
        }
    }

    /**
     * Tambahkan filter created_by ke query builder model bila user saat ini
     * tidak berhak melihat seluruh data.
     *
     * @param  Builder<Model>  $query
     * @return Builder<Model>
     */
    protected function scopeKepemilikan($query, string $column = 'created_by')
    {
        if (! auth()->user()?->bisaMelihatSemuaData()) {
            $query->where($column, auth()->id());
        }

        return $query;
    }
}
