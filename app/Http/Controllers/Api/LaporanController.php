<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Akun;
use App\Models\Barang;
use App\Models\DetailTransaksi;
use App\Models\JurnalDetail;
use App\Models\StokBatchUsage;
use App\Services\ExcelExportService;
use App\Services\FifoStockService;
use App\Services\SaldoAkunService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LaporanController extends Controller
{
    public function __construct(private SaldoAkunService $saldoAkun) {}

    /** @var string[] */
    private const CURAH_SYSTEM_CODES = [
        'stok_pakan_curah',
        'penjualan_pakan_curah',
        'hpp_pakan_curah',
        'piutang_pakan_curah',
        'hutang_pakan_curah',
    ];

    public function bukuBesar(Request $request): JsonResponse
    {
        $akuns = Akun::with('kategori')->orderBy('kode')->get();

        $akunId = $request->integer('akun_id');
        $start = $request->input('dari');
        $end = $request->input('sampai');

        $akunTerpilih = $akunId ? $akuns->firstWhere('id', $akunId) : null;

        $semuaAkun = $akunTerpilih === null;

        $scopeAkuns = $akunTerpilih ? collect([$akunTerpilih]) : $akuns->values();

        $laporan = $scopeAkuns->map(function (Akun $akun) use ($start, $end) {
            $query = JurnalDetail::with(['jurnal' => fn ($q) => $q->with('journalable', 'client')])
                ->where('akun_id', $akun->id);

            if ($start) {
                $query->whereHas('jurnal', fn ($q) => $q->where('tanggal', '>=', $start));
            }
            if ($end) {
                $query->whereHas('jurnal', fn ($q) => $q->where('tanggal', '<=', $end));
            }

            $query->whereHas('jurnal', function ($q): void {
                $this->scopeKepemilikan($q);
            });

            $details = $query
                ->orderBy('jurnal_id')
                ->get()
                ->filter(fn ($d) => $d->jurnal !== null)
                ->values();

            $saldoAwal = $start ? $this->saldoAkhirSebelum($akun, $start) : 0;

            $running = $saldoAwal;
            $details = $details->map(function ($d) use ($akun, &$running) {
                $debit = (float) $d->debit;
                $kredit = (float) $d->kredit;

                if ($akun->saldo_normal === 'debit') {
                    $running += $debit - $kredit;
                } else {
                    $running += $kredit - $debit;
                }

                return [
                    'id' => $d->id,
                    'tanggal' => $d->jurnal->tanggal->toDateString(),
                    'nomor_jurnal' => $d->jurnal->nomor_jurnal,
                    'keterangan' => $d->jurnal->keterangan,
                    'client' => $d->jurnal->client?->nama,
                    'debit' => $debit,
                    'kredit' => $kredit,
                    'saldo' => $running,
                ];
            })->values();

            $debitTotal = $details->sum('debit');
            $kreditTotal = $details->sum('kredit');

            $saldoAkhir = $saldoAwal + (($akun->saldo_normal === 'debit')
                ? $debitTotal - $kreditTotal
                : $kreditTotal - $debitTotal);

            return [
                'akun' => [
                    'id' => $akun->id,
                    'kode' => $akun->kode,
                    'nama' => $akun->nama,
                    'kategori' => $akun->kategori?->nama,
                    'saldo_normal' => $akun->saldo_normal,
                ],
                'details' => $details,
                'debit' => $debitTotal,
                'kredit' => $kreditTotal,
                'saldo' => $saldoAkhir,
            ];
        })
            ->filter(fn ($item) => $item['details']->isNotEmpty())
            ->values();

        return response()->json([
            'akuns' => $akuns,
            'akunTerpilih' => $akunTerpilih,
            'semuaAkun' => $semuaAkun,
            'laporan' => $laporan,
            'start' => $start,
            'end' => $end,
        ]);
    }

    public function exportBukuBesar(Request $request): StreamedResponse
    {
        $akunId = $request->integer('akun_id');
        $start = $request->input('dari');
        $end = $request->input('sampai');

        $akuns = $akunId
            ? Akun::with('kategori')->whereKey($akunId)->get()
            : Akun::with('kategori')->orderBy('kode')->get();

        $rows = [];

        foreach ($akuns as $akun) {
            $query = JurnalDetail::with(['jurnal' => fn ($q) => $q->with('client')])
                ->where('akun_id', $akun->id);

            if ($start) {
                $query->whereHas('jurnal', fn ($q) => $q->where('tanggal', '>=', $start));
            }
            if ($end) {
                $query->whereHas('jurnal', fn ($q) => $q->where('tanggal', '<=', $end));
            }

            $query->whereHas('jurnal', function ($q): void {
                $this->scopeKepemilikan($q);
            });

            $details = $query->orderBy('jurnal_id')->get();

            if ($details->isEmpty()) {
                continue;
            }

            $saldoAwal = $start ? $this->saldoAkhirSebelum($akun, $start) : 0;
            $running = $saldoAwal;

            foreach ($details as $detail) {
                if ($detail->jurnal === null) {
                    continue;
                }

                $debit = (float) $detail->debit;
                $kredit = (float) $detail->kredit;

                $running += $akun->saldo_normal === 'debit' ? $debit - $kredit : $kredit - $debit;

                $rows[] = [
                    $akun->kode,
                    $akun->nama,
                    $akun->kategori?->nama ?? '',
                    $detail->jurnal->tanggal->toDateString(),
                    $detail->jurnal->nomor_jurnal,
                    $detail->jurnal->keterangan ?? '',
                    $detail->jurnal->client?->nama ?? '',
                    $debit,
                    $kredit,
                    $running,
                ];
            }
        }

        return ExcelExportService::download(
            'buku-besar-'.now()->format('Y-m-d').'.xlsx',
            ['Kode Akun', 'Nama Akun', 'Kategori', 'Tanggal', 'No. Jurnal', 'Keterangan', 'Client', 'Debit', 'Kredit', 'Saldo'],
            $rows,
            ['H' => '#,##0.00', 'I' => '#,##0.00', 'J' => '#,##0.00'],
        );
    }

    protected function isCurahAkun($akun): bool
    {
        $systemCode = is_array($akun) ? ($akun['system_code'] ?? null) : $akun->system_code;
        $nama = is_array($akun) ? ($akun['nama'] ?? '') : $akun->nama;

        return in_array($systemCode, self::CURAH_SYSTEM_CODES, true)
            || $nama === 'Saldo Bp.Supriyadi';
    }

    public function neraca(Request $request): JsonResponse
    {
        $tanggal = $request->input('tanggal', now()->toDateString());

        $semua = Akun::with('kategori')
            ->where('status', 'aktif')
            ->get();

        $akuns = $semua
            ->reject(fn ($akun) => $this->isCurahAkun($akun))
            ->map(fn ($akun) => [
                'id' => $akun->id,
                'kode' => $akun->kode,
                'nama' => $akun->nama,
                'kategori' => $akun->kategori?->nama,
                'jenis' => $akun->kategori?->jenis,
                'saldo_normal' => $akun->saldo_normal,
                'saldo' => $this->saldoAkhir($akun, $tanggal),
            ])
            ->values();

        $curahAkuns = $semua
            ->filter(fn ($akun) => $this->isCurahAkun($akun))
            ->map(fn ($akun) => [
                'id' => $akun->id,
                'kode' => $akun->kode,
                'nama' => $akun->nama,
                'system_code' => $akun->system_code,
                'jenis' => $akun->kategori?->jenis,
                'saldo_normal' => $akun->saldo_normal,
                'saldo' => $this->saldoAkhir($akun, $tanggal),
            ]);

        $asetCurah = $curahAkuns->filter(fn ($a) => $a['jenis'] === 'aset')->values();
        $liabilitasCurah = $curahAkuns->filter(fn ($a) => $a['jenis'] === 'liabilitas')->values();
        $pendapatanCurah = (float) $curahAkuns->where('jenis', 'pendapatan')->sum('saldo');
        $bebanCurah = (float) $curahAkuns->where('jenis', 'beban')->sum('saldo');
        $labaCurah = $pendapatanCurah - $bebanCurah;

        $totalAsetCurah = (float) $asetCurah->sum('saldo');
        $totalLiabilitasCurah = (float) $liabilitasCurah->sum('saldo');
        $totalEkuitasCurah = $labaCurah;
        $totalKewajibanCurah = $totalLiabilitasCurah + $totalEkuitasCurah;
        $selisihCurah = $totalAsetCurah - $totalKewajibanCurah;

        $diLuarNeraca = [
            'aset' => $asetCurah,
            'liabilitas' => $liabilitasCurah,
            'ekuitas' => [
                'pendapatan' => $pendapatanCurah,
                'beban' => $bebanCurah,
                'laba' => $labaCurah,
            ],
            'totalAset' => $totalAsetCurah,
            'totalLiabilitas' => $totalLiabilitasCurah,
            'totalEkuitas' => $totalEkuitasCurah,
            'totalKewajiban' => $totalKewajibanCurah,
            'selisih' => $selisihCurah,
        ];

        return response()->json(compact('akuns', 'diLuarNeraca', 'tanggal'));
    }

    public function exportNeraca(Request $request): StreamedResponse
    {
        $tanggal = $request->input('tanggal', now()->toDateString());

        $semua = Akun::with('kategori')
            ->where('status', 'aktif')
            ->get()
            ->map(function ($akun) use ($tanggal) {
                return [
                    'kode' => $akun->kode,
                    'nama' => $akun->nama,
                    'kategori' => $akun->kategori?->nama ?? '',
                    'jenis' => $akun->kategori?->jenis ?? '',
                    'system_code' => $akun->system_code,
                    'saldo_normal' => $akun->saldo_normal,
                    'saldo' => $this->saldoAkhir($akun, $tanggal),
                ];
            });

        $akuns = $semua->reject(fn ($akun) => $this->isCurahAkun($akun))
            ->filter(fn ($akun) => $akun['saldo'] != 0)
            ->values();

        $curahAkuns = $semua->filter(fn ($akun) => $this->isCurahAkun($akun));

        $saldo = function (string $jenis) use ($akuns): float {
            return (float) $akuns->where('jenis', $jenis)->sum('saldo');
        };

        $totalAset = $saldo('aset');
        $totalPendapatan = $saldo('pendapatan');
        $totalBeban = $saldo('beban');
        $labaBerjalan = $totalPendapatan - $totalBeban;
        $totalKewajiban = $saldo('liabilitas') + $labaBerjalan;
        $selisih = $totalAset - $totalKewajiban;

        $rows = $akuns->map(fn ($akun) => [
            $akun['kode'],
            $akun['nama'],
            $akun['kategori'],
            $akun['jenis'],
            (float) $akun['saldo'],
        ])->push(['', '--- TOTAL ASET ---', '', '', $totalAset])
            ->push(['', '--- TOTAL KEWAJIBAN + EKUITAS ---', '', '', $totalKewajiban])
            ->push(['', '--- SELISIH ---', '', '', $selisih]);

        // --- DI LUAR NERACA: PAKAN CURAH ---
        $rows->push(['', '', '', '', '']);
        $rows->push(['', '=== DI LUAR NERACA: PAKAN CURAH ===', '', '', '']);

        // Aset curah
        $asetCurah = $curahAkuns->filter(fn ($a) => $a['jenis'] === 'aset' && $a['saldo'] != 0)->values();
        $rows->push(['', '--- ASET ---', '', '', '']);
        foreach ($asetCurah as $akun) {
            $rows->push([$akun['kode'], $akun['nama'], $akun['kategori'], $akun['jenis'], (float) $akun['saldo']]);
        }
        $totalAsetCurah = (float) $asetCurah->sum('saldo');
        $rows->push(['', '--- TOTAL ASET PAKAN CURAH ---', '', '', $totalAsetCurah]);

        // Liabilitas curah
        $liabilitasCurah = $curahAkuns->filter(fn ($a) => $a['jenis'] === 'liabilitas' && $a['saldo'] != 0)->values();
        $rows->push(['', '--- LIABILITAS ---', '', '', '']);
        foreach ($liabilitasCurah as $akun) {
            $rows->push([$akun['kode'], $akun['nama'], $akun['kategori'], $akun['jenis'], (float) $akun['saldo']]);
        }
        $totalLiabilitasCurah = (float) $liabilitasCurah->sum('saldo');
        $rows->push(['', '--- TOTAL LIABILITAS PAKAN CURAH ---', '', '', $totalLiabilitasCurah]);

        // Ekuitas curah (Pendapatan − Beban)
        $pendapatanCurah = (float) $curahAkuns->where('jenis', 'pendapatan')->sum('saldo');
        $bebanCurah = (float) $curahAkuns->where('jenis', 'beban')->sum('saldo');
        $labaCurah = $pendapatanCurah - $bebanCurah;
        $totalKewajibanCurah = $totalLiabilitasCurah + $labaCurah;
        $selisihCurah = $totalAsetCurah - $totalKewajibanCurah;

        $rows->push(['', '--- EKUITAS ---', '', '', '']);
        $rows->push(['', 'Total Pendapatan Curah', '', '', $pendapatanCurah]);
        $rows->push(['', 'Total Beban (HPP) Curah', '', '', $bebanCurah]);
        $rows->push(['', 'Laba Kotor Curah', '', '', $labaCurah]);
        $rows->push(['', '--- TOTAL KEWAJIBAN + EKUITAS PAKAN CURAH ---', '', '', $totalKewajibanCurah]);
        $rows->push(['', '--- SELISIH PAKAN CURAH ---', '', '', $selisihCurah]);

        return ExcelExportService::download(
            'neraca-'.now()->format('Y-m-d').'.xlsx',
            ['Kode', 'Nama Akun', 'Kategori', 'Jenis', 'Saldo'],
            $rows,
            ['E' => '#,##0.00'],
        );
    }

    public function labaRugi(Request $request): JsonResponse
    {
        $start = $request->input('dari', now()->startOfMonth()->toDateString());
        $end = $request->input('sampai', now()->endOfMonth()->toDateString());

        $pendapatan = $this->agregatPeriode('pendapatan', $start, $end);
        $beban = $this->agregatPeriode('beban', $start, $end);

        $totalPendapatan = array_sum(array_column($pendapatan, 'saldo'));
        $totalBeban = array_sum(array_column($beban, 'saldo'));
        $labaBersih = $totalPendapatan - $totalBeban;

        return response()->json(compact('pendapatan', 'beban', 'totalPendapatan', 'totalBeban', 'labaBersih', 'start', 'end'));
    }

    public function exportLabaRugi(Request $request): StreamedResponse
    {
        $start = $request->input('dari', now()->startOfMonth()->toDateString());
        $end = $request->input('sampai', now()->endOfMonth()->toDateString());

        $pendapatan = $this->agregatPeriode('pendapatan', $start, $end);
        $beban = $this->agregatPeriode('beban', $start, $end);

        $totalPendapatan = array_sum(array_column($pendapatan, 'saldo'));
        $totalBeban = array_sum(array_column($beban, 'saldo'));
        $labaBersih = $totalPendapatan - $totalBeban;

        $rows = array_map(
            fn ($item) => [
                $item['akun']['kode'],
                $item['akun']['nama'],
                $item['akun']['kategori'] ?? '',
                'Pendapatan',
                (float) $item['saldo'],
            ],
            $pendapatan,
        );

        $rows[] = ['', 'Total Pendapatan', '', 'Pendapatan', (float) $totalPendapatan];

        foreach ($beban as $item) {
            $rows[] = [
                $item['akun']['kode'],
                $item['akun']['nama'],
                $item['akun']['kategori'] ?? '',
                'Beban',
                (float) $item['saldo'],
            ];
        }

        $rows[] = ['', 'Total Beban', '', 'Beban', (float) $totalBeban];
        $rows[] = ['', $labaBersih >= 0 ? 'Laba Bersih' : 'Rugi Bersih', '', '', (float) abs($labaBersih)];

        return ExcelExportService::download(
            'laba-rugi-'.now()->format('Y-m-d').'.xlsx',
            ['Kode', 'Nama Akun', 'Kategori', 'Jenis', 'Saldo'],
            $rows,
            ['E' => '#,##0.00'],
        );
    }

    public function labaRugiPakanCurah(Request $request): JsonResponse
    {
        $start = $request->input('dari', now()->startOfMonth()->toDateString());
        $end = $request->input('sampai', now()->endOfMonth()->toDateString());

        $barangCurahIds = Barang::whereHas(
            'jenisBarang',
            fn ($q) => $q->where('nama', 'Pakan Curah'),
        )->pluck('id');

        // Detail penjualan dan penjualan_retur barang curah dalam periode
        $details = DetailTransaksi::with(['barang', 'transaksi'])
            ->whereIn('barang_id', $barangCurahIds)
            ->whereHas('transaksi', function ($q) use ($start, $end): void {
                $q->whereIn('tipe_transaksi', ['penjualan', 'penjualan_retur'])
                    ->whereBetween('tanggal', [$start, $end]);
                $this->scopeKepemilikan($q);
            })
            ->get();

        $fifo = new FifoStockService;

        /** @var array<int, array{kode: string, nama: string, qty: float, penjualan: float, hpp: float}> $perBarang */
        $perBarang = [];

        foreach ($details as $detail) {
            $id = $detail->barang_id;
            $tipe = $detail->transaksi?->tipe_transaksi;
            $sign = $tipe === 'penjualan_retur' ? -1 : 1;

            if (! isset($perBarang[$id])) {
                $perBarang[$id] = [
                    'kode' => $detail->barang?->kode_barang ?? '-',
                    'nama' => $detail->barang?->nama_barang ?? '-',
                    'qty' => 0.0,
                    'penjualan' => 0.0,
                    'hpp' => 0.0,
                ];
            }

            $perBarang[$id]['qty'] += $sign * (float) $detail->kuantitas;
            $perBarang[$id]['penjualan'] += $sign * (float) $detail->subtotal;

            if ($tipe === 'penjualan') {
                $hpp = (float) StokBatchUsage::where('detail_transaksi_id', $detail->id)->sum('subtotal');
            } else {
                $hpp = $fifo->hppSalesReturn($detail);
            }

            $perBarang[$id]['hpp'] += $sign * $hpp;
        }

        ksort($perBarang);
        $perBarang = array_values($perBarang);

        $totalPenjualan = array_sum(array_column($perBarang, 'penjualan'));
        $totalHpp = array_sum(array_column($perBarang, 'hpp'));
        $labaKotor = $totalPenjualan - $totalHpp;

        // Nilai stok curah per tanggal akhir periode
        $akunStok = Akun::system('stok_pakan_curah');
        $nominalStok = $akunStok ? $this->saldoAkhir($akunStok, $end) : 0.0;
        $qtyStok = (float) Barang::whereIn('id', $barangCurahIds)->sum('stok');

        $stok = ['qty' => $qtyStok, 'nominal' => $nominalStok];

        return response()->json(compact('perBarang', 'totalPenjualan', 'totalHpp', 'labaKotor', 'stok', 'start', 'end'));
    }

    public function exportLabaRugiPakanCurah(Request $request): StreamedResponse
    {
        $start = $request->input('dari', now()->startOfMonth()->toDateString());
        $end = $request->input('sampai', now()->endOfMonth()->toDateString());

        $barangCurahIds = Barang::whereHas(
            'jenisBarang',
            fn ($q) => $q->where('nama', 'Pakan Curah'),
        )->pluck('id');

        $details = DetailTransaksi::with(['barang', 'transaksi'])
            ->whereIn('barang_id', $barangCurahIds)
            ->whereHas('transaksi', function ($q) use ($start, $end): void {
                $q->whereIn('tipe_transaksi', ['penjualan', 'penjualan_retur'])
                    ->whereBetween('tanggal', [$start, $end]);
                $this->scopeKepemilikan($q);
            })
            ->get();

        $fifo = new FifoStockService;

        /** @var array<int, array{kode: string, nama: string, qty: float, penjualan: float, hpp: float}> $perBarang */
        $perBarang = [];

        foreach ($details as $detail) {
            $id = $detail->barang_id;
            $tipe = $detail->transaksi?->tipe_transaksi;
            $sign = $tipe === 'penjualan_retur' ? -1 : 1;

            if (! isset($perBarang[$id])) {
                $perBarang[$id] = [
                    'kode' => $detail->barang?->kode_barang ?? '-',
                    'nama' => $detail->barang?->nama_barang ?? '-',
                    'qty' => 0.0,
                    'penjualan' => 0.0,
                    'hpp' => 0.0,
                ];
            }

            $perBarang[$id]['qty'] += $sign * (float) $detail->kuantitas;
            $perBarang[$id]['penjualan'] += $sign * (float) $detail->subtotal;

            if ($tipe === 'penjualan') {
                $hpp = (float) StokBatchUsage::where('detail_transaksi_id', $detail->id)->sum('subtotal');
            } else {
                $hpp = $fifo->hppSalesReturn($detail);
            }

            $perBarang[$id]['hpp'] += $sign * $hpp;
        }

        ksort($perBarang);
        $perBarang = array_values($perBarang);

        $totalPenjualan = array_sum(array_column($perBarang, 'penjualan'));
        $totalHpp = array_sum(array_column($perBarang, 'hpp'));
        $labaKotor = $totalPenjualan - $totalHpp;

        $akunStok = Akun::system('stok_pakan_curah');
        $nominalStok = $akunStok ? $this->saldoAkhir($akunStok, $end) : 0.0;
        $qtyStok = (float) Barang::whereIn('id', $barangCurahIds)->sum('stok');

        $rows = [];

        $rows[] = ['', 'Periode', '', $start.' s/d '.$end, ''];
        $rows[] = ['', 'Total Penjualan Curah', '', '', $totalPenjualan];
        $rows[] = ['', 'Total HPP Curah', '', '', $totalHpp];
        $rows[] = ['', 'Laba Kotor Curah', '', '', $labaKotor];
        $rows[] = ['', 'Nilai Stok Curah (nominal)', '', '', $nominalStok];
        $rows[] = ['', 'Qty Stok Curah (kg)', '', (string) $qtyStok, ''];
        $rows[] = ['', '', '', '', ''];
        $rows[] = ['Kode', 'Nama Barang', 'Qty', 'Penjualan', 'HPP'];

        foreach ($perBarang as $b) {
            $rows[] = [$b['kode'], $b['nama'], $b['qty'], $b['penjualan'], $b['hpp']];
        }

        $rows[] = ['', 'TOTAL', array_sum(array_column($perBarang, 'qty')), $totalPenjualan, $totalHpp];

        return ExcelExportService::download(
            'laba-rugi-pakan-curah-'.now()->format('Y-m-d').'.xlsx',
            ['Kode', 'Nama Barang', 'Qty', 'Penjualan', 'HPP'],
            $rows,
            ['D' => '#,##0.00', 'E' => '#,##0.00'],
        );
    }

    protected function saldoAkhir(Akun $akun, string $tanggal): float
    {
        return $this->saldoAkun->saldoAkhir($akun, $tanggal);
    }

    protected function saldoAkhirSebelum(Akun $akun, string $tanggal): float
    {
        return $this->saldoAkun->saldoAkhirSebelum($akun, $tanggal);
    }

    protected function agregatPeriode(string $jenis, string $start, string $end): array
    {
        $result = [];

        $akuns = Akun::with('kategori')
            ->whereHas('kategori', fn ($q) => $q->where('jenis', $jenis))
            ->where('status', 'aktif')
            ->where('nama', '!=', 'Saldo Bp.Supriyadi')
            ->where(fn ($q) => $q->whereNull('system_code')
                ->orWhereNotIn('system_code', self::CURAH_SYSTEM_CODES))
            ->orderBy('kode')
            ->get();

        foreach ($akuns as $akun) {
            $rows = JurnalDetail::where('akun_id', $akun->id)
                ->whereHas('jurnal', function ($q) use ($start, $end): void {
                    $q->whereBetween('tanggal', [$start, $end]);
                    $this->scopeKepemilikan($q);
                })
                ->get();

            $debit = (float) $rows->sum('debit');
            $kredit = (float) $rows->sum('kredit');

            if ($akun->saldo_normal === 'debit') {
                $saldo = $debit - $kredit;
            } else {
                $saldo = $kredit - $debit;
            }

            $result[] = [
                'akun' => [
                    'id' => $akun->id,
                    'kode' => $akun->kode,
                    'nama' => $akun->nama,
                    'kategori' => $akun->kategori?->nama,
                ],
                'debit' => $debit,
                'kredit' => $kredit,
                'saldo' => $saldo,
            ];
        }

        return $result;
    }
}
