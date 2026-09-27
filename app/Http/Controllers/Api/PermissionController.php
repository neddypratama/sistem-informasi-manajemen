<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PermissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $permissions = Permission::orderBy('id', 'desc')->paginate(10);

        return response()->json($permissions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:permissions,name'],
            'description' => ['nullable', 'string', 'max:255'],
        ], [
            'name.required' => 'Nama permission wajib diisi.',
            'name.unique' => 'Nama permission sudah ada.',
        ]);

        $permission = Permission::create($validated);

        LogAktivitasService::catat('permission', 'tambah', 'Menambah permission '.$permission->name, $permission->name);

        return response()->json($permission, 201);
    }

    public function update(Request $request, Permission $permission): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('permissions', 'name')->ignore($permission->id)],
            'description' => ['nullable', 'string', 'max:255'],
        ], [
            'name.required' => 'Nama permission wajib diisi.',
            'name.unique' => 'Nama permission sudah ada.',
        ]);

        $permission->update($validated);

        LogAktivitasService::catat('permission', 'ubah', 'Mengubah permission '.$permission->name, $permission->name);

        return response()->json($permission);
    }

    public function destroy(Permission $permission): JsonResponse
    {
        $systemPermissions = [
            'manage.access',
            'manage.master',
            'manage.transaksi',
            'view.transaksi',
            'view.stok',
            'manage.akuntansi',
            'view.akuntansi',
        ];

        if (in_array($permission->name, $systemPermissions, true)) {
            return response()->json(['message' => 'Permission bawaan sistem tidak dapat dihapus.'], 422);
        }

        $permission->roles()->detach();

        LogAktivitasService::catat('permission', 'hapus', 'Menghapus permission '.$permission->name, $permission->name);

        $permission->delete();

        return response()->json(['message' => 'Permission berhasil dihapus.']);
    }
}
