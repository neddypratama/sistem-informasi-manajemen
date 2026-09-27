<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogAktivitas;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogAktivitasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $modul = $request->query('modul');
        $modul = in_array($modul, $this->moduls(), true) ? $modul : null;
        $aksi = $request->query('aksi');
        $aksi = in_array($aksi, ['tambah', 'ubah', 'hapus', 'bayar'], true) ? $aksi : null;
        $userId = $request->query('user_id');
        $search = trim((string) $request->query('search'));
        $dari = $request->query('dari');
        $sampai = $request->query('sampai');

        $logs = LogAktivitas::with('user')
            ->when($modul, fn ($q) => $q->where('modul', $modul))
            ->when($aksi, fn ($q) => $q->where('aksi', $aksi))
            ->when($userId, fn ($q) => $q->where('user_id', $userId))
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($x) use ($search): void {
                    $x->where('deskripsi', 'like', "%{$search}%")
                        ->orWhere('referensi', 'like', "%{$search}%");
                });
            })
            ->when($dari, fn ($q) => $q->whereDate('created_at', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('created_at', '<=', $sampai))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json($logs);
    }

    public function userOptions(): JsonResponse
    {
        $users = User::where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json($users);
    }

    /**
     * Daftar modul yang tersedia untuk filter.
     *
     * @return list<string>
     */
    protected function moduls(): array
    {
        return [
            'transaksi',
            'retur',
            'hutang',
            'piutang',
            'pelunasan',
            'jurnal',
            'stok_opname',
            'client',
            'barang',
            'jenis_barang',
            'akun',
            'kategori',
            'user',
            'role',
            'permission',
        ];
    }
}
