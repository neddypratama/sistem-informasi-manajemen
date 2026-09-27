<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AkunRequest;
use App\Models\Akun;
use App\Models\Kategori;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AkunController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));
        $kategoriId = $request->query('kategori_id');
        $status = $request->query('status');

        [$sort, $order] = $this->sortParams(
            ['kode', 'nama', 'kategori_id', 'saldo_normal', 'created_at'],
            'kode',
            'asc',
        );

        $akuns = Akun::with('kategori')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('kode', 'like', "%{$search}%")
                        ->orWhere('nama', 'like', "%{$search}%")
                        ->orWhereHas('kategori', fn ($k) => $k->where('nama', 'like', "%{$search}%"));
                });
            })
            ->when($kategoriId, fn ($query) => $query->where('kategori_id', $kategoriId))
            ->when(is_string($status) && $status !== '', fn ($query) => $query->where('status', $status))
            ->orderBy($sort, $order)
            ->paginate(15);

        return response()->json($akuns);
    }

    public function store(AkunRequest $request): JsonResponse
    {
        $akun = Akun::create($request->validated());

        LogAktivitasService::catat('akun', 'tambah', 'Menambah akun '.$akun->nama, $akun->kode);

        return response()->json($akun->load('kategori'), 201);
    }

    public function update(AkunRequest $request, Akun $akun): JsonResponse
    {
        $akun->update($request->validated());

        LogAktivitasService::catat('akun', 'ubah', 'Mengubah akun '.$akun->nama, $akun->kode);

        return response()->json($akun->load('kategori'));
    }

    public function destroy(Akun $akun): JsonResponse
    {
        if ($akun->jurnalDetails()->exists()) {
            return response()->json([
                'message' => 'Akun tidak dapat dihapus karena sudah digunakan dalam jurnal.',
            ], 422);
        }

        LogAktivitasService::catat('akun', 'hapus', 'Menghapus akun '.$akun->nama, $akun->kode);

        $akun->delete();

        return response()->json(['message' => 'Akun berhasil dihapus.']);
    }

    /**
     * Daftar kategori aktif untuk form akun.
     */
    public function kategoriOptions(): JsonResponse
    {
        $kategoris = Kategori::where('status', 'aktif')->orderBy('nama')->get();

        return response()->json($kategoris);
    }

    /**
     * Daftar akun kas dan bank aktif untuk pilihan metode pembayaran.
     */
    public function kasBankOptions(): JsonResponse
    {
        $akuns = Akun::with('kategori')
            ->where('status', 'aktif')
            ->where(function ($q): void {
                $q->where('system_code', 'kas')
                    ->orWhereHas('kategori', fn ($k) => $k->whereIn('nama', ['Kas', 'Bank BCA', 'Bank BRI', 'Bank BNI']));
            })
            ->orderBy('kode')
            ->get(['id', 'kode', 'nama', 'kategori_id', 'system_code'])
            ->map(fn ($a) => [
                'id' => $a->id,
                'kode' => $a->kode,
                'nama' => $a->nama,
                'kategori' => $a->kategori?->nama,
                'system_code' => $a->system_code,
            ]);

        return response()->json($akuns);
    }
}
