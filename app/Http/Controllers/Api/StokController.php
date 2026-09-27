<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use App\Models\StokBatch;
use App\Services\ExcelExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StokController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));
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
            ->when(
                is_string($kelompok) && in_array($kelompok, ['telur', 'pakan', 'obat', 'tray'], true),
                fn ($query) => $query->whereHas('jenisBarang', fn ($j) => $j->where('kelompok', $kelompok)),
            )
            ->when(is_string($status) && $status !== '', fn ($query) => $query->where('status', $status))
            ->orderBy($sort, $order)
            ->paginate(15);

        return response()->json($barangs);
    }

    public function export(Request $request): StreamedResponse
    {
        $search = trim((string) $request->query('search'));
        $kelompok = $request->query('kelompok');
        $status = $request->query('status');

        [$sort, $order] = $this->sortParams(
            ['nama_barang', 'kode_barang', 'stok', 'created_at'],
            'nama_barang',
            'asc',
        );

        $rows = Barang::with('jenisBarang')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('nama_barang', 'like', "%{$search}%")
                        ->orWhere('kode_barang', 'like', "%{$search}%")
                        ->orWhereHas('jenisBarang', fn ($j) => $j->where('nama', 'like', "%{$search}%"));
                });
            })
            ->when(
                is_string($kelompok) && in_array($kelompok, ['telur', 'pakan', 'obat', 'tray'], true),
                fn ($query) => $query->whereHas('jenisBarang', fn ($j) => $j->where('kelompok', $kelompok)),
            )
            ->when(is_string($status) && $status !== '', fn ($query) => $query->where('status', $status))
            ->orderBy($sort, $order)
            ->get()
            ->map(fn (Barang $barang) => [
                $barang->kode_barang,
                $barang->nama_barang,
                $barang->jenisBarang?->kelompok ?? '',
                $barang->satuan,
                (float) $barang->stok,
                $barang->status === 'aktif' ? 'Aktif' : 'Nonaktif',
            ]);

        return ExcelExportService::download(
            'stok-'.now()->format('Y-m-d').'.xlsx',
            ['Kode', 'Nama Barang', 'Kelompok', 'Satuan', 'Stok', 'Status'],
            $rows,
            ['E' => '#,##0.00'],
        );
    }

    public function fifo(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));

        $query = StokBatch::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->whereHas('barang', function ($q) use ($search): void {
                    $q->where('nama_barang', 'like', "%{$search}%")
                        ->orWhere('kode_barang', 'like', "%{$search}%");
                });
            });

        $agregat = (clone $query)
            ->toBase()
            ->selectRaw('COALESCE(SUM(qty_sisa), 0) as total_qty_sisa, COALESCE(SUM(qty_sisa * harga_beli), 0) as total_nilai_sisa')
            ->first();

        $batches = (clone $query)
            ->with('barang.jenisBarang')
            ->orderBy('barang_id')
            ->orderBy('tanggal')
            ->orderBy('id')
            ->paginate(15);

        return response()->json(array_merge($batches->toArray(), [
            'total_qty_sisa' => (float) $agregat->total_qty_sisa,
            'total_nilai_sisa' => (float) $agregat->total_nilai_sisa,
        ]));
    }
}
