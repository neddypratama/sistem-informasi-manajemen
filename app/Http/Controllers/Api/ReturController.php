<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReturStoreRequest;
use App\Models\DetailTransaksi;
use App\Models\Hutang;
use App\Models\Piutang;
use App\Models\Transaksi;
use App\Services\FifoStockService;
use App\Services\JurnalService;
use App\Services\LogAktivitasService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ReturController extends Controller
{
    public function __construct(
        private FifoStockService $fifoStockService,
        private JurnalService $jurnalService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tipe = $request->query('tipe', 'penjualan');
        $tipe = $tipe === 'pembelian' ? 'pembelian' : 'penjualan';

        if (! auth()->user()?->hasPermission("menu.retur.{$tipe}")) {
            abort(403, 'Anda tidak memiliki izin untuk mengakses retur '.$tipe.'.');
        }

        [$sort, $order] = $this->sortParams(
            ['tanggal', 'nomor_transaksi', 'total', 'created_at'],
            'tanggal',
            'desc',
        );

        $query = $this->queryTerfilter($request, $tipe);

        $totalNilai = (float) (clone $query)->toBase()->sum('total');

        $returs = (clone $query)
            ->with(['client', 'user', 'returDari'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->paginate(15);

        return response()->json(array_merge($returs->toArray(), ['total_nilai' => $totalNilai]));
    }

    /**
     * Query retur terfilter (tanpa eager load & sorting) agar index dan
     * agregat total memakai sumber filter yang sama.
     *
     * @return Builder<Transaksi>
     */
    private function queryTerfilter(Request $request, string $tipe): Builder
    {
        $tipeTransaksi = $tipe === 'pembelian' ? 'pembelian_retur' : 'penjualan_retur';
        $search = trim((string) $request->query('search'));
        $clientId = $request->query('client_id');
        $dari = $request->query('dari');
        $sampai = $request->query('sampai');

        $query = Transaksi::query()
            ->where('tipe_transaksi', $tipeTransaksi)
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($x) use ($search): void {
                    $x->where('nomor_transaksi', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($c) => $c->where('nama', 'like', "%{$search}%"));
                });
            })
            ->when($clientId, fn ($q) => $q->where('client_id', $clientId))
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai));

        $this->scopeKepemilikan($query);

        return $query;
    }

    public function createData(Request $request): JsonResponse
    {
        $tipe = $request->query('tipe', 'penjualan');
        $tipe = $tipe === 'pembelian' ? 'pembelian' : 'penjualan';
        $isPembelian = $tipe === 'pembelian';

        $sumbers = Transaksi::with('client')
            ->where('tipe_transaksi', $isPembelian ? 'pembelian' : 'penjualan')
            ->orderByDesc('tanggal')
            ->orderByDesc('id');

        $this->scopeKepemilikan($sumbers);

        $dataSumbers = $sumbers->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'nomor_transaksi' => $s->nomor_transaksi,
                'tanggal' => $s->tanggal->toDateString(),
                'client' => $s->client?->nama,
            ])
            ->values();

        return response()->json(compact('tipe', 'isPembelian') + ['sumbers' => $dataSumbers]);
    }

    public function sumberJson(Transaksi $sumber): JsonResponse
    {
        $this->pastikanKepemilikan($sumber);

        $isPembelian = $sumber->isPembelian();

        return response()->json([
            'id' => $sumber->id,
            'nomor_transaksi' => $sumber->nomor_transaksi,
            'tanggal' => $sumber->tanggal->format('Y-m-d'),
            'client_id' => $sumber->client_id,
            'items' => $this->itemsSumber($sumber, $isPembelian),
        ]);
    }

    protected function itemsSumber(Transaksi $sumber, bool $isPembelian = false): Collection
    {
        return $sumber->detailTransaksis()
            ->with('barang')
            ->get()
            ->map(function (DetailTransaksi $detail) use ($isPembelian) {
                $barangId = $detail->barang_id;

                $qty = $isPembelian
                    ? $this->fifoStockService->sisaStokPembelianBisaDireturPerLine($detail)
                    : $this->fifoStockService->qtyTerjualBisaDireturPerLine($detail);

                return [
                    'detail_sumber_id' => $detail->id,
                    'barang_id' => $barangId,
                    'kode_barang' => $detail->barang->kode_barang ?? '',
                    'nama_barang' => $detail->barang->nama_barang ?? '',
                    'satuan' => $detail->barang->satuan ?? '',
                    'kuantitas' => (float) $detail->kuantitas,
                    'harga' => (float) $detail->harga,
                    'qty_available' => (float) $qty,
                ];
            })
            ->filter(fn ($item) => $item['qty_available'] > 0)
            ->values();
    }

    public function store(ReturStoreRequest $request): JsonResponse
    {
        $isPembelian = $request->input('tipe_transaksi') === 'pembelian_retur';
        $sumber = Transaksi::findOrFail($request->input('sumber_id'));

        $this->pastikanKepemilikan($sumber);

        try {
            $retur = DB::transaction(function () use ($request, $sumber, $isPembelian): Transaksi {
                $retur = Transaksi::create([
                    'nomor_transaksi' => $this->generateNomor($request->input('tipe_transaksi'), $request->input('tanggal')),
                    'tanggal' => $request->input('tanggal'),
                    'tipe_transaksi' => $request->input('tipe_transaksi'),
                    'metode_pembayaran' => 'kredit',
                    'client_id' => $sumber->client_id,
                    'retur_dari_id' => $sumber->id,
                    'total' => 0,
                    'keterangan' => $request->input('keterangan'),
                    'created_by' => auth()->id(),
                ]);

                foreach ($request->input('items') as $item) {
                    $detail = DetailTransaksi::create([
                        'transaksi_id' => $retur->id,
                        'detail_sumber_id' => $item['detail_sumber_id'] ?? null,
                        'barang_id' => $item['barang_id'],
                        'kuantitas' => $item['kuantitas'],
                        'harga' => $item['harga'],
                        'subtotal' => round($item['kuantitas'] * $item['harga'], 2),
                    ]);

                    if ($isPembelian) {
                        $this->fifoStockService->reduceStockForPurchaseReturn($detail);
                    } else {
                        $this->fifoStockService->addStockForSalesReturn($detail);
                    }

                    $retur->increment('total', $detail->subtotal);
                }

                $this->jurnalService->postFromTransaksi($retur);

                return $retur;
            });
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        LogAktivitasService::catat('retur', 'tambah', 'Membuat retur '.$retur->tipe_transaksi, $retur->nomor_transaksi);

        return response()->json(['message' => 'Retur berhasil disimpan.'], 201);
    }

    public function show(Transaksi $transaksi): JsonResponse
    {
        $this->pastikanKepemilikan($transaksi);

        if (! $transaksi->isRetur()) {
            return response()->json(['message' => 'Transaksi bukan retur.'], 404);
        }

        $transaksi->load([
            'client',
            'user',
            'returDari',
            'detailTransaksis.barang',
        ]);

        $details = $transaksi->detailTransaksis->map(fn (DetailTransaksi $d) => [
            'id' => $d->id,
            'detail_sumber_id' => $d->detail_sumber_id,
            'barang_id' => $d->barang_id,
            'kode_barang' => $d->barang->kode_barang ?? '',
            'nama_barang' => $d->barang->nama_barang ?? '',
            'nama_barang' => $d->barang->nama_barang ?? '',
            'satuan' => $d->barang->satuan ?? '',
            'kuantitas' => (float) $d->kuantitas,
            'harga' => (float) $d->harga,
            'subtotal' => (float) $d->subtotal,
        ])->values();

        return response()->json([
            'transaksi' => [
                'id' => $transaksi->id,
                'nomor_transaksi' => $transaksi->nomor_transaksi,
                'tanggal' => $transaksi->tanggal->toDateString(),
                'tipe_transaksi' => $transaksi->tipe_transaksi,
                'client' => $transaksi->client?->nama,
                'total' => (float) $transaksi->total,
                'keterangan' => $transaksi->keterangan,
                'user' => $transaksi->user?->name,
                'retur_dari' => $transaksi->returDari ? [
                    'id' => $transaksi->returDari->id,
                    'nomor_transaksi' => $transaksi->returDari->nomor_transaksi,
                    'tanggal' => $transaksi->returDari->tanggal->toDateString(),
                ] : null,
                'details' => $details,
            ],
        ]);
    }

    public function destroy(Transaksi $transaksi): JsonResponse
    {
        $this->pastikanKepemilikan($transaksi);

        if (! $transaksi->isRetur()) {
            return response()->json(['message' => 'Transaksi bukan retur.'], 404);
        }

        $isPembelian = $transaksi->isPembelianRetur();

        $logNomor = $transaksi->nomor_transaksi;
        $logTipe = $transaksi->tipe_transaksi;

        try {
            DB::transaction(function () use ($transaksi, $isPembelian): void {
                foreach ($transaksi->detailTransaksis()->get() as $detail) {
                    if ($isPembelian) {
                        $this->fifoStockService->restoreStockFromPurchaseReturn($detail);
                    } else {
                        $this->fifoStockService->restoreStockFromSalesReturn($detail);
                    }
                }

                if ($isPembelian) {
                    $this->jurnalService->kembalikanEntitasDariRetur($transaksi, Hutang::class);
                } else {
                    $this->jurnalService->kembalikanEntitasDariRetur($transaksi, Piutang::class);
                }

                $this->jurnalService->deleteFromTransaksi($transaksi);
                $transaksi->detailTransaksis()->delete();
                $transaksi->delete();
            });
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        LogAktivitasService::catat('retur', 'hapus', 'Menghapus retur '.$logTipe, $logNomor);

        return response()->json(['message' => 'Retur berhasil dihapus dan stok dikembalikan.']);
    }

    protected function generateNomor(string $tipe, string $tanggal): string
    {
        $prefix = $tipe === 'pembelian_retur' ? 'RPB' : 'RPJ';
        $datePart = str_replace('-', '', $tanggal);

        $last = Transaksi::where('nomor_transaksi', 'like', "{$prefix}-{$datePart}-%")
            ->orderByDesc('id')
            ->value('nomor_transaksi');

        $sequence = $last ? (int) substr($last, -4) + 1 : 1;

        return sprintf('%s-%s-%04d', $prefix, $datePart, $sequence);
    }
}
