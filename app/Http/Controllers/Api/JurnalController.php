<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\JurnalJenisRequest;
use App\Http\Requests\JurnalRequest;
use App\Models\Akun;
use App\Models\Client;
use App\Models\Jurnal;
use App\Services\ExcelExportService;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JurnalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sumber = $request->input('sumber', 'semua');
        $search = trim((string) $request->query('search'));
        $clientId = $request->query('client_id');
        $dari = $request->query('dari');
        $sampai = $request->query('sampai');
        $jenis = $request->query('jenis');

        [$sort, $order] = $this->sortParams(
            ['tanggal', 'nomor_jurnal', 'created_at'],
            'tanggal',
            'desc',
        );

        $query = Jurnal::with(['user', 'details.akun']);

        $this->scopeKepemilikan($query);

        if ($sumber === 'otomatis') {
            $query->whereNotNull('journalable_id');
        } elseif ($sumber === 'manual') {
            $query->whereNull('journalable_id');
        }

        $this->filterJenis($query, $jenis);

        $query
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($x) use ($search): void {
                    $x->where('nomor_jurnal', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($c) => $c->where('nama', 'like', "%{$search}%"));
                });
            })
            ->when($clientId, fn ($q) => $q->where('client_id', $clientId))
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai));

        $jurnals = $query
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->paginate(15);

        return response()->json($jurnals);
    }

    public function export(Request $request): StreamedResponse
    {
        $sumber = $request->input('sumber', 'semua');
        $search = trim((string) $request->query('search'));
        $clientId = $request->query('client_id');
        $dari = $request->query('dari');
        $sampai = $request->query('sampai');

        [$sort, $order] = $this->sortParams(
            ['tanggal', 'nomor_jurnal', 'created_at'],
            'tanggal',
            'desc',
        );

        $query = Jurnal::with(['user', 'details.akun.kategori']);

        $this->scopeKepemilikan($query);

        if ($sumber === 'otomatis') {
            $query->whereNotNull('journalable_id');
        } elseif ($sumber === 'manual') {
            $query->whereNull('journalable_id');
        }

        $query
            ->when($search !== '', function ($q) use ($search): void {
                $q->where(function ($x) use ($search): void {
                    $x->where('nomor_jurnal', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($c) => $c->where('nama', 'like', "%{$search}%"));
                });
            })
            ->when($clientId, fn ($q) => $q->where('client_id', $clientId))
            ->when($dari, fn ($q) => $q->whereDate('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('tanggal', '<=', $sampai));

        $rows = [];

        $query
            ->orderBy($sort, $order)
            ->when($sort === 'tanggal', fn ($q) => $q->orderByDesc('id'))
            ->get()
            ->each(function (Jurnal $jurnal) use (&$rows) {
                foreach ($jurnal->details as $detail) {
                    $rows[] = [
                        $jurnal->nomor_jurnal,
                        $jurnal->tanggal->toDateString(),
                        $jurnal->keterangan ?? '',
                        $jurnal->client?->nama ?? '',
                        $jurnal->journalable_id ? 'Otomatis' : 'Manual',
                        $detail->akun?->kode ?? '',
                        $detail->akun?->nama ?? '',
                        $detail->akun?->kategori?->nama ?? '',
                        (float) $detail->debit,
                        (float) $detail->kredit,
                    ];
                }
            });

        return ExcelExportService::download(
            'jurnal-'.now()->format('Y-m-d').'.xlsx',
            ['Nomor Jurnal', 'Tanggal', 'Keterangan', 'Client', 'Sumber', 'Kode Akun', 'Nama Akun', 'Kategori', 'Debit', 'Kredit'],
            $rows,
            ['I' => '#,##0.00', 'J' => '#,##0.00'],
        );
    }

    public function show(Jurnal $jurnal): JsonResponse
    {
        $this->pastikanKepemilikan($jurnal);

        $jurnal->load(['user', 'client', 'details.akun.kategori']);

        return response()->json(['jurnal' => $this->jurnalPayload($jurnal)]);
    }

    /**
     * Data awal untuk form jurnal (umum & jenis).
     */
    public function createData(): JsonResponse
    {
        $clients = Client::where('status', 'aktif')->orderBy('nama')->get();
        $akuns = Akun::with('kategori')->where('status', 'aktif')->orderBy('kode')->get();

        $jenisOptions = [];
        foreach (['kas', 'hutang', 'piutang', 'beban', 'pendapatan'] as $jenis) {
            $fixedAkun = match ($jenis) {
                'kas' => Akun::system('kas'),
                'hutang' => Akun::system('hutang'),
                'piutang' => Akun::system('piutang'),
                default => null,
            };

            $fixedOptions = match ($jenis) {
                'kas' => Akun::query()->KasBank()->orderBy('kode')->get(),
                'beban' => $this->akunByJenisKategori('beban'),
                'pendapatan' => $this->akunByJenisKategori('pendapatan'),
                default => collect([$fixedAkun])->filter()->values(),
            };

            $lawan = match ($jenis) {
                'beban', 'pendapatan' => Akun::query()->KasBank()->orderBy('kode')->get(),
                default => $this->lawanOptions($jenis),
            };

            $jenisOptions[$jenis] = [
                'fixed' => $fixedOptions->values(),
                'lawan' => $lawan->values(),
            ];
        }

        $lawanKas = Akun::system('kas');

        return response()->json(compact('clients', 'akuns', 'jenisOptions', 'lawanKas'));
    }

    public function storeJenis(JurnalJenisRequest $request): JsonResponse
    {
        if ($request->input('jenis') === 'kas' && ! auth()->user()?->role?->isAdmin()) {
            return response()->json(['message' => 'Entri kas hanya untuk Admin dan SuperAdmin.'], 403);
        }

        try {
            $jurnal = DB::transaction(function () use ($request): Jurnal {
                $jurnal = Jurnal::create([
                    'nomor_jurnal' => $this->generateNomor($request->input('tanggal')),
                    'tanggal' => $request->input('tanggal'),
                    'client_id' => $request->input('client_id'),
                    'keterangan' => $request->input('keterangan'),
                    'created_by' => auth()->id(),
                ]);

                foreach ($request->itemsJurnal() as $item) {
                    $jurnal->details()->create([
                        'akun_id' => $item['akun_id'],
                        'debit' => $item['debit'],
                        'kredit' => $item['kredit'],
                    ]);
                }

                return $jurnal;
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menyimpan jurnal: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat(
            'jurnal',
            'tambah',
            'Menambah jurnal '.$request->input('jenis'),
            $jurnal->nomor_jurnal,
        );

        return response()->json(['jurnal' => $this->jurnalPayload($jurnal->load('details.akun'))], 201);
    }

    public function editData(Jurnal $jurnal): JsonResponse
    {
        $this->pastikanKepemilikan($jurnal);

        $jurnal->load('details.akun');

        $akuns = Akun::with('kategori')->where('status', 'aktif')->orderBy('kode')->get();
        $clients = Client::where('status', 'aktif')->orderBy('nama')->get();

        return response()->json(['jurnal' => $jurnal, 'akuns' => $akuns, 'clients' => $clients]);
    }

    public function store(JurnalRequest $request): JsonResponse
    {
        try {
            $jurnal = DB::transaction(function () use ($request): Jurnal {
                $jurnal = Jurnal::create([
                    'nomor_jurnal' => $this->generateNomor($request->input('tanggal')),
                    'tanggal' => $request->input('tanggal'),
                    'client_id' => $request->input('client_id'),
                    'keterangan' => $request->input('keterangan'),
                    'created_by' => auth()->id(),
                ]);

                foreach ($request->input('items') as $item) {
                    $jurnal->details()->create([
                        'akun_id' => $item['akun_id'],
                        'debit' => $item['debit'] ?? 0,
                        'kredit' => $item['kredit'] ?? 0,
                    ]);
                }

                return $jurnal;
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menyimpan jurnal: '.$e->getMessage()], 422);
        }

        return response()->json(['jurnal' => $this->jurnalPayload($jurnal->load('details.akun'))], 201);
    }

    public function update(JurnalRequest $request, Jurnal $jurnal): JsonResponse
    {
        $this->pastikanKepemilikan($jurnal);

        try {
            DB::transaction(function () use ($request, $jurnal): void {
                $jurnal->update([
                    'tanggal' => $request->input('tanggal'),
                    'client_id' => $request->input('client_id'),
                    'keterangan' => $request->input('keterangan'),
                ]);

                $jurnal->details()->delete();

                foreach ($request->input('items') as $item) {
                    $jurnal->details()->create([
                        'akun_id' => $item['akun_id'],
                        'debit' => (float) ($item['debit'] ?? 0),
                        'kredit' => (float) ($item['kredit'] ?? 0),
                    ]);
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal memperbarui jurnal: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat('jurnal', 'ubah', 'Mengubah jurnal umum', $jurnal->nomor_jurnal);

        return response()->json(['jurnal' => $this->jurnalPayload($jurnal->load('details.akun'))]);
    }

    public function destroy(Jurnal $jurnal): JsonResponse
    {
        $this->pastikanKepemilikan($jurnal);

        LogAktivitasService::catat('jurnal', 'hapus', 'Menghapus jurnal', $jurnal->nomor_jurnal);

        $jurnal->details()->delete();
        $jurnal->delete();

        return response()->json(['message' => 'Jurnal berhasil dihapus.']);
    }

    /**
     * Batasi daftar jurnal berdasarkan jenis entri (kas/beban/pendapatan).
     *
     * Hanya memfilter ketika berinteraksi dengan akun jenis tsb agar riwayat
     * mencakup jurnal manual maupun otomatis dari transaksi/pelunasan.
     */
    protected function filterJenis($query, ?string $jenis): void
    {
        if (! in_array($jenis, ['kas', 'beban', 'pendapatan'], true)) {
            return;
        }

        $query->whereHas('details.akun', function ($q) use ($jenis) {
            match ($jenis) {
                'kas' => $q->where(function ($x): void {
                    $x->where('system_code', 'kas')
                        ->orWhereHas('kategori', fn ($k) => $k->whereIn('nama', ['Kas', 'Bank BCA', 'Bank BRI', 'Bank BNI']));
                }),
                'beban' => $q->whereHas('kategori', fn ($k) => $k->where('jenis', 'beban')),
                'pendapatan' => $q->whereHas('kategori', fn ($k) => $k->where('jenis', 'pendapatan')),
            };
        });
    }

    protected function jurnalPayload(Jurnal $jurnal): array
    {
        $details = $jurnal->details->map(fn ($d) => [
            'id' => $d->id,
            'akun_id' => $d->akun_id,
            'kode' => $d->akun?->kode,
            'nama_akun' => $d->akun?->nama,
            'kategori' => $d->akun?->kategori?->nama,
            'debit' => (float) $d->debit,
            'kredit' => (float) $d->kredit,
        ])->values();

        return [
            'id' => $jurnal->id,
            'nomor_jurnal' => $jurnal->nomor_jurnal,
            'tanggal' => $jurnal->tanggal->toDateString(),
            'client_id' => $jurnal->client_id,
            'client' => $jurnal->client?->nama,
            'keterangan' => $jurnal->keterangan,
            'user' => $jurnal->user?->name,
            'journalable_id' => $jurnal->journalable_id,
            'details' => $details,
        ];
    }

    protected function akunByJenisKategori(string $jenis): Collection
    {
        return Akun::with('kategori')
            ->whereHas('kategori', fn ($q) => $q->where('jenis', $jenis))
            ->when($jenis === 'beban', function ($q) {
                $q->whereHas('kategori', fn ($k) => $k->where('nama', 'not like', 'HPP%'))
                    ->where(function ($x) {
                        $x->whereNot('system_code', 'hpp')
                            ->orWhereNull('system_code');
                    });
            })
            ->when($jenis === 'pendapatan', function ($q) {
                $q->whereHas('kategori', fn ($k) => $k->where('nama', 'not like', 'Penjualan%'))
                    ->where(function ($x) {
                        $x->whereNot('system_code', 'penjualan')
                            ->orWhereNull('system_code');
                    });
            })
            ->where('status', 'aktif')
            ->orderBy('kode')
            ->get();
    }

    protected function lawanOptions(string $jenis): Collection
    {
        return match ($jenis) {
            'kas' => Akun::with('kategori')
                ->where('status', 'aktif')
                ->where(function ($q) {
                    $q->whereNot('system_code', 'kas')
                        ->orWhereNull('system_code');
                })
                ->orderBy('kode')
                ->get(),
            'hutang' => Akun::with('kategori')
                ->where('status', 'aktif')
                ->where(function ($q) {
                    $q->whereHas('kategori', fn ($x) => $x->whereIn('jenis', ['beban', 'aset']))
                        ->orWhere('system_code', 'kas');
                })
                ->orderBy('kode')
                ->get(),
            'piutang' => Akun::with('kategori')
                ->where('status', 'aktif')
                ->where(function ($q) {
                    $q->whereHas('kategori', fn ($x) => $x->where('jenis', 'pendapatan'))
                        ->orWhere('system_code', 'kas');
                })
                ->orderBy('kode')
                ->get(),
            'beban' => Akun::query()->KasBank()->orderBy('kode')->get(),
            'pendapatan' => Akun::query()->KasBank()->orderBy('kode')->get(),
            default => collect(),
        };
    }

    protected function generateNomor(string $tanggal): string
    {
        $datePart = str_replace('-', '', $tanggal);

        $last = Jurnal::where('nomor_jurnal', 'like', "JNL-{$datePart}-%")
            ->orderByDesc('id')
            ->value('nomor_jurnal');

        $sequence = $last ? (int) substr($last, -4) + 1 : 1;

        return sprintf('JNL-%s-%04d', $datePart, $sequence);
    }
}
