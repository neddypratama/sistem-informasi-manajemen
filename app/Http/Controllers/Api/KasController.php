<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Akun;
use App\Models\JurnalDetail;
use App\Services\ExcelExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KasController extends Controller
{
    /**
     * Pemantauan kas & bank: saldo kemarin, pemasukan, pengeluaran, saldo akhir.
     */
    public function index(Request $request): JsonResponse
    {
        $tanggal = $request->input('tanggal', now()->toDateString());

        $akuns = Akun::with('kategori')
            ->where('status', 'aktif')
            ->where(function ($q): void {
                $q->where('system_code', 'kas')
                    ->orWhereHas('kategori', fn ($k) => $k->whereIn('nama', ['Kas', 'Bank BCA', 'Bank BRI', 'Bank BNI']));
            })
            ->orderBy('kode')
            ->get();

        $items = $akuns->map(function (Akun $akun) use ($tanggal) {
            $saldoKemarin = $this->saldoSebelum($akun, $tanggal);

            $pemasukan = (float) JurnalDetail::where('akun_id', $akun->id)
                ->whereHas('jurnal', function ($q) use ($tanggal): void {
                    $q->whereDate('tanggal', $tanggal);
                    $this->scopeKepemilikan($q);
                })
                ->sum('debit');

            $pengeluaran = (float) JurnalDetail::where('akun_id', $akun->id)
                ->whereHas('jurnal', function ($q) use ($tanggal): void {
                    $q->whereDate('tanggal', $tanggal);
                    $this->scopeKepemilikan($q);
                })
                ->sum('kredit');

            $saldoAkhir = $saldoKemarin + $pemasukan - $pengeluaran;

            return [
                'id' => $akun->id,
                'kode' => $akun->kode,
                'nama' => $akun->nama,
                'kategori' => $akun->kategori?->nama,
                'system_code' => $akun->system_code,
                'saldo_kemarin' => $saldoKemarin,
                'pemasukan' => $pemasukan,
                'pengeluaran' => $pengeluaran,
                'saldo_akhir' => $saldoAkhir,
            ];
        });

        return response()->json([
            'tanggal' => $tanggal,
            'items' => $items,
            'total_kemarin' => (float) $items->sum('saldo_kemarin'),
            'total_masuk' => (float) $items->sum('pemasukan'),
            'total_keluar' => (float) $items->sum('pengeluaran'),
            'total_akhir' => (float) $items->sum('saldo_akhir'),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $tanggal = $request->input('tanggal', now()->toDateString());

        $akuns = Akun::with('kategori')
            ->where('status', 'aktif')
            ->where(function ($q): void {
                $q->where('system_code', 'kas')
                    ->orWhereHas('kategori', fn ($k) => $k->whereIn('nama', ['Kas', 'Bank BCA', 'Bank BRI', 'Bank BNI']));
            })
            ->orderBy('kode')
            ->get();

        $items = $akuns->map(function (Akun $akun) use ($tanggal) {
            return [
                'kode' => $akun->kode,
                'nama' => $akun->nama,
                'kategori' => $akun->kategori?->nama ?? '',
                'saldo_kemarin' => $this->saldoSebelum($akun, $tanggal),
                'pemasukan' => $this->mutasiHari($akun, $tanggal)['debit'],
                'pengeluaran' => $this->mutasiHari($akun, $tanggal)['kredit'],
            ];
        });

        $rows = $items->map(fn ($item) => [
            $item['kode'],
            $item['nama'],
            $item['kategori'],
            (float) $item['saldo_kemarin'],
            (float) $item['pemasukan'],
            (float) $item['pengeluaran'],
            (float) $item['saldo_kemarin'] + $item['pemasukan'] - $item['pengeluaran'],
        ])->push([
            '',
            'Total',
            '',
            (float) $items->sum('saldo_kemarin'),
            (float) $items->sum('pemasukan'),
            (float) $items->sum('pengeluaran'),
            (float) $items->sum(fn ($item) => $item['saldo_kemarin'] + $item['pemasukan'] - $item['pengeluaran']),
        ]);

        return ExcelExportService::download(
            'kas-bank-'.now()->format('Y-m-d').'.xlsx',
            ['Kode', 'Nama Akun', 'Kategori', 'Saldo Kemarin', 'Pemasukan', 'Pengeluaran', 'Saldo Akhir'],
            $rows,
            ['D' => '#,##0.00', 'E' => '#,##0.00', 'F' => '#,##0.00', 'G' => '#,##0.00'],
        );
    }

    /**
     * Mutasi debit (pemasukan) & kredit (pengeluaran) akun pada tanggal tertentu.
     *
     * @return array{debit: float, kredit: float}
     */
    protected function mutasiHari(Akun $akun, string $tanggal): array
    {
        $detail = JurnalDetail::where('akun_id', $akun->id)
            ->whereHas('jurnal', function ($q) use ($tanggal): void {
                $q->whereDate('tanggal', $tanggal);
                $this->scopeKepemilikan($q);
            })
            ->selectRaw('COALESCE(SUM(debit), 0) as debit, COALESCE(SUM(kredit), 0) as kredit')
            ->first();

        return [
            'debit' => (float) $detail->debit,
            'kredit' => (float) $detail->kredit,
        ];
    }

    /**
     * Saldo akun pada akhir hari sebelum tanggal (debit normal => debit - kredit).
     */
    protected function saldoSebelum(Akun $akun, string $tanggal): float
    {
        $debit = (float) JurnalDetail::where('akun_id', $akun->id)
            ->whereHas('jurnal', function ($q) use ($tanggal): void {
                $q->whereDate('tanggal', '<', $tanggal);
                $this->scopeKepemilikan($q);
            })
            ->sum('debit');

        $kredit = (float) JurnalDetail::where('akun_id', $akun->id)
            ->whereHas('jurnal', function ($q) use ($tanggal): void {
                $q->whereDate('tanggal', '<', $tanggal);
                $this->scopeKepemilikan($q);
            })
            ->sum('kredit');

        return $debit - $kredit;
    }
}
