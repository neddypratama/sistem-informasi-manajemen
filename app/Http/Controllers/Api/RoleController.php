<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RoleRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));
        $status = $request->query('status');

        [$sort, $order] = $this->sortParams(
            ['name', 'created_at'],
            'name',
            'asc',
        );

        $roles = Role::with('permissions')
            ->withCount('users')
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->when(
                is_string($status) && in_array($status, ['active', 'inactive'], true),
                fn ($query) => $query->where('status', $status),
            )
            ->orderBy($sort, $order)
            ->paginate(10);

        return response()->json($roles);
    }

    public function store(RoleRequest $request): JsonResponse
    {
        $role = Role::create($request->validated());
        $role->permissions()->sync($request->input('permissions', []));

        LogAktivitasService::catat('role', 'tambah', 'Menambah role '.$role->name, $role->name);

        return response()->json($role->load('permissions'), 201);
    }

    public function update(RoleRequest $request, Role $role): JsonResponse
    {
        $data = $request->validated();

        if ($role->name === 'SuperAdmin') {
            $data['name'] = 'SuperAdmin';
            $data['status'] = 'active';
        }

        $role->permissions()->sync($request->input('permissions', []));
        $role->update($data);

        LogAktivitasService::catat('role', 'ubah', 'Mengubah role '.$role->name, $role->name);

        return response()->json($role->load('permissions'));
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($role->name === 'SuperAdmin') {
            return response()->json(['message' => 'Role SuperAdmin tidak dapat dihapus.'], 422);
        }

        if ($role->users()->exists()) {
            return response()->json(['message' => 'Role tidak dapat dihapus karena masih digunakan oleh user.'], 422);
        }

        $role->permissions()->detach();

        LogAktivitasService::catat('role', 'hapus', 'Menghapus role '.$role->name, $role->name);

        $role->delete();

        return response()->json(['message' => 'Role berhasil dihapus.']);
    }

    /**
     * Daftar semua role aktif untuk opsi form user.
     */
    public function options(): JsonResponse
    {
        $roles = Role::where('status', 'active')->orderBy('name')->get();

        return response()->json($roles);
    }

    /**
     * Daftar semua permission untuk form role.
     */
    public function permissions(): JsonResponse
    {
        $permissions = Permission::orderBy('name')->get();

        return response()->json($permissions);
    }
}
