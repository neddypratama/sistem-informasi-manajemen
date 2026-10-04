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

class PiutangController extends Controller
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

        if ($sort === 'no_piutang') {
            $sort = 'nomor_jurnal';
        }

        $query = $this->queryTerfilter($request);

        $piutangs = (clone $query)
            ->with(['client', 'pembayarans.details.akun', 'user', 'details.akun.kategori'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->paginate(15);

        // Transform items to include sisa & list of payments
        $piutangs->getCollection()->transform(function (Jurnal $item) {
            $total = $item->totalEntitas();
            $dibayar = $item->dibayarEntitas();
            $sisa = $item->sisaEntitas();
            $status = $item->statusEntitas();

            $pembayarans = $item->pembayarans->map(function ($p) {
                $jumlah = (float) $p->details
                    ->filter(fn ($d) => $d->akun?->system_code === 'piutang' || $d->akun?->kategori?->jenis === 'aset')
                    ->sum('kredit');

                return [
                    'id' => $p->id,
                    'tanggal' => $p->tanggal->toDateString(),
                    'jumlah' => $jumlah,
                    'keterangan' => $p->keterangan,
                ];
            })->values();

            return [
                'id' => $item->id,
                'no_piutang' => $item->nomor_jurnal,
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
            $filtered = $piutangs->getCollection()->filter(fn ($item) => $item['status'] === $filterStatus)->values();
            $piutangs->setCollection($filtered);
        }

        // Summary totals across all piutang
        $allPiutang = Jurnal::with(['pembayarans.details.akun', 'details.akun.kategori'])
            ->where('entitas_type', 'piutang');
        $this->scopeKepemilikan($allPiutang);
        $allPiutang = $allPiutang->get();

        $totalPiutang = (float) $allPiutang->sum(fn ($h) => $h->totalEntitas());
        $sisaPiutang = (float) $allPiutang->sum(fn ($h) => $h->sisaEntitas());
        $lunasPiutang = (float) ($totalPiutang - $sisaPiutang);

        $totalNilai = (float) $piutangs->getCollection()->sum('total');

        return response()->json([
            'data' => $piutangs,
            'summary' => [
                'total' => $totalPiutang,
                'sisa' => $sisaPiutang,
                'lunas' => $lunasPiutang,
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

        if ($sort === 'no_piutang') {
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
            'piutang-'.now()->format('Y-m-d').'.xlsx',
            ['No. Piutang', 'Tanggal', 'Client', 'Total', 'Dibayar', 'Sisa', 'Status', 'Keterangan', 'Dibuat Oleh'],
            $rows,
            ['D' => '#,##0.00', 'E' => '#,##0.00', 'F' => '#,##0.00'],
        );
    }

    private function queryTerfilter(Request $request): Builder
    {
        $clientId = $request->input('client_id');
        $search = trim((string) $request->query('search'));

        $query = Jurnal::where('entitas_type', 'piutang');

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
                            ->orWhere('no_telepon', 'like', "%{$search}%")
                            ->orWhere('no_telepon', 'like', "%{$search}%")
                            ->orWhere('alamat', 'like', "%{$search}%"));
                });
            });

        return $query;
    }

    public function createData(): JsonResponse
    {
        $clients = Client::where('status', 'aktif')->orderBy('nama')->get();
        $akunPiutang = $this->jurnalService->resolveAkunPiutang();
        $akunKas = $this->jurnalService->resolveAkunKas();

        return response()->json([
            'clients' => $clients,
            'akun_fixed' => $akunPiutang ? [
                'id' => $akunPiutang->id,
                'kode' => $akunPiutang->kode,
                'nama' => $akunPiutang->nama,
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
            'total.required' => 'Jumlah piutang wajib diisi.',
            'total.gt' => 'Jumlah piutang harus lebih besar dari 0.',
            'akun_pembayaran_id.required' => 'Metode pembayaran / akun kas wajib dipilih.',
        ]);

        try {
            $jurnal = DB::transaction(function () use ($validated): Jurnal {
                return $this->jurnalService->postTambahPiutang(
                    $validated['tanggal'],
                    (int) $validated['client_id'],
                    (float) $validated['total'],
                    $validated['keterangan'] ?? null,
                    (int) auth()->id(),
                    (int) $validated['akun_pembayaran_id'],
                );
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menyimpan transaksi piutang: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat('piutang', 'tambah', 'Menambah piutang', $jurnal->nomor_jurnal);

        return response()->json([
            'message' => 'Transaksi tambah piutang berhasil disimpan.',
            'data' => [
                'id' => $jurnal->id,
                'no_piutang' => $jurnal->nomor_jurnal,
                'tanggal' => $jurnal->tanggal->toDateString(),
                'client_id' => $jurnal->client_id,
                'total' => (float) $validated['total'],
                'keterangan' => $jurnal->keterangan,
            ],
        ], 201);
    }

    public function updateTambah(Request $request, Jurnal $piutang): JsonResponse
    {
        $this->scopeKepemilikan(Jurnal::where('id', $piutang->id)->where('entitas_type', 'piutang'));

        $validated = $request->validate([
            'tanggal' => ['required', 'date'],
            'client_id' => ['required', 'exists:clients,id'],
            'total' => ['required', 'numeric', 'gt:0'],
            'keterangan' => ['nullable', 'string'],
            'akun_pembayaran_id' => ['required', 'exists:akuns,id'],
        ], [
            'client_id.required' => 'Client wajib dipilih.',
            'total.required' => 'Jumlah piutang wajib diisi.',
            'total.gt' => 'Jumlah piutang harus lebih besar dari 0.',
            'akun_pembayaran_id.required' => 'Metode pembayaran / akun kas wajib dipilih.',
        ]);

        $dibayar = $piutang->dibayarEntitas();
        if ((float) $validated['total'] < $dibayar) {
            return response()->json([
                'message' => 'Total piutang tidak boleh kurang dari jumlah yang sudah diterima (Rp '.number_format($dibayar, 0, ',', '.').').',
            ], 422);
        }

        try {
            DB::transaction(function () use ($piutang, $validated): void {
                $piutang->details()->delete();
                $kas = $this->jurnalService->resolveKasAkun((int) $validated['akun_pembayaran_id']);
                $piutangAkun = $this->jurnalService->resolveAkunPiutang();

                if ($kas === null || $piutangAkun === null) {
                    throw new \RuntimeException('Akun piutang atau akun kas tidak ditemukan.');
                }

                $piutang->update([
                    'tanggal' => $validated['tanggal'],
                    'client_id' => $validated['client_id'],
                    'keterangan' => $validated['keterangan'] ?? null,
                ]);

                $piutang->details()->create(['akun_id' => $piutangAkun->id, 'debit' => $validated['total'], 'kredit' => 0]);
                $piutang->details()->create(['akun_id' => $kas->id, 'debit' => 0, 'kredit' => $validated['total']]);
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal memperbarui transaksi piutang: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat('piutang', 'ubah', 'Mengubah piutang', $piutang->nomor_jurnal);

        return response()->json([
            'message' => 'Transaksi piutang berhasil diperbarui.',
            'data' => $piutang,
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
            'jumlah.required' => 'Jumlah penerimaan wajib diisi.',
            'jumlah.gt' => 'Jumlah penerimaan harus lebih besar dari 0.',
            'akun_pembayaran_id.required' => 'Metode pembayaran / akun kas wajib dipilih.',
        ]);

        $clientId = (int) $validated['client_id'];
        $jumlah = (float) $validated['jumlah'];

        // Get unpaid debt for this client sorted FIFO
        $fakturs = Jurnal::with(['pembayarans.details.akun', 'details.akun.kategori'])
            ->where('entitas_type', 'piutang')
            ->where('client_id', $clientId);

        $this->scopeKepemilikan($fakturs);

        $fakturs = $fakturs
            ->get()
            ->filter(fn (Jurnal $e) => $e->sisaEntitas() > 0)
            ->sortBy(fn (Jurnal $e) => $e->tanggal->toDateString().'-'.str_pad((string) $e->id, 8, '0', STR_PAD_LEFT))
            ->values();

        if ($fakturs->isEmpty()) {
            return response()->json(['message' => 'Client ini tidak memiliki piutang yang belum lunas.'], 422);
        }

        $totalSisa = (float) $fakturs->sum(fn (Jurnal $f) => $f->sisaEntitas());
        if ($jumlah > $totalSisa) {
            return response()->json(['message' => 'Jumlah penerimaan melebihi total sisa piutang client (Rp '.number_format($totalSisa, 0, ',', '.').').'], 422);
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

                    $this->jurnalService->postPembayaranPiutang(
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
            return response()->json(['message' => 'Gagal menyimpan terima piutang: '.$e->getMessage()], 422);
        }

        $namaClient = (string) Client::where('id', $clientId)->value('nama');

        LogAktivitasService::catat(
            'piutang',
            'bayar',
            'Penerimaan piutang '.$namaClient.' sebesar Rp '.number_format($jumlah, 0, ',', '.'),
            'Client #'.$clientId,
        );

        return response()->json(['message' => 'Penerimaan piutang berhasil disimpan.'], 201);
    }
}
