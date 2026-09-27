<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BarangRequest;
use App\Models\Barang;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BarangController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));
        $jenisBarangId = $request->query('jenis_barang_id');
        $kelompok = $request->query('kelompok');
        $status = $request->query('status');

        [$sort, $order] = $this->sortParams(
            ['nama_barang', 'kode_barang', 'stok', 'created_at'],
            'nama_barang',
            'asc',
        );

        $barangs = Barang::with('jenisBarang')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('nama_barang', 'like', "%{$search}%")
                        ->orWhere('kode_barang', 'like', "%{$search}%")
                        ->orWhereHas('jenisBarang', fn ($j) => $j->where('nama', 'like', "%{$search}%"));
                });
            })
            ->when($jenisBarangId, fn ($query) => $query->where('jenis_barang_id', $jenisBarangId))
            ->when(
                is_string($kelompok) && $kelompok !== '',
                fn ($query) => $query->whereHas('jenisBarang', fn ($j) => $j->where('kelompok', $kelompok)),
            )
            ->when(is_string($status) && $status !== '', fn ($query) => $query->where('status', $status))
            ->orderBy($sort, $order)
            ->paginate(10);

        return response()->json($barangs);
    }

    /**
     * Daftar semua barang aktif untuk opsi form.
     */
    public function options(): JsonResponse
    {
        $barangs = Barang::with('jenisBarang')
            ->where('status', 'aktif')
            ->orderBy('nama_barang')
            ->get();

        return response()->json($barangs);
    }

    public function store(BarangRequest $request): JsonResponse
    {
        $barang = Barang::create($request->validated());

        LogAktivitasService::catat('barang', 'tambah', 'Menambah barang '.$barang->nama_barang, $barang->nama_barang);

        return response()->json($barang, 201);
    }

    public function update(BarangRequest $request, Barang $barang): JsonResponse
    {
        $barang->update($request->validated());

        LogAktivitasService::catat('barang', 'ubah', 'Mengubah barang '.$barang->nama_barang, $barang->nama_barang);

        return response()->json($barang->load('jenisBarang'));
    }

    public function destroy(Barang $barang): JsonResponse
    {
        if ($barang->detailTransaksis()->exists()) {
            return response()->json([
                'message' => 'Barang tidak dapat dihapus karena sudah digunakan pada transaksi.',
            ], 422);
        }

        LogAktivitasService::catat('barang', 'hapus', 'Menghapus barang '.$barang->nama_barang, $barang->nama_barang);

        $barang->delete();

        return response()->json(['message' => 'Barang berhasil dihapus.']);
    }
}
