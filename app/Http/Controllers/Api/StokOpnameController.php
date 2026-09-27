<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Akun;
use App\Models\Barang;
use App\Models\StokOpname;
use App\Models\StokOpnameDetail;
use App\Services\ExcelExportService;
use App\Services\JurnalService;
use App\Services\LogAktivitasService;
use App\Services\StokOpnameService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StokOpnameController extends Controller
{
    public function __construct(
        private StokOpnameService $stokOpnameService,
        private JurnalService $jurnalService,
    ) {}

    public function createData(): JsonResponse
    {
        $barangs = Barang::with('jenisBarang')
            ->where('status', 'aktif')
            ->get()
            ->map(fn ($b) => [
                'barang_id' => $b->id,
                'kode_barang' => $b->kode_barang,
                'nama_barang' => $b->nama_barang,
                'satuan' => $b->satuan,
                'kelompok' => $b->jenisBarang?->kelompok,
                'stok_sistem' => (float) $b->stok,
                'harga_satuan' => $this->stokOpnameService->hargaSatuanRataRata($b->id),
            ])
            ->values();

        $bebanOptions = $this->bebanOptions();

        return response()->json([
            'barangs' => $barangs,
            'beban_options' => $bebanOptions,
        ]);
    }

    /**
     * Pilihan akun beban per kelompok barang untuk mencatat selisih kurang maupun lebih.
     *
     * @return array<string, array<int, array{kode: string, nama: string}>> keyed by kelompok
     */
    protected function bebanOptions(): array
    {
        $bebanTelur = [
            'Beban Selisih Stok',
            'Beban Telur Kotor',
            'Beban Telur Bentes',
            'Beban Telur Ceplok',
            'Beban Telur Prok',
            'Beban Telur Jumbo',
        ];

        $ambil = fn (array $namaList) => collect(Akun::whereIn('nama', $namaList)
            ->where('status', 'aktif')
            ->get(['id', 'kode', 'nama']))
            ->mapWithKeys(fn ($akun) => [$akun->nama => $akun])
            ->sortBy(fn ($akun, $nama) => array_search($nama, $namaList, true) ?? 99)
            ->values()
            ->toArray();

        return [
            'telur' => $ambil($bebanTelur),
            'pakan' => $ambil(['Beban Selisih Stok', 'Beban Barang Kadaluarsa']),
            'obat' => $ambil(['Beban Selisih Stok', 'Beban Barang Kadaluarsa']),
            'tray' => $ambil(['Beban Selisih Stok', 'Beban Tray Terpakai']),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        [$sort, $order] = $this->sortParams(
            ['tanggal', 'no_opname', 'status', 'created_at'],
            'tanggal',
            'desc',
        );

        $query = $this->queryTerfilter($request);

        $totalNilaiSelisih = (float) StokOpnameDetail::whereIn(
            'stok_opname_id',
            (clone $query)->toBase()->select($query->qualifyColumn('id')),
        )->sum('nilai_selisih');

        $opnames = (clone $query)
            ->with('user')
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->paginate(15);

        $opnames->getCollection()->transform(function (StokOpname $opname) {
            $selisih = (float) $opname->details()->sum('nilai_selisih');

            return [
                'id' => $opname->id,
                'no_opname' => $opname->no_opname,
                'tanggal' => $opname->tanggal->toDateString(),
                'status' => $opname->status,
                'keterangan' => $opname->keterangan,
                'created_by' => $opname->user?->name,
                'jumlah_barang' => $opname->details()->count(),
                'selisih' => $selisih,
            ];
        });

        return response()->json(array_merge($opnames->toArray(), ['total_nilai_selisih' => $totalNilaiSelisih]));
    }

    public function export(Request $request): StreamedResponse
    {
        [$sort, $order] = $this->sortParams(
            ['tanggal', 'no_opname', 'status', 'created_at'],
            'tanggal',
            'desc',
        );

        $rows = (clone $this->queryTerfilter($request))
            ->with(['user', 'details'])
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->get()
            ->map(fn (StokOpname $opname) => [
                $opname->no_opname,
                $opname->tanggal->toDateString(),
                $opname->status,
                $opname->details->count(),
                (float) $opname->details->sum('nilai_selisih'),
                $opname->user?->name ?? '',
            ]);

        return ExcelExportService::download(
            'stok-opname-'.now()->format('Y-m-d').'.xlsx',
            ['No Opname', 'Tanggal', 'Status', 'Jumlah Barang', 'Nilai Selisih', 'Dibuat Oleh'],
            $rows,
            ['E' => '#,##0.00'],
        );
    }

    /**
     * Query opname terfilter (tanpa eager load & sorting) agar index, export,
     * dan agregat total memakai sumber filter yang sama.
     *
     * @return Builder<StokOpname>
     */
    private function queryTerfilter(Request $request): Builder
    {
        $search = trim((string) $request->query('search'));
        $status = $request->query('status');
        $dari = $request->query('dari');
        $sampai = $request->query('sampai');

        $query = StokOpname::query();

        $this->scopeKepemilikan($query);

        $query
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($x) use ($search): void {
                    $x->where('no_opname', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%");
                });
            })
            ->when(
                is_string($status) && $status !== '',
                fn ($q) => $q->where('status', $status),
            )
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai));

        return $query;
    }

    public function show(StokOpname $opname): JsonResponse
    {
        $this->pastikanKepemilikan($opname);

        $opname->load('details.barang.jenisBarang', 'details.bebans.akunBeban', 'user');

        $details = $opname->details->map(fn ($d) => [
            'barang_id' => $d->barang_id,
            'kode_barang' => $d->barang?->kode_barang,
            'nama_barang' => $d->barang?->nama_barang,
            'satuan' => $d->barang?->satuan,
            'kelompok' => $d->barang?->jenisBarang?->kelompok,
            'stok_sistem' => (float) $d->stok_sistem,
            'stok_fisik' => (float) $d->stok_fisik,
            'selisih' => (float) $d->selisih,
            'harga_satuan' => (float) $d->harga_satuan,
            'nilai_selisih' => (float) $d->nilai_selisih,
            'bebans' => $d->bebans->map(fn ($b) => [
                'id' => $b->id,
                'nama_beban' => $b->akunBeban?->nama,
                'arah' => $b->arah ?? 'kurang',
                'jumlah' => (float) $b->jumlah,
                'nilai' => (float) $b->nilai,
            ])->values(),
        ])->values();

        return response()->json([
            'opname' => [
                'id' => $opname->id,
                'no_opname' => $opname->no_opname,
                'tanggal' => $opname->tanggal->toDateString(),
                'status' => $opname->status,
                'keterangan' => $opname->keterangan,
                'created_by' => $opname->user?->name,
            ],
            'details' => $details,
        ]);
    }

    public function store(): JsonResponse
    {
        $data = $this->validateStore();

        try {
            $opname = DB::transaction(function () use ($data): StokOpname {
                $opname = $this->stokOpnameService->simpanOpname(
                    $data['tanggal'],
                    $data['items'],
                    $data['keterangan'],
                    (int) auth()->id(),
                );

                $this->jurnalService->postStokOpname($opname);

                return $opname;
            });
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menyimpan stok opname: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat('stok_opname', 'tambah', 'Menyimpan stok opname', $opname->no_opname);

        return response()->json([
            'message' => 'Stok opname berhasil disimpan.',
            'id' => $opname->id,
        ], 201);
    }

    public function destroy(StokOpname $opname): JsonResponse
    {
        $this->pastikanKepemilikan($opname);

        if ($opname->isSelesai()) {
            throw ValidationException::withMessages([
                'opname' => 'Stok opname yang sudah selesai tidak dapat dihapus.',
            ]);
        }

        LogAktivitasService::catat('stok_opname', 'hapus', 'Menghapus stok opname', $opname->no_opname);

        $opname->delete();

        return response()->json(['message' => 'Stok opname draft berhasil dihapus.']);
    }

    /**
     * @return array{tanggal: string, keterangan: ?string, items: array<int, array{barang_id: int, beban_akun_id: int, arah: string, jumlah: float}>}
     */
    protected function validateStore(): array
    {
        $validated = request()->validate([
            'tanggal' => ['required', 'date'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.barang_id' => ['required', 'integer', 'exists:barangs,id'],
            'items.*.beban_akun_id' => ['required', 'integer', 'exists:akuns,id'],
            'items.*.arah' => ['required', 'string', 'in:kurang,tambah'],
            'items.*.jumlah' => ['required', 'numeric', 'gt:0'],
        ]);

        return [
            'tanggal' => $validated['tanggal'],
            'keterangan' => $validated['keterangan'] ?? null,
            'items' => collect($validated['items'])
                ->map(fn ($row) => [
                    'barang_id' => (int) $row['barang_id'],
                    'beban_akun_id' => (int) $row['beban_akun_id'],
                    'arah' => (string) $row['arah'],
                    'jumlah' => (float) $row['jumlah'],
                ])
                ->values()
                ->all(),
        ];
    }
}
