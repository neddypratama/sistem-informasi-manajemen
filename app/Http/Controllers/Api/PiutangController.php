<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Akun;
use App\Models\Client;
use App\Models\PembayaranPiutang;
use App\Models\Piutang;
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
            ['tanggal', 'no_piutang', 'total', 'created_at'],
            'tanggal',
            'desc',
        );

        $query = $this->queryTerfilter($request);

        $totalNilai = (float) (clone $query)->toBase()->sum('total');

        $piutangs = (clone $query)
            ->with(['client', 'pembayarans', 'user'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->paginate(15);

        // Transform items to include sisa & list of payments
        $piutangs->getCollection()->transform(function ($item) {
            return [
                'id' => $item->id,
                'no_piutang' => $item->no_piutang,
                'tanggal' => $item->tanggal->toDateString(),
                'client_id' => $item->client_id,
                'client' => $item->client?->nama,
                'total' => (float) $item->total,
                'dibayar' => (float) $item->pembayarans->sum('jumlah'),
                'sisa' => (float) $item->sisa(),
                'status' => $item->status,
                'keterangan' => $item->keterangan,
                'user' => $item->user?->name,
                'pembayarans' => $item->pembayarans->map(fn ($p) => [
                    'id' => $p->id,
                    'tanggal' => $p->tanggal->toDateString(),
                    'jumlah' => (float) $p->jumlah,
                    'keterangan' => $p->keterangan,
                ])->values(),
            ];
        });

        // Summary totals
        $allPiutang = Piutang::with('pembayarans');
        $this->scopeKepemilikan($allPiutang);
        $allPiutang = $allPiutang->get();
        $totalPiutang = (float) $allPiutang->sum('total');
        $sisaPiutang = (float) $allPiutang->sum(fn ($p) => $p->sisa());
        $lunasPiutang = (float) ($totalPiutang - $sisaPiutang);

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
            ['tanggal', 'no_piutang', 'total', 'created_at'],
            'tanggal',
            'desc',
        );

        $rows = (clone $this->queryTerfilter($request))
            ->with(['client', 'pembayarans', 'user'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->get()
            ->map(fn (Piutang $item) => [
                $item->no_piutang,
                $item->tanggal->toDateString(),
                $item->client?->nama ?? '',
                (float) $item->total,
                (float) $item->pembayarans->sum('jumlah'),
                (float) $item->sisa(),
                $item->status === 'lunas' ? 'Lunas' : 'Belum Lunas',
                $item->keterangan ?? '',
                $item->user?->name ?? '',
            ]);

        return ExcelExportService::download(
            'piutang-'.now()->format('Y-m-d').'.xlsx',
            ['No. Piutang', 'Tanggal', 'Client', 'Total', 'Dibayar', 'Sisa', 'Status', 'Keterangan', 'Dibuat Oleh'],
            $rows,
            ['D' => '#,##0.00', 'E' => '#,##0.00', 'F' => '#,##0.00'],
        );
    }

    /**
     * Query piutang terfilter (tanpa eager load & sorting) agar index, export,
     * dan agregat total memakai sumber filter yang sama.
     *
     * @return Builder<Piutang>
     */
    private function queryTerfilter(Request $request): Builder
    {
        $clientId = $request->input('client_id');
        $search = trim((string) $request->query('search'));
        $status = $request->query('status');

        $query = Piutang::query();

        $this->scopeKepemilikan($query);

        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        $query
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($x) use ($search): void {
                    $x->where('no_piutang', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($c) => $c->where('nama', 'like', "%{$search}%"));
                });
            })
            ->when(
                is_string($status) && in_array($status, ['belum_lunas', 'lunas'], true),
                fn ($q) => $q->where('status', $status),
            );

        return $query;
    }

    public function createData(): JsonResponse
    {
        $clients = Client::where('status', 'aktif')->orderBy('nama')->get();
        $akunPiutang = Akun::system('piutang');
        $akunKas = Akun::system('kas');

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
            $piutang = DB::transaction(function () use ($validated): Piutang {
                $datePart = str_replace('-', '', $validated['tanggal']);
                $last = Piutang::where('no_piutang', 'like', "PT-{$datePart}-%")
                    ->orderByDesc('id')
                    ->value('no_piutang');
                $sequence = $last ? (int) substr($last, -4) + 1 : 1;
                $noPiutang = sprintf('PT-%s-%04d', $datePart, $sequence);

                $piutang = Piutang::create([
                    'no_piutang' => $noPiutang,
                    'tanggal' => $validated['tanggal'],
                    'client_id' => $validated['client_id'],
                    'total' => $validated['total'],
                    'keterangan' => $validated['keterangan'] ?? null,
                    'status' => 'belum_lunas',
                    'created_by' => auth()->id(),
                    'akun_pembayaran_id' => $validated['akun_pembayaran_id'],
                ]);

                // Auto create journal: Debit Piutang, Kredit Kas
                $this->jurnalService->postTambahPiutang($piutang);

                return $piutang;
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menyimpan transaksi piutang: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat('piutang', 'tambah', 'Menambah piutang', $piutang->no_piutang);

        return response()->json([
            'message' => 'Transaksi tambah piutang berhasil disimpan.',
            'data' => $piutang,
        ], 201);
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
            'jumlah.required' => 'Jumlah terima wajib diisi.',
            'jumlah.gt' => 'Jumlah terima harus lebih besar dari 0.',
            'akun_pembayaran_id.required' => 'Metode pembayaran / akun kas wajib dipilih.',
        ]);

        $clientId = (int) $validated['client_id'];
        $jumlah = (float) $validated['jumlah'];

        // Get unpaid receivable for this client sorted FIFO
        $fakturs = Piutang::with('pembayarans')
            ->where('client_id', $clientId);

        $this->scopeKepemilikan($fakturs);

        $fakturs = $fakturs
            ->get()
            ->filter(fn ($e) => $e->sisa() > 0)
            ->sortBy(fn ($e) => $e->tanggal->toDateString().'-'.str_pad((string) $e->id, 8, '0', STR_PAD_LEFT))
            ->values();

        if ($fakturs->isEmpty()) {
            return response()->json(['message' => 'Client ini tidak memiliki piutang yang belum lunas.'], 422);
        }

        $totalSisa = (float) $fakturs->sum(fn ($f) => $f->sisa());
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

                    $sisaFaktur = $faktur->sisa();
                    $bayar = min($sisaFaktur, $sisaUang);

                    $pembayaran = PembayaranPiutang::create([
                        'piutang_id' => $faktur->id,
                        'tanggal' => $validated['tanggal'],
                        'jumlah' => $bayar,
                        'keterangan' => $validated['keterangan'] ?? null,
                        'created_by' => auth()->id(),
                        'akun_pembayaran_id' => $validated['akun_pembayaran_id'],
                    ]);

                    // Auto create journal: Debit Kas, Kredit Piutang
                    $this->jurnalService->postPembayaranPiutang($pembayaran);

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
