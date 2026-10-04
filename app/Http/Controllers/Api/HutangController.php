<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Jurnal;
use App\Services\ExcelExportService;
use App\Services\JurnalService;
use App\Services\LogAktivitasService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class HutangController extends Controller
{
    public function __construct(
        private JurnalService $jurnalService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        [$sort, $order] = $this->sortParams(
            ['tanggal', 'nomor_jurnal', 'created_at'],
            'tanggal',
            'desc',
        );

        if ($sort === 'no_hutang') {
            $sort = 'nomor_jurnal';
        }

        $query = $this->queryTerfilter($request);

        $hutangs = (clone $query)
            ->with(['client', 'pembayarans.details.akun', 'user', 'details.akun.kategori'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->paginate(15);

        // Transform items to include sisa & list of payments
        $hutangs->getCollection()->transform(function (Jurnal $item) {
            $total = $item->totalEntitas();
            $dibayar = $item->dibayarEntitas();
            $sisa = $item->sisaEntitas();
            $status = $item->statusEntitas();

            $pembayarans = $item->pembayarans->map(function ($p) {
                $jumlah = (float) $p->details
                    ->filter(fn ($d) => $d->akun?->system_code === 'hutang' || $d->akun?->kategori?->jenis === 'liabilitas')
                    ->sum('debit');

                return [
                    'id' => $p->id,
                    'tanggal' => $p->tanggal->toDateString(),
                    'jumlah' => $jumlah,
                    'keterangan' => $p->keterangan,
                ];
            })->values();

            return [
                'id' => $item->id,
                'no_hutang' => $item->nomor_jurnal,
                'tanggal' => $item->tanggal->toDateString(),
                'client_id' => $item->client_id,
                'client' => $item->client?->nama,
                'total' => $total,
                'dibayar' => $dibayar,
                'sisa' => $sisa,
                'status' => $status,
                'keterangan' => $item->keterangan,
                'user' => $item->user?->name,
                'pembayarans' => $pembayarans,
            ];
        });

        // Calculate filtered results status
        if ($request->query('status')) {
            $filterStatus = $request->query('status');
            $filtered = $hutangs->getCollection()->filter(fn ($item) => $item['status'] === $filterStatus)->values();
            $hutangs->setCollection($filtered);
        }

        // Summary totals across all hutang
        $allHutang = Jurnal::with(['pembayarans.details.akun', 'details.akun.kategori'])
            ->where('entitas_type', 'hutang');
        $this->scopeKepemilikan($allHutang);
        $allHutang = $allHutang->get();

        $totalHutang = (float) $allHutang->sum(fn ($h) => $h->totalEntitas());
        $sisaHutang = (float) $allHutang->sum(fn ($h) => $h->sisaEntitas());
        $lunasHutang = (float) ($totalHutang - $sisaHutang);

        $totalNilai = (float) $hutangs->getCollection()->sum('total');

        return response()->json([
            'data' => $hutangs,
            'summary' => [
                'total' => $totalHutang,
                'sisa' => $sisaHutang,
                'lunas' => $lunasHutang,
            ],
            'total_nilai' => $totalNilai,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        [$sort, $order] = $this->sortParams(
            ['tanggal', 'nomor_jurnal', 'created_at'],
            'tanggal',
            'desc',
        );

        if ($sort === 'no_hutang') {
            $sort = 'nomor_jurnal';
        }

        $rows = (clone $this->queryTerfilter($request))
            ->with(['client', 'pembayarans.details.akun', 'user', 'details.akun.kategori'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->get()
            ->map(function (Jurnal $item) {
                $total = $item->totalEntitas();
                $dibayar = $item->dibayarEntitas();
                $sisa = $item->sisaEntitas();
                $status = $item->statusEntitas();

                return [
                    $item->nomor_jurnal,
                    $item->tanggal->toDateString(),
                    $item->client?->nama ?? '',
                    $total,
                    $dibayar,
                    $sisa,
                    $status === 'lunas' ? 'Lunas' : 'Belum Lunas',
                    $item->keterangan ?? '',
                    $item->user?->name ?? '',
                ];
            });

        return ExcelExportService::download(
            'hutang-'.now()->format('Y-m-d').'.xlsx',
            ['No. Hutang', 'Tanggal', 'Client', 'Total', 'Dibayar', 'Sisa', 'Status', 'Keterangan', 'Dibuat Oleh'],
            $rows,
            ['D' => '#,##0.00', 'E' => '#,##0.00', 'F' => '#,##0.00'],
        );
    }

    private function queryTerfilter(Request $request): Builder
    {
        $clientId = $request->input('client_id');
        $search = trim((string) $request->query('search'));

        $query = Jurnal::where('entitas_type', 'hutang');

        $this->scopeKepemilikan($query);

        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        $query
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($x) use ($search): void {
                    $x->where('nomor_jurnal', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($c) => $c->where('nama', 'like', "%{$search}%")
                            // ->orWhere('id', 'like', "%{$search}%")
                            // ->orWhere('no_telepon', 'like', "%{$search}%")
                            // ->orWhere('no_telepon', 'like', "%{$search}%")
                            // ->orWhere('alamat', 'like', "%{$search}%")
                        );
                });
            });

        return $query;
    }

    public function createData(): JsonResponse
    {
        $clients = Client::where('status', 'aktif')->orderBy('nama')->get();
        $akunHutang = $this->jurnalService->resolveAkunHutang();
        $akunKas = $this->jurnalService->resolveAkunKas();

        return response()->json([
            'clients' => $clients,
            'akun_fixed' => $akunHutang ? [
                'id' => $akunHutang->id,
                'kode' => $akunHutang->kode,
                'nama' => $akunHutang->nama,
            ] : null,
            'akun_lawan' => $akunKas ? [
                'id' => $akunKas->id,
                'kode' => $akunKas->kode,
                'nama' => $akunKas->nama,
            ] : null,
        ]);
    }

    public function storeTambah(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tanggal' => ['required', 'date'],
            'client_id' => ['required', 'exists:clients,id'],
            'total' => ['required', 'numeric', 'gt:0'],
            'keterangan' => ['nullable', 'string'],
            'akun_pembayaran_id' => ['required', 'exists:akuns,id'],
        ], [
            'client_id.required' => 'Client wajib dipilih.',
            'total.required' => 'Jumlah hutang wajib diisi.',
            'total.gt' => 'Jumlah hutang harus lebih besar dari 0.',
            'akun_pembayaran_id.required' => 'Metode pembayaran / akun kas wajib dipilih.',
        ]);

        try {
            $jurnal = DB::transaction(function () use ($validated): Jurnal {
                return $this->jurnalService->postTambahHutang(
                    $validated['tanggal'],
                    (int) $validated['client_id'],
                    (float) $validated['total'],
                    $validated['keterangan'] ?? null,
                    (int) auth()->id(),
                    (int) $validated['akun_pembayaran_id'],
                );
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menyimpan transaksi hutang: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat('hutang', 'tambah', 'Menambah hutang', $jurnal->nomor_jurnal);

        return response()->json([
            'message' => 'Transaksi tambah hutang berhasil disimpan.',
            'data' => [
                'id' => $jurnal->id,
                'no_hutang' => $jurnal->nomor_jurnal,
                'tanggal' => $jurnal->tanggal->toDateString(),
                'client_id' => $jurnal->client_id,
                'total' => (float) $validated['total'],
                'keterangan' => $jurnal->keterangan,
            ],
        ], 201);
    }

    public function updateTambah(Request $request, Jurnal $hutang): JsonResponse
    {
        $this->scopeKepemilikan(Jurnal::where('id', $hutang->id)->where('entitas_type', 'hutang'));

        $validated = $request->validate([
            'tanggal' => ['required', 'date'],
            'client_id' => ['required', 'exists:clients,id'],
            'total' => ['required', 'numeric', 'gt:0'],
            'keterangan' => ['nullable', 'string'],
            'akun_pembayaran_id' => ['required', 'exists:akuns,id'],
        ], [
            'client_id.required' => 'Client wajib dipilih.',
            'total.required' => 'Jumlah hutang wajib diisi.',
            'total.gt' => 'Jumlah hutang harus lebih besar dari 0.',
            'akun_pembayaran_id.required' => 'Metode pembayaran / akun kas wajib dipilih.',
        ]);

        $dibayar = $hutang->dibayarEntitas();
        if ((float) $validated['total'] < $dibayar) {
            return response()->json([
                'message' => 'Total hutang tidak boleh kurang dari jumlah yang sudah dibayar (Rp '.number_format($dibayar, 0, ',', '.').').',
            ], 422);
        }

        try {
            DB::transaction(function () use ($hutang, $validated): void {
                $hutang->details()->delete();
                $kas = $this->jurnalService->resolveKasAkun((int) $validated['akun_pembayaran_id']);
                $hutangAkun = $this->jurnalService->resolveAkunHutang();

                if ($kas === null || $hutangAkun === null) {
                    throw new \RuntimeException('Akun hutang atau akun kas tidak ditemukan.');
                }

                $hutang->update([
                    'tanggal' => $validated['tanggal'],
                    'client_id' => $validated['client_id'],
                    'keterangan' => $validated['keterangan'] ?? null,
                ]);

                $hutang->details()->create(['akun_id' => $kas->id, 'debit' => $validated['total'], 'kredit' => 0]);
                $hutang->details()->create(['akun_id' => $hutangAkun->id, 'debit' => 0, 'kredit' => $validated['total']]);
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal memperbarui transaksi hutang: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat('hutang', 'ubah', 'Mengubah hutang', $hutang->nomor_jurnal);

        return response()->json([
            'message' => 'Transaksi hutang berhasil diperbarui.',
            'data' => $hutang,
        ]);
    }

    public function storeBayar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tanggal' => ['required', 'date'],
            'client_id' => ['required', 'exists:clients,id'],
            'jumlah' => ['required', 'numeric', 'gt:0'],
            'keterangan' => ['nullable', 'string'],
            'akun_pembayaran_id' => ['required', 'exists:akuns,id'],
        ], [
            'client_id.required' => 'Client wajib dipilih.',
            'jumlah.required' => 'Jumlah bayar wajib diisi.',
            'jumlah.gt' => 'Jumlah bayar harus lebih besar dari 0.',
            'akun_pembayaran_id.required' => 'Metode pembayaran / akun kas wajib dipilih.',
        ]);

        $clientId = (int) $validated['client_id'];
        $jumlah = (float) $validated['jumlah'];

        // Get unpaid debt for this client sorted FIFO
        $fakturs = Jurnal::with(['pembayarans.details.akun', 'details.akun.kategori'])
            ->where('entitas_type', 'hutang')
            ->where('client_id', $clientId);

        $this->scopeKepemilikan($fakturs);

        $fakturs = $fakturs
            ->get()
            ->filter(fn (Jurnal $e) => $e->sisaEntitas() > 0)
            ->sortBy(fn (Jurnal $e) => $e->tanggal->toDateString().'-'.str_pad((string) $e->id, 8, '0', STR_PAD_LEFT))
            ->values();

        if ($fakturs->isEmpty()) {
            return response()->json(['message' => 'Client ini tidak memiliki hutang yang belum lunas.'], 422);
        }

        $totalSisa = (float) $fakturs->sum(fn (Jurnal $f) => $f->sisaEntitas());
        if ($jumlah > $totalSisa) {
            return response()->json(['message' => 'Jumlah pembayaran melebihi total sisa hutang client (Rp '.number_format($totalSisa, 0, ',', '.').').'], 422);
        }

        try {
            DB::transaction(function () use ($validated, $fakturs, $jumlah): void {
                $sisaUang = $jumlah;

                foreach ($fakturs as $faktur) {
                    if ($sisaUang <= 0) {
                        break;
                    }

                    $sisaFaktur = $faktur->sisaEntitas();
                    $bayar = min($sisaFaktur, $sisaUang);

                    $this->jurnalService->postPembayaranHutang(
                        $faktur,
                        $validated['tanggal'],
                        $bayar,
                        $validated['keterangan'] ?? null,
                        (int) auth()->id(),
                        (int) $validated['akun_pembayaran_id'],
                    );

                    $sisaUang -= $bayar;
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menyimpan bayar hutang: '.$e->getMessage()], 422);
        }

        $namaClient = (string) Client::where('id', $clientId)->value('nama');

        LogAktivitasService::catat(
            'hutang',
            'bayar',
            'Pembayaran hutang '.$namaClient.' sebesar Rp '.number_format($jumlah, 0, ',', '.'),
            'Client #'.$clientId,
        );

        return response()->json(['message' => 'Pembayaran hutang berhasil disimpan.'], 201);
    }
}
