<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PembayaranRequest;
use App\Models\Jurnal;
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
        return response()->json(['items' => $this->daftarPerClient('hutang')]);
    }

    public function storeHutang(PembayaranRequest $request): JsonResponse
    {
        return $this->store($request, 'hutang');
    }

    public function updateHutang(PembayaranRequest $request, Jurnal $pembayaran): JsonResponse
    {
        $this->pastikanKepemilikan($pembayaran);

        return $this->updatePembayaran($request, 'hutang', $pembayaran);
    }

    public function destroyHutang(Jurnal $pembayaran): JsonResponse
    {
        $this->pastikanKepemilikan($pembayaran);

        return $this->destroy($pembayaran);
    }

    public function updatePiutang(PembayaranRequest $request, Jurnal $pembayaran): JsonResponse
    {
        $this->pastikanKepemilikan($pembayaran);

        return $this->updatePembayaran($request, 'piutang', $pembayaran);
    }

    public function destroyPiutang(Jurnal $pembayaran): JsonResponse
    {
        $this->pastikanKepemilikan($pembayaran);

        return $this->destroy($pembayaran);
    }

    public function terimaPiutang(): JsonResponse
    {
        return response()->json(['items' => $this->daftarPerClient('piutang')]);
    }

    public function storePiutang(PembayaranRequest $request): JsonResponse
    {
        return $this->store($request, 'piutang');
    }

    protected function daftarPerClient(string $entitasType): Collection
    {
        $query = Jurnal::with(['client', 'pembayarans.details.akun', 'details.akun.kategori'])
            ->where('entitas_type', $entitasType);
        $this->scopeKepemilikan($query);

        return $query
            ->get()
            ->filter(fn (Jurnal $e) => $e->client !== null)
            ->groupBy('client_id')
            ->map(function (Collection $group): array {
                $client = $group->first()->client;
                $sisa = (float) $group->sum(fn (Jurnal $e) => $e->sisaEntitas());

                return [
                    'client_id' => $client->id,
                    'client' => $client->nama,
                    'jumlah_tags' => $group->filter(fn (Jurnal $e) => $e->sisaEntitas() > 0)->count(),
                    'total' => (float) $group->sum(fn (Jurnal $e) => $e->totalEntitas()),
                    'sisa' => $sisa,
                    'jumlah_dibayar' => (float) $group->sum(fn (Jurnal $e) => $e->dibayarEntitas()),
                    'tagihans' => $group
                        ->filter(fn (Jurnal $e) => $e->sisaEntitas() > 0)
                        ->sortBy(fn (Jurnal $e) => $e->tanggal->toDateString().'-'.str_pad((string) $e->id, 8, '0', STR_PAD_LEFT))
                        ->map(fn (Jurnal $e) => [
                            'id' => $e->id,
                            'no_tagihan' => $e->nomor_jurnal,
                            'tanggal' => $e->tanggal->toDateString(),
                            'total' => $e->totalEntitas(),
                            'sisa' => $e->sisaEntitas(),
                            'keterangan' => $e->keterangan,
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->filter(fn (array $row) => $row['sisa'] > 0)
            ->values();
    }

    protected function store(PembayaranRequest $request, string $tipe): JsonResponse
    {
        $validated = $request->validated();
        $isHutang = $tipe === 'hutang';

        try {
            DB::transaction(function () use ($validated, $isHutang, $tipe): void {
                if (! empty($validated['client_id'])) {
                    $this->alokasikanKeClient($validated, $isHutang, $tipe);

                    return;
                }

                $fakturId = (int) ($validated['hutang_id'] ?? $validated['piutang_id']);
                $faktur = Jurnal::findOrFail($fakturId);

                $this->buatPembayaran($faktur, $validated, $isHutang);
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menyimpan pelunasan: '.$e->getMessage()], 422);
        }

        $nama = $isHutang ? 'Pembayaran hutang' : 'Penerimaan piutang';

        LogAktivitasService::catat(
            $tipe,
            'pelunasan',
            "{$nama} sebesar Rp ".number_format((float) $validated['jumlah'], 0, ',', '.'),
        );

        return response()->json(['message' => "{$nama} berhasil disimpan."], 201);
    }

    protected function alokasikanKeClient(array $validated, bool $isHutang, string $tipe): void
    {
        $clientId = (int) $validated['client_id'];
        $jumlahTersedia = (float) $validated['jumlah'];

        $fakturs = Jurnal::with(['pembayarans.details.akun', 'details.akun.kategori'])
            ->where('entitas_type', $tipe)
            ->where('client_id', $clientId);

        $this->scopeKepemilikan($fakturs);

        $fakturs = $fakturs
            ->get()
            ->filter(fn (Jurnal $e) => $e->sisaEntitas() > 0)
            ->sortBy(fn (Jurnal $e) => $e->tanggal->toDateString().'-'.str_pad((string) $e->id, 8, '0', STR_PAD_LEFT))
            ->values();

        foreach ($fakturs as $faktur) {
            if ($jumlahTersedia <= 0) {
                break;
            }

            $sisaFaktur = $faktur->sisaEntitas();
            $bayar = min($sisaFaktur, $jumlahTersedia);

            $this->buatPembayaran($faktur, array_merge($validated, ['jumlah' => $bayar]), $isHutang);

            $jumlahTersedia -= $bayar;
        }
    }

    protected function buatPembayaran(Jurnal $invoiceJurnal, array $validated, bool $isHutang): Jurnal
    {
        if ($isHutang) {
            return $this->jurnalService->postPembayaranHutang(
                $invoiceJurnal,
                $validated['tanggal'],
                (float) $validated['jumlah'],
                $validated['keterangan'] ?? null,
                (int) auth()->id(),
                (int) $validated['akun_pembayaran_id'],
            );
        }

        return $this->jurnalService->postPembayaranPiutang(
            $invoiceJurnal,
            $validated['tanggal'],
            (float) $validated['jumlah'],
            $validated['keterangan'] ?? null,
            (int) auth()->id(),
            (int) $validated['akun_pembayaran_id'],
        );
    }

    protected function updatePembayaran(PembayaranRequest $request, string $tipe, Jurnal $pembayaran): JsonResponse
    {
        $validated = $request->validated();
        $isHutang = $tipe === 'hutang';

        $invoiceJurnal = Jurnal::find($pembayaran->journalable_id);
        if ($invoiceJurnal === null) {
            return response()->json(['message' => 'Faktur asal tidak ditemukan.'], 422);
        }

        $sisaLain = $invoiceJurnal->sisaEntitas() + (float) $pembayaran->details
            ->filter(fn ($d) => $isHutang ? ($d->akun?->system_code === 'hutang' || $d->akun?->kategori?->jenis === 'liabilitas') : ($d->akun?->system_code === 'piutang' || $d->akun?->kategori?->jenis === 'aset'))
            ->sum($isHutang ? 'debit' : 'kredit');

        if ((float) $validated['jumlah'] > $sisaLain) {
            return response()->json([
                'message' => 'Jumlah melebihi sisa tagihan (Rp '.number_format($sisaLain, 0, ',', '.').').',
            ], 422);
        }

        try {
            DB::transaction(function () use ($pembayaran, $validated, $isHutang): void {
                $pembayaran->details()->delete();

                $pembayaran->update([
                    'tanggal' => $validated['tanggal'],
                    'keterangan' => $validated['keterangan'] ?? null,
                ]);

                $kas = $this->jurnalService->resolveKasAkun((int) $validated['akun_pembayaran_id']);
                $targetAkun = $isHutang
                    ? $this->jurnalService->resolveAkunHutang()
                    : $this->jurnalService->resolveAkunPiutang();

                if ($kas === null || $targetAkun === null) {
                    throw new \RuntimeException('Akun hutang/piutang atau akun kas tidak ditemukan.');
                }

                if ($isHutang) {
                    $pembayaran->details()->create(['akun_id' => $targetAkun->id, 'debit' => $validated['jumlah'], 'kredit' => 0]);
                    $pembayaran->details()->create(['akun_id' => $kas->id, 'debit' => 0, 'kredit' => $validated['jumlah']]);
                } else {
                    $pembayaran->details()->create(['akun_id' => $kas->id, 'debit' => $validated['jumlah'], 'kredit' => 0]);
                    $pembayaran->details()->create(['akun_id' => $targetAkun->id, 'debit' => 0, 'kredit' => $validated['jumlah']]);
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal memperbarui pelunasan: '.$e->getMessage()], 422);
        }

        return response()->json(['message' => 'Pelunasan berhasil diperbarui.']);
    }

    protected function destroy(Jurnal $pembayaran): JsonResponse
    {
        try {
            DB::transaction(function () use ($pembayaran): void {
                $this->jurnalService->deletePembayaran($pembayaran->id);
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal menghapus pelunasan: '.$e->getMessage()], 422);
        }

        return response()->json(['message' => 'Pelunasan berhasil dihapus.']);
    }
}
