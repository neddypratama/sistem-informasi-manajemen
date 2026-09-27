<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JenisBarangRequest;
use App\Models\JenisBarang;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JenisBarangController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));
        $kelompok = $request->query('kelompok');
        $status = $request->query('status');

        [$sort, $order] = $this->sortParams(
            ['nama', 'kelompok', 'created_at'],
            'nama',
            'asc',
        );

        $jenisBarangs = JenisBarang::withCount('barangs')
            ->when($search !== '', fn ($query) => $query->where('nama', 'like', "%{$search}%"))
            ->when(
                is_string($kelompok) && in_array($kelompok, ['telur', 'pakan', 'obat', 'tray'], true),
                fn ($query) => $query->where('kelompok', $kelompok),
            )
            ->when(is_string($status) && $status !== '', fn ($query) => $query->where('status', $status))
            ->orderBy($sort, $order)
            ->paginate(10);

        return response()->json($jenisBarangs);
    }

    /**
     * Daftar semua jenis barang aktif untuk opsi form.
     */
    public function options(): JsonResponse
    {
        $jenisBarangs = JenisBarang::where('status', 'aktif')
            ->orderBy('nama')
            ->get();

        return response()->json($jenisBarangs);
    }

    public function store(JenisBarangRequest $request): JsonResponse
    {
        $jenisBarang = JenisBarang::create($request->validated());

        LogAktivitasService::catat('jenis_barang', 'tambah', 'Menambah jenis barang '.$jenisBarang->nama, $jenisBarang->nama);

        return response()->json($jenisBarang, 201);
    }

    public function update(JenisBarangRequest $request, JenisBarang $jenisBarang): JsonResponse
    {
        $jenisBarang->update($request->validated());

        LogAktivitasService::catat('jenis_barang', 'ubah', 'Mengubah jenis barang '.$jenisBarang->nama, $jenisBarang->nama);

        return response()->json($jenisBarang);
    }

    public function destroy(JenisBarang $jenisBarang): JsonResponse
    {
        if ($jenisBarang->barangs()->exists()) {
            return response()->json([
                'message' => 'Jenis barang tidak dapat dihapus karena masih memiliki barang.',
            ], 422);
        }

        LogAktivitasService::catat('jenis_barang', 'hapus', 'Menghapus jenis barang '.$jenisBarang->nama, $jenisBarang->nama);

        $jenisBarang->delete();

        return response()->json(['message' => 'Jenis barang berhasil dihapus.']);
    }
}
