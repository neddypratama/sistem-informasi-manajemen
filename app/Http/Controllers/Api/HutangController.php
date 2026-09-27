<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Akun;
use App\Models\Client;
use App\Models\Hutang;
use App\Models\PembayaranHutang;
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
            ['tanggal', 'no_hutang', 'total', 'created_at'],
            'tanggal',
            'desc',
        );

        $query = $this->queryTerfilter($request);

        $totalNilai = (float) (clone $query)->toBase()->sum('total');

        $hutangs = (clone $query)
            ->with(['client', 'pembayarans', 'user'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->paginate(15);

        // Transform items to include sisa & list of payments
        $hutangs->getCollection()->transform(function ($item) {
            return [
                'id' => $item->id,
                'no_hutang' => $item->no_hutang,
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
        $allHutang = Hutang::with('pembayarans');
        $this->scopeKepemilikan($allHutang);
        $allHutang = $allHutang->get();
        $totalHutang = (float) $allHutang->sum('total');
        $sisaHutang = (float) $allHutang->sum(fn ($h) => $h->sisa());
        $lunasHutang = (float) ($totalHutang - $sisaHutang);

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
            ['tanggal', 'no_hutang', 'total', 'created_at'],
            'tanggal',
            'desc',
        );

        $rows = (clone $this->queryTerfilter($request))
            ->with(['client', 'pembayarans', 'user'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->get()
            ->map(fn (Hutang $item) => [
                $item->no_hutang,
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
            'hutang-'.now()->format('Y-m-d').'.xlsx',
            ['No. Hutang', 'Tanggal', 'Client', 'Total', 'Dibayar', 'Sisa', 'Status', 'Keterangan', 'Dibuat Oleh'],
            $rows,
            ['D' => '#,##0.00', 'E' => '#,##0.00', 'F' => '#,##0.00'],
        );
    }

    /**
     * Query hutang terfilter (tanpa eager load & sorting) agar index, export,
     * dan agregat total memakai sumber filter yang sama.
     *
     * @return Builder<Hutang>
     */
    private function queryTerfilter(Request $request): Builder
    {
        $clientId = $request->input('client_id');
        $search = trim((string) $request->query('search'));
        $status = $request->query('status');

        $query = Hutang::query();

        $this->scopeKepemilikan($query);

        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        $query
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($x) use ($search): void {
                    $x->where('no_hutang', 'like', "%{$search}%")
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
        $akunHutang = Akun::system('hutang');
        $akunKas = Akun::system('kas');

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
            $hutang = DB::transaction(function () use ($validated): Hutang {
                $datePart = str_replace('-', '', $validated['tanggal']);
                $last = Hutang::where('no_hutang', 'like', "HT-{$datePart}-%")
                    ->orderByDesc('id')
                    ->value('no_hutang');
                $sequence = $last ? (int) substr($last, -4) + 1 : 1;
                $noHutang = sprintf('HT-%s-%04d', $datePart, $sequence);

                $hutang = Hutang::create([
                    'no_hutang' => $noHutang,
                    'tanggal' => $validated['tanggal'],
                    'client_id' => $validated['client_id'],
                    'total' => $validated['total'],
                    'keterangan' => $validated['keterangan'] ?? null,
                    'status' => 'belum_lunas',
                    'created_by' => auth()->id(),
                    'akun_pembayaran_id' => $validated['akun_pembayaran_id'],
                ]);

                // Auto create journal: Debit Kas, Kredit Hutang
                $this->jurnalService->postTambahHutang($hutang);

                return $hutang;
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menyimpan transaksi hutang: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat('hutang', 'tambah', 'Menambah hutang', $hutang->no_hutang);

        return response()->json([
            'message' => 'Transaksi tambah hutang berhasil disimpan.',
            'data' => $hutang,
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
            'jumlah.required' => 'Jumlah bayar wajib diisi.',
            'jumlah.gt' => 'Jumlah bayar harus lebih besar dari 0.',
            'akun_pembayaran_id.required' => 'Metode pembayaran / akun kas wajib dipilih.',
        ]);

        $clientId = (int) $validated['client_id'];
        $jumlah = (float) $validated['jumlah'];

        // Get unpaid debt for this client sorted FIFO
        $fakturs = Hutang::with('pembayarans')
            ->where('client_id', $clientId);

        $this->scopeKepemilikan($fakturs);

        $fakturs = $fakturs
            ->get()
            ->filter(fn ($e) => $e->sisa() > 0)
            ->sortBy(fn ($e) => $e->tanggal->toDateString().'-'.str_pad((string) $e->id, 8, '0', STR_PAD_LEFT))
            ->values();

        if ($fakturs->isEmpty()) {
            return response()->json(['message' => 'Client ini tidak memiliki hutang yang belum lunas.'], 422);
        }

        $totalSisa = (float) $fakturs->sum(fn ($f) => $f->sisa());
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

                    $sisaFaktur = $faktur->sisa();
                    $bayar = min($sisaFaktur, $sisaUang);

                    $pembayaran = PembayaranHutang::create([
                        'hutang_id' => $faktur->id,
                        'tanggal' => $validated['tanggal'],
                        'jumlah' => $bayar,
                        'keterangan' => $validated['keterangan'] ?? null,
                        'created_by' => auth()->id(),
                        'akun_pembayaran_id' => $validated['akun_pembayaran_id'],
                    ]);

                    // Auto create journal: Debit Hutang, Kredit Kas
                    $this->jurnalService->postPembayaranHutang($pembayaran);

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
