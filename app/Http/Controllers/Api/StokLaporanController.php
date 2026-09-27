<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use App\Services\ExcelExportService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Laporan rekap stok per barang pada suatu periode: saldo awal, mutasi
 * pembelian/penjualan/retur (qty + nominal), dan saldo akhir.
 *
 * Seluruh kuantitas dihitung dari `detail_transaksis`; nominal memakai
 * nilai subtotal transaksi. Saldo awal diankarkan ke `barangs.stok` lalu
 * dibalik seluruh riwayat mutasinya (pola yang sama dengan
 * StokRiwayatController::mutasiBarang) sehingga opname tetap ikut terbaca.
 */
class StokLaporanController extends Controller
{
    /**
     * Arah perubahan stok per tipe transaksi (positif = masuk stok).
     *
     * @var array<string, int>
     */
    private const ARAH_QTY = [
        'pembelian' => 1,
        'penjualan' => -1,
        'pembelian_retur' => -1,
        'penjualan_retur' => 1,
    ];

    private const PER_HALAMAN = 15;

    /**
     * Kunci mutasi pada payload baris & total_keseluruhan.
     *
     * @var array<string, string>
     */
    private const KUNCI_MUTASI = [
        'pembelian' => 'pembelian',
        'penjualan' => 'penjualan',
        'retur_pembelian' => 'pembelian_retur',
        'retur_penjualan' => 'penjualan_retur',
    ];

    public function index(Request $request): JsonResponse
    {
        [$dari, $sampai] = $this->periode($request);
        $page = max(1, (int) $request->query('page', 1));

        $rekap = $this->rekapPerBarang($this->queryTerfilter($request), $dari, $sampai);

        $paginator = new LengthAwarePaginator(
            $rekap->forPage($page, self::PER_HALAMAN)->values(),
            $rekap->count(),
            self::PER_HALAMAN,
            $page,
            ['path' => Paginator::resolveCurrentPath(), 'pageName' => 'page'],
        );

        return response()->json(array_merge($paginator->toArray(), [
            'total_keseluruhan' => $this->totalKeseluruhan($rekap),
        ]));
    }

    public function export(Request $request): StreamedResponse
    {
        [$dari, $sampai] = $this->periode($request);

        $rekap = $this->rekapPerBarang($this->queryTerfilter($request), $dari, $sampai);

        $rows = $rekap
            ->map(fn (array $baris) => $this->barisExcel($baris))
            ->values();

        $rows->push($this->barisExcel($this->totalKeseluruhan($rekap), 'Total'));

        return ExcelExportService::download(
            'laporan-stok-'.now()->format('Y-m-d').'.xlsx',
            [
                'Kode', 'Barang', 'Satuan', 'Stok Awal',
                'Pembelian Qty', 'Pembelian Nilai',
                'Penjualan Qty', 'Penjualan Nilai',
                'Retur Pembelian Qty', 'Retur Pembelian Nilai',
                'Retur Penjualan Qty', 'Retur Penjualan Nilai',
                'Stok Akhir',
            ],
            $rows,
            [
                'D' => '#,##0.00', 'E' => '#,##0.00', 'F' => '#,##0.00',
                'G' => '#,##0.00', 'H' => '#,##0.00', 'I' => '#,##0.00',
                'J' => '#,##0.00', 'K' => '#,##0.00', 'L' => '#,##0.00',
                'M' => '#,##0.00',
            ],
        );
    }

    /**
     * Susun rekap seluruh barang terfilter, diurutkan nama barang.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function rekapPerBarang(Builder $query, ?string $dari, ?string $sampai): Collection
    {
        $barangs = $query->orderBy('nama_barang')->get();

        if ($barangs->isEmpty()) {
            return collect();
        }

        $ids = $barangs->pluck('id');
        $saldoSeluruh = $this->saldoBertanda($ids, null);

        // Tanpa batas awal periode, seluruh riwayat dianggap di dalam periode
        // sehingga saldo awalnya stok sebelum mutasi pertama dan stok akhirnya
        // sama dengan stok nyata.
        $saldoSebelum = $dari === null ? collect() : $this->saldoBertanda($ids, $dari);
        $periode = $this->mutasiPeriode($ids, $dari, $sampai);

        return $barangs
            ->map(fn (Barang $barang): array => $this->baris(
                $barang,
                (float) $saldoSeluruh->get($barang->id, 0),
                (float) $saldoSebelum->get($barang->id, 0),
                $periode->get($barang->id, []),
            ))
            ->keyBy('barang_id');
    }

    /**
     * Total kuantitas bertanda per barang (positif = masuk stok).
     *
     * @param  Collection<int, int>  $barangIds
     * @param  string|null  $batasTanggal  Hanya baris dengan tanggal sebelum nilai ini.
     * @return Collection<int, float|string>
     */
    private function saldoBertanda(Collection $barangIds, ?string $batasTanggal): Collection
    {
        return DB::table('detail_transaksis as d')
            ->join('transaksis as t', 't.id', '=', 'd.transaksi_id')
            ->whereIn('d.barang_id', $barangIds)
            ->when($batasTanggal, fn ($q) => $q->whereDate('t.tanggal', '<', $batasTanggal))
            ->groupBy('d.barang_id')
            ->selectRaw(
                'd.barang_id, SUM(CASE WHEN t.tipe_transaksi IN (?, ?) THEN d.kuantitas ELSE -d.kuantitas END) as saldo',
                ['pembelian', 'penjualan_retur'],
            )
            ->pluck('saldo', 'barang_id');
    }

    /**
     * Qty & nominal mutasi per tipe transaksi di dalam periode, dikelompokan
     * per barang lalu per tipe.
     *
     * @param  Collection<int, int>  $barangIds
     * @return Collection<int, array<string, array{qty: float, nilai: float}>>
     */
    private function mutasiPeriode(Collection $barangIds, ?string $dari, ?string $sampai): Collection
    {
        return DB::table('detail_transaksis as d')
            ->join('transaksis as t', 't.id', '=', 'd.transaksi_id')
            ->whereIn('d.barang_id', $barangIds)
            ->when($dari, fn ($q) => $q->whereDate('t.tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->whereDate('t.tanggal', '<=', $sampai))
            ->groupBy('d.barang_id', 't.tipe_transaksi')
            ->selectRaw('d.barang_id, t.tipe_transaksi, SUM(d.kuantitas) as qty, SUM(d.subtotal) as nilai')
            ->get()
            ->groupBy(fn ($row) => (int) $row->barang_id)
            ->map(fn (Collection $rows) => $rows->mapWithKeys(fn ($row) => [
                $row->tipe_transaksi => ['qty' => (float) $row->qty, 'nilai' => (float) $row->nilai],
            ])->all());
    }

    /**
     * Satu baris rekap: saldo awal, empat mutasi, dan saldo akhir.
     *
     * @param  array<string, array{qty: float, nilai: float}>  $periode
     * @return array<string, mixed>
     */
    private function baris(Barang $barang, float $saldoSeluruh, float $saldoSebelum, array $periode): array
    {
        $saldoAwal = (float) $barang->stok - $saldoSeluruh + $saldoSebelum;
        $qtyBertanda = 0.0;

        $mutasi = [];

        foreach (self::ARAH_QTY as $tipe => $arah) {
            $nilai = $periode[$tipe] ?? ['qty' => 0.0, 'nilai' => 0.0];
            $mutasi[$tipe] = $nilai;
            $qtyBertanda += $arah * $nilai['qty'];
        }

        return [
            'barang_id' => $barang->id,
            'kode' => $barang->kode_barang,
            'nama' => $barang->nama_barang,
            'satuan' => $barang->satuan,
            'stok_awal' => $saldoAwal,
            'pembelian' => $mutasi['pembelian'],
            'penjualan' => $mutasi['penjualan'],
            'retur_pembelian' => $mutasi['pembelian_retur'],
            'retur_penjualan' => $mutasi['penjualan_retur'],
            'stok_akhir' => $saldoAwal + $qtyBertanda,
        ];
    }

    /**
     * Penjumlahan seluruh baris rekap untuk footer & baris Total export.
     *
     * @param  Collection<int, array<string, mixed>>  $rekap
     * @return array<string, mixed>
     */
    private function totalKeseluruhan(Collection $rekap): array
    {
        $total = [
            'stok_awal' => 0.0,
            'pembelian' => ['qty' => 0.0, 'nilai' => 0.0],
            'penjualan' => ['qty' => 0.0, 'nilai' => 0.0],
            'retur_pembelian' => ['qty' => 0.0, 'nilai' => 0.0],
            'retur_penjualan' => ['qty' => 0.0, 'nilai' => 0.0],
            'stok_akhir' => 0.0,
        ];

        foreach ($rekap as $baris) {
            $total['stok_awal'] += $baris['stok_awal'];
            $total['stok_akhir'] += $baris['stok_akhir'];

            foreach (array_keys(self::KUNCI_MUTASI) as $kunci) {
                $total[$kunci]['qty'] += $baris[$kunci]['qty'];
                $total[$kunci]['nilai'] += $baris[$kunci]['nilai'];
            }
        }

        return $total;
    }

    /**
     * Satu baris export Excel, urut kolom sama seperti header.
     *
     * @param  array<string, mixed>  $baris
     * @return array<int, mixed>
     */
    private function barisExcel(array $baris, string $nama = ''): array
    {
        return [
            $baris['kode'] ?? '',
            $nama !== '' ? $nama : $baris['nama'],
            $baris['satuan'] ?? '',
            $baris['stok_awal'],
            $baris['pembelian']['qty'],
            $baris['pembelian']['nilai'],
            $baris['penjualan']['qty'],
            $baris['penjualan']['nilai'],
            $baris['retur_pembelian']['qty'],
            $baris['retur_pembelian']['nilai'],
            $baris['retur_penjualan']['qty'],
            $baris['retur_penjualan']['nilai'],
            $baris['stok_akhir'],
        ];
    }

    /**
     * Batas periode laporan, null tanpa batas.
     *
     * @return array{0: ?string, 1: ?string}
     */
    private function periode(Request $request): array
    {
        $dari = trim((string) $request->query('dari'));
        $sampai = trim((string) $request->query('sampai'));

        return [$dari !== '' ? $dari : null, $sampai !== '' ? $sampai : null];
    }

    /**
     * Query barang terfilter (tanpa sorting) agar index dan export memakai
     * sumber filter yang sama.
     *
     * @return Builder<Barang>
     */
    private function queryTerfilter(Request $request): Builder
    {
        $search = trim((string) $request->query('search'));
        $kelompok = $request->query('kelompok');
        $status = $request->query('status');

        return Barang::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('nama_barang', 'like', "%{$search}%")
                        ->orWhere('kode_barang', 'like', "%{$search}%")
                        ->orWhereHas('jenisBarang', fn ($j) => $j->where('nama', 'like', "%{$search}%"));
                });
            })
            ->when(
                is_string($kelompok) && in_array($kelompok, ['telur', 'pakan', 'obat', 'tray'], true),
                fn ($query) => $query->whereHas('jenisBarang', fn ($j) => $j->where('kelompok', $kelompok)),
            )
            ->when(is_string($status) && $status !== '', fn ($query) => $query->where('status', $status));
    }
}
