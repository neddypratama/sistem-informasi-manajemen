<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TransaksiRequest;
use App\Models\Barang;
use App\Models\Client;
use App\Models\DetailTransaksi;
use App\Models\StokBatch;
use App\Models\StokBatchUsage;
use App\Models\Transaksi;
use App\Services\ExcelExportService;
use App\Services\FifoStockService;
use App\Services\JurnalService;
use App\Services\LogAktivitasService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransaksiController extends Controller
{
    public function __construct(
        private FifoStockService $fifoStockService,
        private JurnalService $jurnalService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tipe = $this->tipeRiwayat($request);

        $this->pastikanAksesRiwayat($tipe);

        [$sort, $order] = $this->sortParams(
            ['tanggal', 'nomor_transaksi', 'total', 'created_at'],
            'tanggal',
            'desc',
        );

        $query = $this->queryTerfilter($request, $tipe);

        $totalNilai = (float) (clone $query)->toBase()->sum('total');

        $transaksis = (clone $query)
            ->with(['client', 'user', 'detailTransaksis.barang.jenisBarang'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->paginate(15);

        return response()->json(array_merge($transaksis->toArray(), ['total_nilai' => $totalNilai]));
    }

    public function export(Request $request): StreamedResponse
    {
        $tipe = $this->tipeRiwayat($request);

        $this->pastikanAksesRiwayat($tipe);

        [$sort, $order] = $this->sortParams(
            ['tanggal', 'nomor_transaksi', 'total', 'created_at'],
            'tanggal',
            'desc',
        );

        $rows = (clone $this->queryTerfilter($request, $tipe))
            ->with(['client', 'user', 'detailTransaksis.barang.jenisBarang'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->get()
            ->map(function (Transaksi $transaksi) {
                $kelompok = (string) ($transaksi->detailTransaksis->first()?->barang?->jenisBarang?->kelompok ?? '');
                $kategori = in_array($kelompok, ['telur', 'pakan', 'obat', 'tray'], true) ? $kelompok : '';

                $tipeLabel = match ($transaksi->tipe_transaksi) {
                    'pembelian' => 'Pembelian',
                    'penjualan' => 'Penjualan',
                    'pembelian_retur' => 'Retur Pembelian',
                    'penjualan_retur' => 'Retur Penjualan',
                    default => $transaksi->tipe_transaksi,
                };

                return [
                    $transaksi->nomor_transaksi,
                    $transaksi->tanggal->toDateString(),
                    $tipeLabel,
                    $kategori,
                    $transaksi->client?->nama ?? '',
                    (float) $transaksi->total,
                    $transaksi->keterangan ?? '',
                    $transaksi->user?->name ?? '',
                ];
            });

        return ExcelExportService::download(
            'transaksi-'.now()->format('Y-m-d').'.xlsx',
            ['Nomor', 'Tanggal', 'Tipe', 'Kategori', 'Client', 'Total', 'Keterangan', 'Dibuat Oleh'],
            $rows,
            ['F' => '#,##0.00'],
        );
    }

    /**
     * Data awal untuk form create.
     */
    public function createData(Request $request): JsonResponse
    {
        $tipe = in_array($request->query('tipe'), ['pembelian', 'penjualan'], true) ? $request->query('tipe') : 'pembelian';
        $kategori = strtolower((string) $request->query('kategori'));

        if (in_array($kategori, ['telur', 'pakan', 'obat', 'tray'], true)
            && ! auth()->user()->hasPermission("menu.{$tipe}.{$kategori}")) {
            abort(403, "Anda tidak memiliki izin untuk mengelola {$tipe} {$kategori}.");
        }

        $clients = Client::where('status', 'aktif')
            ->orderBy('nama')
            ->get();

        $queryBarang = Barang::with('jenisBarang')->where('status', 'aktif');

        // Filter berdasarkan kategori yang dipilih di menu
        if (in_array($kategori, ['telur', 'pakan', 'obat', 'tray'], true)) {
            $queryBarang->whereHas('jenisBarang', fn ($q) => $q->where('kelompok', $kategori));
        }

        $barangs = $queryBarang->orderBy('nama_barang')->get();

        return response()->json(compact('tipe', 'clients', 'barangs'));
    }

    public function store(TransaksiRequest $request): JsonResponse
    {
        $tipeTransaksi = $request->input('tipe_transaksi');
        $tipe = in_array($tipeTransaksi, ['pembelian', 'penjualan'], true) ? $tipeTransaksi : null;

        $this->ensureKategoriPermission(
            $tipe,
            collect($request->input('items'))->pluck('barang_id')->all(),
        );

        if ($tipeTransaksi === 'penjualan' && ! $this->stokMencukupi($request)) {
            return response()->json(['message' => 'Stok barang tidak mencukupi.'], 422);
        }

        try {
            $transaksi = DB::transaction(function () use ($request): Transaksi {
                $transaksi = $this->createTransaksi($request);

                foreach ($request->input('items') as $item) {
                    $this->createDetail($transaksi, $item);
                }

                $this->jurnalService->postFromTransaksi($transaksi);

                return $transaksi;
            });
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $logTipe = $transaksi->tipe_transaksi === 'penjualan' ? 'penjualan' : 'pembelian';
        $logKategori = (string) ($transaksi->detailTransaksis->first()?->barang?->jenisBarang?->kelompok ?? '');

        LogAktivitasService::catat(
            'transaksi',
            'tambah',
            'Menambah transaksi '.$logTipe.($logKategori ? " {$logKategori}" : ''),
            $transaksi->nomor_transaksi,
        );

        return response()->json(['transaksi' => $this->showPayload($transaksi)], 201);
    }

    public function show(Transaksi $transaksi): JsonResponse
    {
        $this->pastikanKepemilikan($transaksi);

        return response()->json(['transaksi' => $this->showPayload($transaksi)]);
    }

    public function editData(Transaksi $transaksi): JsonResponse
    {
        $this->pastikanKepemilikan($transaksi);

        $transaksi->load('detailTransaksis.barang');

        $tipe = $transaksi->tipe_transaksi === 'penjualan' ? 'penjualan' : 'pembelian';

        $this->ensureKategoriPermission(
            $tipe,
            $transaksi->detailTransaksis->pluck('barang_id')->all(),
        );

        $clients = Client::where('status', 'aktif')->orderBy('nama')->get();
        $barangs = Barang::with('jenisBarang')->where('status', 'aktif')->orderBy('nama_barang')->get();

        return response()->json(['transaksi' => $transaksi, 'clients' => $clients, 'barangs' => $barangs]);
    }

    public function update(TransaksiRequest $request, Transaksi $transaksi): JsonResponse
    {
        $this->pastikanKepemilikan($transaksi);

        if ($transaksi->hasRetur()) {
            return response()->json(['message' => 'Transaksi memiliki retur, tidak dapat diubah.'], 422);
        }

        $tipe = $transaksi->tipe_transaksi === 'penjualan' ? 'penjualan' : 'pembelian';

        $this->ensureKategoriPermission(
            $tipe,
            collect($request->input('items'))->pluck('barang_id')->all(),
        );

        try {
            DB::transaction(function () use ($request, $transaksi): void {
                $reapply = $this->revokeStock($transaksi);
                $transaksi->detailTransaksis()->delete();
                $this->jurnalService->deleteFromTransaksi($transaksi);

                $oldTipe = $transaksi->getOriginal('tipe_transaksi');

                $transaksi->fill([
                    'tanggal' => $request->input('tanggal'),
                    'tipe_transaksi' => $request->input('tipe_transaksi'),
                    'metode_pembayaran' => 'kredit',
                    'client_id' => $request->input('client_id'),
                    'total' => 0,
                    'keterangan' => $request->input('keterangan'),
                ])->save();

                if ($oldTipe !== $transaksi->tipe_transaksi) {
                    $transaksi->update([
                        'nomor_transaksi' => $this->generateNomor($transaksi->tipe_transaksi, $transaksi->tanggal),
                    ]);
                }

                foreach ($request->input('items') as $item) {
                    $this->createDetail($transaksi, $item);
                }

                $this->reapplyStock($reapply);

                $this->jurnalService->postFromTransaksi($transaksi);
            });
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        LogAktivitasService::catat(
            'transaksi',
            'ubah',
            'Mengubah transaksi '.$transaksi->tipe_transaksi,
            $transaksi->nomor_transaksi,
        );

        return response()->json(['transaksi' => $this->showPayload($transaksi)]);
    }

    public function destroy(Transaksi $transaksi): JsonResponse
    {
        $this->pastikanKepemilikan($transaksi);

        if ($transaksi->hasRetur()) {
            return response()->json(['message' => 'Transaksi memiliki retur, tidak dapat dihapus.'], 422);
        }

        $logNomor = $transaksi->nomor_transaksi;
        $logTipe = $transaksi->tipe_transaksi;

        $tipe = $transaksi->tipe_transaksi === 'penjualan' ? 'penjualan' : 'pembelian';

        $this->ensureKategoriPermission(
            $tipe,
            $transaksi->detailTransaksis()->pluck('barang_id')->all(),
        );

        try {
            DB::transaction(function () use ($transaksi): void {
                $reapply = $this->revokeStock($transaksi);
                $transaksi->detailTransaksis()->delete();
                $this->jurnalService->deleteFromTransaksi($transaksi);
                $transaksi->delete();

                $this->reapplyStock($reapply);
            });
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        LogAktivitasService::catat('transaksi', 'hapus', 'Menghapus transaksi '.$logTipe, $logNomor);

        return response()->json(['message' => 'Transaksi berhasil dihapus dan stok dikembalikan.']);
    }

    protected function showPayload(Transaksi $transaksi): array
    {
        $transaksi->load([
            'client',
            'user',
            'detailTransaksis.barang',
            'detailTransaksis.stokBatchUsages.stokBatch',
        ]);

        $detailTransaksis = $transaksi->detailTransaksis->load('barang.jenisBarang');

        $details = $detailTransaksis->map(function (DetailTransaksi $detail) {
            return [
                'id' => $detail->id,
                'barang_id' => $detail->barang_id,
                'kode_barang' => $detail->barang->kode_barang ?? '',
                'nama_barang' => $detail->barang->nama_barang ?? '',
                'satuan' => $detail->barang->satuan ?? '',
                'kuantitas' => (float) $detail->kuantitas,
                'harga' => (float) $detail->harga,
                'subtotal' => (float) $detail->subtotal,
            ];
        })->values();

        $kelompok = (string) ($detailTransaksis->first()?->barang?->jenisBarang?->kelompok ?? '');

        return [
            'id' => $transaksi->id,
            'nomor_transaksi' => $transaksi->nomor_transaksi,
            'tanggal' => $transaksi->tanggal->toDateString(),
            'tipe_transaksi' => $transaksi->tipe_transaksi,
            'kategori' => in_array($kelompok, ['telur', 'pakan', 'obat', 'tray'], true) ? $kelompok : '',
            'metode_pembayaran' => $transaksi->metode_pembayaran,
            'client_id' => $transaksi->client_id,
            'client' => $transaksi->client?->nama,
            'retur_dari_id' => $transaksi->retur_dari_id,
            'total' => (float) $transaksi->total,
            'keterangan' => $transaksi->keterangan,
            'user' => $transaksi->user?->name,
            'created_by' => $transaksi->created_by,
            'details' => $details,
        ];
    }

    protected function createTransaksi(TransaksiRequest $request): Transaksi
    {
        return Transaksi::create([
            'nomor_transaksi' => $this->generateNomor($request->input('tipe_transaksi'), $request->input('tanggal')),
            'tanggal' => $request->input('tanggal'),
            'tipe_transaksi' => $request->input('tipe_transaksi'),
            'metode_pembayaran' => 'kredit',
            'client_id' => $request->input('client_id'),
            'total' => 0,
            'keterangan' => $request->input('keterangan'),
            'created_by' => auth()->id(),
        ]);
    }

    protected function createDetail(Transaksi $transaksi, array $item): void
    {
        $detail = DetailTransaksi::create([
            'transaksi_id' => $transaksi->id,
            'barang_id' => $item['barang_id'],
            'kuantitas' => $item['kuantitas'],
            'harga' => $item['harga'],
            'subtotal' => round($item['kuantitas'] * $item['harga'], 2),
        ]);

        if ($transaksi->tipe_transaksi === 'pembelian') {
            $this->fifoStockService->addStockFromPurchase($detail);
        } else {
            $this->fifoStockService->reduceStockForSale($detail);
        }

        $transaksi->increment('total', $detail->subtotal);
    }

    protected function revokeStock(Transaksi $transaksi): Collection
    {
        $reapply = collect();

        if ($transaksi->isPembelian()) {
            $batchIds = StokBatch::whereIn(
                'detail_transaksi_id',
                $transaksi->detailTransaksis()->pluck('id')
            )->pluck('id');

            $reapply = $this->revokeSalesReferencingBatches($batchIds);

            foreach ($transaksi->detailTransaksis()->get() as $detail) {
                $this->fifoStockService->restoreStockFromPurchase($detail);
            }

            return $reapply;
        }

        foreach ($transaksi->detailTransaksis()->get() as $detail) {
            $this->fifoStockService->restoreStockFromSale($detail);
        }

        return $reapply;
    }

    protected function revokeSalesReferencingBatches(Collection $batchIds): Collection
    {
        if ($batchIds->isEmpty()) {
            return collect();
        }

        $detailIds = StokBatchUsage::whereIn('stok_batch_id', $batchIds)
            ->distinct()
            ->pluck('detail_transaksi_id');

        $sales = DetailTransaksi::whereIn('id', $detailIds)
            ->with([
                'transaksi' => fn ($query) => $query->where('tipe_transaksi', 'penjualan'),
            ])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->filter(fn ($detail) => $detail->transaksi !== null)
            ->sortBy([
                ['transaksi.tanggal', 'asc'],
                ['transaksi.id', 'asc'],
            ]);

        foreach ($sales as $detail) {
            $this->fifoStockService->restoreStockFromSale($detail);
        }

        return $sales->pluck('id');
    }

    protected function reapplyStock(Collection $detailIds): void
    {
        $details = DetailTransaksi::whereIn('id', $detailIds)
            ->with('transaksi')
            ->get()
            ->sortBy([
                ['transaksi.tanggal', 'asc'],
                ['transaksi.id', 'asc'],
            ])
            ->values();

        foreach ($details as $detail) {
            $this->fifoStockService->reduceStockForSale($detail);
        }
    }

    protected function stokMencukupi(TransaksiRequest $request): bool
    {
        $totalKebutuhan = collect($request->input('items'))->groupBy('barang_id')
            ->map(fn ($items) => (float) $items->sum('kuantitas'));

        $stok = Barang::whereIn('id', $totalKebutuhan->keys())->pluck('stok', 'id');

        foreach ($totalKebutuhan as $barangId => $kuantitas) {
            if ((float) ($stok[$barangId] ?? 0) < $kuantitas) {
                return false;
            }
        }

        return true;
    }

    /**
     * Riwayat transaksi (tanpa filter tipe) hanya boleh diakses admin (SuperAdmin/Admin).
     */
    protected function pastikanAksesRiwayat(?string $tipe): void
    {
        if ($tipe === null && ! auth()->user()?->role?->isAdmin()) {
            abort(403, 'Hanya admin yang dapat mengakses riwayat transaksi.');
        }
    }

    /**
     * Tipe riwayat yang valid dari query string, atau null untuk semua tipe.
     */
    private function tipeRiwayat(Request $request): ?string
    {
        $tipe = $request->query('tipe');

        return in_array($tipe, ['pembelian', 'penjualan', 'retur'], true) ? $tipe : null;
    }

    /**
     * Query transaksi terfilter (tanpa eager load & sorting) agar index, export,
     * dan agregat total memakai sumber filter yang sama.
     *
     * @return Builder<Transaksi>
     */
    private function queryTerfilter(Request $request, ?string $tipe): Builder
    {
        $kategori = strtolower((string) $request->query('kategori'));
        $search = trim((string) $request->query('search'));
        $clientId = $request->query('client_id');
        $dari = $request->query('dari');
        $sampai = $request->query('sampai');

        $query = Transaksi::query()
            ->when($tipe === 'retur', fn ($q) => $q->whereIn('tipe_transaksi', ['pembelian_retur', 'penjualan_retur']))
            ->when($tipe && $tipe !== 'retur', fn ($q) => $q->where('tipe_transaksi', $tipe));

        $this->scopeKepemilikan($query);

        if (in_array($kategori, ['telur', 'pakan', 'obat', 'tray'], true)) {
            $query->whereHas('detailTransaksis.barang.jenisBarang', function ($q) use ($kategori) {
                $q->where('kelompok', $kategori);
            });
        }

        $query
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($x) use ($search): void {
                    $x->where('nomor_transaksi', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($c) => $c->where('nama', 'like', "%{$search}%"))
                        ->orWhereHas(
                            'detailTransaksis.barang',
                            fn ($b) => $b->where('nama_barang', 'like', "%{$search}%"),
                        );
                });
            })
            ->when($clientId, fn ($q) => $q->where('client_id', $clientId))
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai));

        return $query;
    }

    protected function generateNomor(string $tipe, string $tanggal): string
    {
        $prefix = $tipe === 'pembelian' ? 'PB' : 'PJ';
        $datePart = str_replace('-', '', $tanggal);

        $last = Transaksi::where('nomor_transaksi', 'like', "{$prefix}-{$datePart}-%")
            ->orderByDesc('id')
            ->value('nomor_transaksi');

        $sequence = $last ? (int) substr($last, -4) + 1 : 1;

        return sprintf('%s-%s-%04d', $prefix, $datePart, $sequence);
    }

    /**
     * Pastikan user memiliki permission pengelolaan untuk tipe & kategori barang
     * yang sedang diinput/diubah/dihapus.
     *
     * @param  string  $tipe  'pembelian' | 'penjualan'
     * @param  array<int, int>  $barangIds
     */
    protected function ensureKategoriPermission(string $tipe, array $barangIds): void
    {
        $kategoris = Barang::whereIn('id', $barangIds)
            ->with('jenisBarang')
            ->get()
            ->pluck('jenisBarang.kelompok')
            ->filter()
            ->unique();

        foreach ($kategoris as $kategori) {
            if (! in_array($kategori, ['telur', 'pakan', 'obat', 'tray'], true)) {
                continue;
            }

            if (! auth()->user()->hasPermission("menu.{$tipe}.{$kategori}")) {
                abort(403, "Anda tidak memiliki izin untuk mengelola {$tipe} {$kategori}.");
            }
        }
    }
}
