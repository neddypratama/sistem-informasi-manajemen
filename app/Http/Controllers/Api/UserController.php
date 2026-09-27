<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Models\User;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));
        $roleId = $request->query('role_id');
        $status = $request->query('status');

        [$sort, $order] = $this->sortParams(
            ['name', 'username', 'email', 'created_at'],
            'name',
            'asc',
        );

        $users = User::with('role')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($roleId, fn ($query) => $query->where('role_id', $roleId))
            ->when(
                is_string($status) && in_array($status, ['active', 'inactive'], true),
                fn ($query) => $query->where('status', $status),
            )
            ->orderBy($sort, $order)
            ->paginate(10);

        return response()->json($users);
    }

    public function store(UserRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->input('name'),
            'username' => $request->input('username'),
            'email' => $request->input('email'),
            'password' => Hash::make($request->input('password')),
            'role_id' => $request->input('role_id'),
            'status' => $request->input('status'),
        ]);

        LogAktivitasService::catat('user', 'tambah', 'Menambah user '.$user->name, $user->username);

        return response()->json($user->load('role'), 201);
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        $data = [
            'name' => $request->input('name'),
            'username' => $request->input('username'),
            'email' => $request->input('email'),
            'role_id' => $request->input('role_id'),
            'status' => $request->input('status'),
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->input('password'));
        }

        $user->update($data);

        LogAktivitasService::catat('user', 'ubah', 'Mengubah user '.$user->name, $user->username);

        return response()->json($user->load('role'));
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Anda tidak dapat menghapus akun sendiri.'], 422);
        }

        $user->delete();

        LogAktivitasService::catat('user', 'hapus', 'Menghapus user '.$user->name, $user->username);

        return response()->json(['message' => 'User berhasil dihapus.']);
    }
}
