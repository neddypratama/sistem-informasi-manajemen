<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            return response()->json([
                'message' => 'Username atau password salah.',
                'errors' => ['username' => ['Username atau password salah.']],
            ], 422);
        }

        $user = Auth::user();

        if ($user->status !== 'active') {
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'message' => 'Akun Anda telah dinonaktifkan.',
                'errors' => ['username' => ['Akun Anda telah dinonaktifkan.']],
            ], 422);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => $this->userPayload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    /**
     * Ringkasan user beserta role dan daftar permission.
     *
     * @return array<string, mixed>
     */
    protected function userPayload($user): array
    {
        $role = $user->role;

        $permissions = $role?->isSuperAdmin()
            ? array_values(Permission::pluck('name')->all())
            : array_values($role?->permissions->pluck('name')->all() ?? []);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'status' => $user->status,
            'role' => $role ? ['id' => $role->id, 'name' => $role->name] : null,
            'permissions' => $permissions,
        ];
    }
}
