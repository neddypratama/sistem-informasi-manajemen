<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\KategoriRequest;
use App\Models\Kategori;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KategoriController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));
        $jenis = $request->query('jenis');
        $status = $request->query('status');

        [$sort, $order] = $this->sortParams(
            ['nama', 'jenis', 'created_at'],
            'nama',
            'asc',
        );

        $kategoris = Kategori::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('nama', 'like', "%{$search}%")
                        ->orWhere('jenis', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%");
                });
            })
            ->when(is_string($jenis) && $jenis !== '', fn ($query) => $query->where('jenis', $jenis))
            ->when(is_string($status) && $status !== '', fn ($query) => $query->where('status', $status))
            ->orderBy($sort, $order)
            ->paginate(10);

        return response()->json($kategoris);
    }

    public function store(KategoriRequest $request): JsonResponse
    {
        $kategori = Kategori::create($request->validated());

        LogAktivitasService::catat('kategori', 'tambah', 'Menambah kategori akun '.$kategori->nama, $kategori->nama);

        return response()->json($kategori, 201);
    }

    public function update(KategoriRequest $request, Kategori $kategori): JsonResponse
    {
        $kategori->update($request->validated());

        LogAktivitasService::catat('kategori', 'ubah', 'Mengubah kategori akun '.$kategori->nama, $kategori->nama);

        return response()->json($kategori);
    }

    public function destroy(Kategori $kategori): JsonResponse
    {
        if ($kategori->akuns()->exists()) {
            return response()->json([
                'message' => 'Kategori tidak dapat dihapus karena masih memiliki akun.',
            ], 422);
        }

        LogAktivitasService::catat('kategori', 'hapus', 'Menghapus kategori akun '.$kategori->nama, $kategori->nama);

        $kategori->delete();

        return response()->json(['message' => 'Kategori akun berhasil dihapus.']);
    }
}
