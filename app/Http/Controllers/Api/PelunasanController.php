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
        $createdByFilter = '';
        $bindings = [$entitasType];

        if (! auth()->user()?->bisaMelihatSemuaData()) {
            $createdByFilter = 'AND j.created_by = ?';
            $bindings[] = auth()->id();
        }

        $isHutang = $entitasType === 'hutang';
        $sumInvColumn = $isHutang ? 'jd.kredit' : 'jd.debit';
        $sumPayColumn = $isHutang ? 'pjd.debit' : 'pjd.kredit';

        $sql = "
            SELECT 
                j.id,
                j.nomor_jurnal,
                j.tanggal,
                j.keterangan,
                j.client_id,
                c.nama as client_nama,
                COALESCE(SUM(CASE WHEN a.system_code = '{$entitasType}' OR k.jenis = '{$entitasType}' THEN {$sumInvColumn} ELSE 0 END), 0) as total,
                (
                    COALESCE(SUM(CASE WHEN a.system_code = '{$entitasType}' OR k.jenis = '{$entitasType}' THEN {$sumInvColumn} ELSE 0 END), 0) -
                    COALESCE((
                        SELECT SUM(CASE WHEN pa.system_code = '{$entitasType}' OR pk.jenis = '{$entitasType}' THEN {$sumPayColumn} ELSE 0 END)
                        FROM jurnals pj
                        JOIN jurnal_details pjd ON pjd.jurnal_id = pj.id
                        LEFT JOIN akuns pa ON pa.id = pjd.akun_id
                        LEFT JOIN kategoris pk ON pk.id = pa.kategori_id
                        WHERE pj.journalable_type = 'App\\\\Models\\\\Jurnal' AND pj.journalable_id = j.id
                    ), 0) -
                    COALESCE((
                        SELECT SUM(CASE WHEN ra.system_code = '{$entitasType}' OR rk.jenis = '{$entitasType}' THEN rjd.{$sumPayColumn} ELSE 0 END)
                        FROM transaksis ret
                        JOIN jurnals rj ON rj.journalable_type = 'App\\\\Models\\\\Transaksi' AND rj.journalable_id = ret.id
                        JOIN jurnal_details rjd ON rjd.jurnal_id = rj.id
                        LEFT JOIN akuns ra ON ra.id = rjd.akun_id
                        LEFT JOIN kategoris rk ON rk.id = ra.kategori_id
                        WHERE ret.retur_dari_id = j.journalable_id AND j.journalable_type = 'App\\\\Models\\\\Transaksi'
                    ), 0)
                ) as sisa
            FROM jurnals j
            JOIN clients c ON c.id = j.client_id
            JOIN jurnal_details jd ON jd.jurnal_id = j.id
            LEFT JOIN akuns a ON a.id = jd.akun_id
            LEFT JOIN kategoris k ON k.id = a.kategori_id
            WHERE j.entitas_type = ? AND j.client_id IS NOT NULL {$createdByFilter}
            GROUP BY j.id, j.nomor_jurnal, j.tanggal, j.keterangan, j.client_id, c.nama
            HAVING sisa > 0.001
            ORDER BY j.tanggal ASC, j.id ASC
        ";

        $jenisVal = $isHutang ? 'liabilitas' : 'aset';
        $sql = str_replace("'{$entitasType}'", "'{$jenisVal}'", $sql);

        $results = DB::select($sql, $bindings);

        return collect($results)
            ->groupBy('client_id')
            ->map(function (Collection $group): array {
                $first = $group->first();
                $sisa = (float) $group->sum('sisa');
                $total = (float) $group->sum('total');

                return [
                    'client_id' => (int) $first->client_id,
                    'client' => $first->client_nama,
                    'jumlah_tags' => $group->count(),
                    'total' => round($total, 2),
                    'sisa' => round($sisa, 2),
                    'jumlah_dibayar' => round($total - $sisa, 2),
                    'tagihans' => $group->map(fn ($e) => [
                        'id' => (int) $e->id,
                        'no_tagihan' => $e->nomor_jurnal,
                        'tanggal' => (string) $e->tanggal,
                        'total' => round((float) $e->total, 2),
                        'sisa' => round((float) $e->sisa, 2),
                        'keterangan' => $e->keterangan,
                    ])->values()->all(),
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
