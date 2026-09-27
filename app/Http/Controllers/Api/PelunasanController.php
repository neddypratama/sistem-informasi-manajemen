<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PembayaranRequest;
use App\Models\Client;
use App\Models\Hutang;
use App\Models\PembayaranHutang;
use App\Models\PembayaranPiutang;
use App\Models\Piutang;
use App\Services\JurnalService;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PelunasanController extends Controller
{
    public function __construct(
        private JurnalService $jurnalService,
    ) {}

    public function bayarHutang(): JsonResponse
    {
        return response()->json(['items' => $this->daftarPerClient(Hutang::class)]);
    }

    public function storeHutang(PembayaranRequest $request): JsonResponse
    {
        return $this->store($request, 'hutang');
    }

    public function destroyHutang(PembayaranHutang $pembayaran): JsonResponse
    {
        $this->pastikanKepemilikan($pembayaran);

        return $this->destroy($pembayaran->hutang, (int) $pembayaran->jurnal_id, $pembayaran);
    }

    public function destroyPiutang(PembayaranPiutang $pembayaran): JsonResponse
    {
        $this->pastikanKepemilikan($pembayaran);

        return $this->destroy($pembayaran->piutang, (int) $pembayaran->jurnal_id, $pembayaran);
    }

    public function terimaPiutang(): JsonResponse
    {
        return response()->json(['items' => $this->daftarPerClient(Piutang::class)]);
    }

    public function storePiutang(PembayaranRequest $request): JsonResponse
    {
        return $this->store($request, 'piutang');
    }

    /**
     * Kelompokkan tagihan per client sehingga satu client digabung menjadi satu
     * sisa tagihan, memudahkan pelunasan sekaligus atas seluruh fakturnya.
     *
     * @param  class-string<Hutang|Piutang>  $model
     */
    protected function daftarPerClient(string $model): Collection
    {
        $isHutang = $model === Hutang::class;

        $query = $model::with('client', 'pembayarans');
        $this->scopeKepemilikan($query);

        return $query
            ->get()
            ->filter(fn ($e) => $e->client !== null)
            ->groupBy('client_id')
            ->map(function (Collection $group) use ($isHutang): array {
                $client = $group->first()->client;
                $sisa = (float) $group->sum(fn ($e) => $e->sisa());

                return [
                    'client_id' => $client->id,
                    'client' => $client->nama,
                    'jumlah_tags' => $group->filter(fn ($e) => $e->sisa() > 0)->count(),
                    'total' => (float) $group->sum('total'),
                    'sisa' => $sisa,
                    'jumlah_dibayar' => (float) $group->sum(fn ($e) => $e->pembayarans()->sum('jumlah')),
                    'no_prefix' => $isHutang ? 'no_hutang' : 'no_piutang',
                ];
            })
            ->filter(fn ($item) => $item['sisa'] > 0)
            ->values()
            ->sortByDesc('sisa')
            ->values();
    }

    protected function store(PembayaranRequest $request, string $tipe): JsonResponse
    {
        $clientId = $request->input('client_id');
        $fakturId = $request->input($tipe.'_id');

        try {
            DB::transaction(function () use ($request, $tipe, $clientId, $fakturId): int {
                $jumlah = (float) $request->input('jumlah');

                if ($clientId) {
                    $this->alokasikanKeClient(
                        $request,
                        $tipe,
                        (int) $clientId,
                        $jumlah,
                    );

                    return 0;
                }

                $pembayaran = $this->buatPembayaran(
                    $request,
                    $tipe,
                    $this->temukanFaktur($tipe, (int) $fakturId),
                    $jumlah,
                );

                return $pembayaran->id;
            });
        } catch (\Throwable $e) {
            $lbl = $tipe === 'hutang' ? 'pembayaran' : 'penerimaan';

            return response()->json(['message' => "Gagal menyimpan {$lbl}: ".$e->getMessage()], 422);
        }

        $label = $tipe === 'hutang' ? 'hutang' : 'piutang';

        LogAktivitasService::catat(
            'pelunasan',
            'bayar',
            'Pelunasan '.$label.' sebesar Rp '.number_format((float) $request->input('jumlah'), 0, ',', '.'),
            $this->referensiClient($tipe, (int) $clientId, (int) $fakturId),
        );

        return response()->json([
            'message' => $tipe === 'hutang'
                ? 'Pembayaran hutang berhasil disimpan.'
                : 'Penerimaan piutang berhasil disimpan.',
        ], 201);
    }

    /**
     * Ambil faktur pembayaran spesifik (by id) dan pastikan milik user.
     *
     * @return Hutang|Piutang
     */
    protected function temukanFaktur(string $tipe, int $fakturId)
    {
        $faktur = $tipe === 'hutang'
            ? Hutang::findOrFail($fakturId)
            : Piutang::findOrFail($fakturId);

        $this->pastikanKepemilikan($faktur);

        return $faktur;
    }

    /**
     * Alokasikan sejumlah uang pembayaran ke seluruh faktur client yang masih
     * bersisa, diurutkan dari faktur tertua (FIFO). Setiap faktur menerima
     * satu catatan pembayaran beserta jurnalnya sendiri.
     */
    protected function alokasikanKeClient(PembayaranRequest $request, string $tipe, int $clientId, float $jumlah): void
    {
        $model = $tipe === 'hutang' ? Hutang::class : Piutang::class;

        $fakturs = $model::with('pembayarans')
            ->where('client_id', $clientId);

        $this->scopeKepemilikan($fakturs);

        $fakturs = $fakturs
            ->get()
            ->filter(fn ($e) => $e->sisa() > 0)
            ->sortBy(fn ($e) => $e->tanggal->toDateString().'-'.str_pad((string) $e->id, 8, '0', STR_PAD_LEFT))
            ->values();

        $sisaUang = $jumlah;

        foreach ($fakturs as $faktur) {
            if ($sisaUang <= 0) {
                break;
            }

            $sisaFaktur = $faktur->sisa();
            $bayar = min($sisaFaktur, $sisaUang);

            $this->buatPembayaran($request, $tipe, $faktur, $bayar);

            $sisaUang -= $bayar;
        }
    }

    /**
     * @param  Hutang|Piutang  $faktur
     * @return PembayaranHutang|PembayaranPiutang
     */
    protected function buatPembayaran(PembayaranRequest $request, string $tipe, $faktur, float $jumlah)
    {
        $isHutang = $tipe === 'hutang';

        $attrs = [
            $isHutang ? 'hutang_id' : 'piutang_id' => $faktur->id,
            'tanggal' => $request->input('tanggal'),
            'jumlah' => $jumlah,
            'keterangan' => $request->input('keterangan'),
            'created_by' => auth()->id(),
            'akun_pembayaran_id' => $request->input('akun_pembayaran_id'),
        ];

        if ($isHutang) {
            $pembayaran = PembayaranHutang::create($attrs);
            $this->jurnalService->postPembayaranHutang($pembayaran);

            return $pembayaran;
        }

        $pembayaran = PembayaranPiutang::create($attrs);
        $this->jurnalService->postPembayaranPiutang($pembayaran);

        return $pembayaran;
    }

    protected function destroy(Hutang|Piutang $entitas, int $jurnalId, $pembayaran): JsonResponse
    {
        $isHutang = $entitas instanceof Hutang;
        $namaClient = (string) ($entitas->client?->nama ?? '');
        $jumlah = (float) $pembayaran->jumlah;

        try {
            DB::transaction(function () use ($pembayaran, $jurnalId, $entitas): void {
                $this->jurnalService->deletePembayaran($jurnalId, $entitas);
                $pembayaran->delete();
                $entitas->setStatusFromSisa();
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menghapus pembayaran: '.$e->getMessage()], 422);
        }

        LogAktivitasService::catat(
            'pelunasan',
            'hapus',
            'Menghapus '.($isHutang ? 'pembayaran hutang' : 'penerimaan piutang').($namaClient ? " {$namaClient}" : '').' sebesar Rp '.number_format($jumlah, 0, ',', '.'),
            $namaClient ?: null,
        );

        return response()->json(['message' => 'Pembayaran berhasil dihapus.']);
    }

    /**
     * Nama client sebagai referensi log untuk pelunasan.
     */
    protected function referensiClient(string $tipe, int $clientId, int $fakturId): ?string
    {
        $clientId = $clientId > 0 ? $clientId : 0;
        $client = $clientId > 0
            ? Client::find($clientId)
            : null;

        if (! $client && $fakturId > 0) {
            $entitas = $tipe === 'hutang'
                ? Hutang::with('client')->find($fakturId)
                : Piutang::with('client')->find($fakturId);

            $client = $entitas?->client ?? null;
        }

        return $client?->nama ?? null;
    }
}
