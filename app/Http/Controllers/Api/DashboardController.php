<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Akun;
use App\Models\Barang;
use App\Models\Client;
use App\Models\Hutang;
use App\Models\JenisBarang;
use App\Models\JurnalDetail;
use App\Models\LogAktivitas;
use App\Models\Piutang;
use App\Models\StokBatch;
use App\Models\Transaksi;
use App\Services\SaldoAkunService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    /**
     * system_code akun HPP Pakan Curah — dikecualikan dari laba kotor agar
     * konsisten dengan Laba Rugi umum yang tidak memuat pakan curah.
     */
    private const HPP_CURAH_SYSTEM_CODE = 'hpp_pakan_curah';

    /**
     * Batas iterasi bucket chart (pengaman rentang custom yang sangat panjang).
     */
    private const BATAS_BUCKET = 120;

    /**
     * Zona waktu batas hari "Hari Ini" dan waktu audit — konsisten dengan
     * zona waktu pengguna aplikasi (WIB).
     */
    private const ZONA_WIB = 'Asia/Jakarta';

    public function __construct(private SaldoAkunService $saldoAkun) {}

    public function index(Request $request): JsonResponse
    {
        $periode = $this->tentukanPeriode($request);
        $dari = $periode['dari'];
        $sampai = $periode['sampai'];

        $penjualan = $this->totalTransaksi('penjualan', $dari, $sampai);
        $pembelian = $this->totalTransaksi('pembelian', $dari, $sampai);

        $spanHari = (int) $dari->diffInDays($sampai) + 1;
        $sebelumDari = $dari->copy()->subDay();
        $sebelumSampai = $sebelumDari->copy()->subDays($spanHari - 1);

        $kpi = [
            'penjualan' => $penjualan,
            'penjualanGrowth' => $this->pertumbuhan(
                $penjualan,
                $this->totalTransaksi('penjualan', $sebelumSampai, $sebelumDari),
            ),
            'pembelian' => $pembelian,
            'pembelianGrowth' => $this->pertumbuhan(
                $pembelian,
                $this->totalTransaksi('pembelian', $sebelumSampai, $sebelumDari),
            ),
            'nilaiPersediaan' => $this->nilaiPersediaan(),
            'jumlahStok' => (float) Barang::sum('stok'),
            ...$this->totalTagihan(Piutang::class, 'piutang'),
            ...$this->totalTagihan(Hutang::class, 'hutang'),
            ...$this->saldoKasBank($sampai),
        ];

        $chart = $this->buatChart($dari, $sampai, $penjualan);
        $arusKas = $this->arusKas($dari, $sampai, $chart['granularity']);

        $periodePayload = [
            'preset' => $periode['preset'],
            'dari' => $dari->toDateString(),
            'sampai' => $sampai->toDateString(),
            'label' => $dari->isSameDay($sampai)
                ? $dari->translatedFormat('d M Y')
                : $dari->translatedFormat('d M Y').' – '.$sampai->translatedFormat('d M Y'),
        ];

        return response()->json([
            'periode' => $periodePayload,
            'kpi' => $kpi,
            'chart' => $chart,
            'arusKas' => $arusKas,
            'aktivitasHariIni' => $this->aktivitasHariIni(),
        ]);
    }

    /**
     * Hari ini menurut batas hari Asia/Jakarta (bukan UTC).
     */
    protected function hariIni(): Carbon
    {
        return now()->setTimezone(self::ZONA_WIB)->startOfDay();
    }

    /**
     * Rentang tanggal dari preset (hari_ini, 7_hari, bulan_ini, tahun_ini, custom).
     *
     * @return array{preset: string, dari: Carbon, sampai: Carbon}
     */
    protected function tentukanPeriode(Request $request): array
    {
        $preset = $request->string('preset')->toString();
        $today = $this->hariIni();

        $default = fn (): array => ['preset' => 'bulan_ini', 'dari' => $today->copy()->startOfMonth(), 'sampai' => $today->copy()->endOfMonth()];

        if ($preset === 'custom') {
            try {
                $dari = Carbon::parse($request->input('dari'))->startOfDay();
                $sampai = Carbon::parse($request->input('sampai'))->startOfDay();

                if ($dari->greaterThan($sampai)) {
                    [$dari, $sampai] = [$sampai, $dari];
                }

                return ['preset' => 'custom', 'dari' => $dari, 'sampai' => $sampai];
            } catch (\Throwable) {
                return $default();
            }
        }

        return match ($preset) {
            'hari_ini' => ['preset' => $preset, 'dari' => $today->copy(), 'sampai' => $today->copy()],
            '7_hari' => ['preset' => $preset, 'dari' => $today->copy()->subDays(6), 'sampai' => $today->copy()],
            'tahun_ini' => ['preset' => $preset, 'dari' => $today->copy()->startOfYear(), 'sampai' => $today->copy()->endOfYear()],
            default => $default(),
        };
    }

    /**
     * Total nilai transaksi satu tipe dalam periode (terfilter kepemilikan).
     */
    protected function totalTransaksi(string $tipe, Carbon $dari, Carbon $sampai): float
    {
        $query = Transaksi::where('tipe_transaksi', $tipe)
            ->whereDate('tanggal', '>=', $dari->toDateString())
            ->whereDate('tanggal', '<=', $sampai->toDateString());

        $this->scopeKepemilikan($query, 'transaksis.created_by');

        return (float) $query->sum('total');
    }

    /**
     * Persentase perubahan terhadap periode sebelumnya; null bila basis 0
     * tetapi nilai sekarang tidak 0 (tidak bisa dipresentasikan).
     */
    protected function pertumbuhan(float $kini, float $sebelum): ?float
    {
        if ($sebelum == 0) {
            return $kini == 0 ? 0.0 : null;
        }

        return round(($kini - $sebelum) / abs($sebelum) * 100, 1);
    }

    protected function nilaiPersediaan(): float
    {
        return (float) StokBatch::where('qty_sisa', '>', 0)
            ->get()
            ->sum(fn (StokBatch $batch) => (float) $batch->qty_sisa * (float) $batch->harga_beli);
    }

    /**
     * Total sisa tagihan belum lunas beserta jumlahnya.
     *
     * @return array<string, float>
     */
    protected function totalTagihan(string $model, string $prefix): array
    {
        $query = $model::query();

        $this->scopeKepemilikan($query);

        $belumLunas = $query->get()->filter(fn ($tagihan) => ! $tagihan->isLunas());

        return [
            $prefix => (float) $belumLunas->sum(fn ($tagihan) => $tagihan->sisa()),
            $prefix.'Jumlah' => $belumLunas->count(),
        ];
    }

    /**
     * Saldo akhir Kas & Bank per akhir periode, beserta label akunnya.
     *
     * @return array<string, float|string>
     */
    protected function saldoKasBank(Carbon $sampai): array
    {
        $akuns = Akun::query()->KasBank()->get()
            ->map(fn (Akun $akun) => [
                'akun' => $akun,
                'saldo' => $this->saldoAkun->saldoAkhir($akun, $sampai->toDateString()),
            ]);

        $total = (float) $akuns->sum('saldo');

        $label = $akuns
            ->filter(fn (array $item) => $item['saldo'] != 0)
            ->map(fn (array $item) => $item['akun']->kategori?->nama ?? $item['akun']->nama)
            ->unique()
            ->take(3)
            ->implode(' • ');

        return [
            'kasBank' => $total,
            'kasBankLabel' => $label !== '' ? $label : 'Kas & Bank',
        ];
    }

    /**
     * Laba kotor penjualan - HPP (tanpa Pakan Curah) dalam periode.
     *
     * @param  array<string, float>  $hppPerTanggal
     */
    protected function labaKotor(array $hppPerTanggal, float $penjualan): array
    {
        $hpp = array_sum($hppPerTanggal);
        $labaKotor = $penjualan - $hpp;
        $margin = $penjualan > 0 ? round($labaKotor / $penjualan * 100, 1) : null;

        return ['labaKotor' => $labaKotor, 'margin' => $margin];
    }

    /**
     * Data chart per bucket: harian bila rentang <= 31 hari, selain itu bulanan.
     *
     * @return array<string, mixed>
     */
    protected function buatChart(Carbon $dari, Carbon $sampai, float $penjualan): array
    {
        $granularity = ((int) $dari->diffInDays($sampai) + 1) <= 31 ? 'harian' : 'bulanan';

        $penjualanPerTanggal = $this->nilaiTransaksiPerTanggal('penjualan', $dari, $sampai);
        $pembelianPerTanggal = $this->nilaiTransaksiPerTanggal('pembelian', $dari, $sampai);
        $hppPerTanggal = $this->hppPerTanggal($dari, $sampai);

        $bucket = $this->buatBucket($dari, $sampai, $granularity, [
            'penjualan' => $penjualanPerTanggal,
            'pembelian' => $pembelianPerTanggal,
            'hpp' => $hppPerTanggal,
        ]);

        $labaKotor = $this->labaKotor($hppPerTanggal, $penjualan);

        return [
            'granularity' => $granularity,
            'labels' => $bucket['labels'],
            'penjualan' => $bucket['seris']['penjualan'],
            'pembelian' => $bucket['seris']['pembelian'],
            'hpp' => $bucket['seris']['hpp'],
            ...$labaKotor,
        ];
    }

    /**
     * Seri per bucket pada rentang periode: harian bila rentang <= 31 hari,
     * selain itu bulanan. Iterasi dibatasi BATAS_BUCKET.
     *
     * @param  array<string, array<string, float>>  $deret
     * @return array{labels: array<int, string>, seris: array<string, array<int, float>>}
     */
    protected function buatBucket(Carbon $dari, Carbon $sampai, string $granularity, array $deret): array
    {
        $labels = [];
        $seris = array_fill_keys(array_keys($deret), []);

        if ($granularity === 'harian') {
            for ($tanggal = $dari->copy(), $i = 0; $tanggal->lte($sampai) && $i < self::BATAS_BUCKET; $tanggal->addDay(), $i++) {
                $key = $tanggal->toDateString();
                $labels[] = $tanggal->translatedFormat('d M');

                foreach ($deret as $nama => $nilai) {
                    $seris[$nama][] = (float) ($nilai[$key] ?? 0.0);
                }
            }
        } else {
            for ($bulan = $dari->copy()->startOfMonth(), $i = 0; $bulan->lte($sampai) && $i < self::BATAS_BUCKET; $bulan->addMonth(), $i++) {
                $prefix = $bulan->format('Y-m');
                $labels[] = $bulan->translatedFormat('M Y');

                foreach ($deret as $nama => $nilai) {
                    $seris[$nama][] = $this->jumlahDenganPrefix($nilai, $prefix);
                }
            }
        }

        return ['labels' => $labels, 'seris' => $seris];
    }

    /**
     * Total nilai transaksi per tanggal dalam periode.
     *
     * @return array<string, float>
     */
    protected function nilaiTransaksiPerTanggal(string $tipe, Carbon $dari, Carbon $sampai): array
    {
        $query = Transaksi::where('tipe_transaksi', $tipe)
            ->whereDate('tanggal', '>=', $dari->toDateString())
            ->whereDate('tanggal', '<=', $sampai->toDateString())
            ->groupBy('tanggal')
            ->selectRaw('tanggal, SUM(total) as total');

        $this->scopeKepemilikan($query, 'transaksis.created_by');

        return $query->get()->mapWithKeys(
            fn (Transaksi $row) => [Carbon::parse($row->tanggal)->toDateString() => (float) $row->total],
        )->all();
    }

    /**
     * HPP per tanggal dari jurnal akun HPP (kategori "HPP ..."), tanpa Pakan
     * Curah. Nilai negatif terjadi saat retur penjualan membalik HPP.
     *
     * @return array<string, float>
     */
    protected function hppPerTanggal(Carbon $dari, Carbon $sampai): array
    {
        $query = JurnalDetail::query()
            ->join('jurnals', 'jurnals.id', '=', 'jurnal_details.jurnal_id')
            ->join('akuns', 'akuns.id', '=', 'jurnal_details.akun_id')
            ->join('kategoris', 'kategoris.id', '=', 'akuns.kategori_id')
            ->whereDate('jurnals.tanggal', '>=', $dari->toDateString())
            ->whereDate('jurnals.tanggal', '<=', $sampai->toDateString())
            ->where(fn ($q) => $q->where('kategoris.nama', 'like', 'HPP%')->orWhere('akuns.system_code', 'hpp'))
            ->where(fn ($q) => $q->whereNull('akuns.system_code')->orWhere('akuns.system_code', '!=', self::HPP_CURAH_SYSTEM_CODE))
            ->groupBy('jurnals.tanggal')
            ->selectRaw('jurnals.tanggal as tanggal, SUM(jurnal_details.debit - jurnal_details.kredit) as hpp');

        $this->scopeKepemilikan($query, 'jurnals.created_by');

        return $query->get()->mapWithKeys(
            fn ($row) => [Carbon::parse($row->tanggal)->toDateString() => (float) $row->hpp],
        )->all();
    }

    /**
     * Arus kas akun Kas & Bank pada periode berjalan: pemasukan = total debit,
     * pengeluaran = total kredit (sumber sama dengan Monitoring Kas), jadi
     * penjualan kredit baru terhitung ketika pembayarannya masuk ke kas.
     * Seri per bucket memakai granularitas chart utama.
     *
     * @return array{pemasukan: float, pengeluaran: float, bersih: float, pemasukanSeries: array<int, float>, pengeluaranSeries: array<int, float>, puncak: ?array{label: string, nilai: float}}
     */
    protected function arusKas(Carbon $dari, Carbon $sampai, string $granularity): array
    {
        $pemasukanPerTanggal = [];
        $pengeluaranPerTanggal = [];

        $akunIds = Akun::query()->KasBank()->pluck('id');

        if ($akunIds->isNotEmpty()) {
            $query = JurnalDetail::query()
                ->join('jurnals', 'jurnals.id', '=', 'jurnal_details.jurnal_id')
                ->whereIn('jurnal_details.akun_id', $akunIds)
                ->whereDate('jurnals.tanggal', '>=', $dari->toDateString())
                ->whereDate('jurnals.tanggal', '<=', $sampai->toDateString())
                ->groupBy('jurnals.tanggal')
                ->selectRaw('jurnals.tanggal as tanggal, SUM(jurnal_details.debit) as debit, SUM(jurnal_details.kredit) as kredit');

            $this->scopeKepemilikan($query, 'jurnals.created_by');

            foreach ($query->get() as $row) {
                $tanggal = Carbon::parse($row->tanggal)->toDateString();
                $pemasukanPerTanggal[$tanggal] = (float) $row->debit;
                $pengeluaranPerTanggal[$tanggal] = (float) $row->kredit;
            }
        }

        $bucket = $this->buatBucket($dari, $sampai, $granularity, [
            'pemasukan' => $pemasukanPerTanggal,
            'pengeluaran' => $pengeluaranPerTanggal,
        ]);

        $pemasukan = array_sum($pemasukanPerTanggal);
        $pengeluaran = array_sum($pengeluaranPerTanggal);

        $puncak = null;
        foreach ($bucket['labels'] as $index => $label) {
            $selisih = $bucket['seris']['pemasukan'][$index] - $bucket['seris']['pengeluaran'][$index];

            if ($selisih > 0 && ($puncak === null || $selisih > $puncak['nilai'])) {
                $puncak = ['label' => $label, 'nilai' => round($selisih, 2)];
            }
        }

        return [
            'pemasukan' => round($pemasukan, 2),
            'pengeluaran' => round($pengeluaran, 2),
            'bersih' => round($pemasukan - $pengeluaran, 2),
            'pemasukanSeries' => array_map(fn (float $nilai) => round($nilai, 2), $bucket['seris']['pemasukan']),
            'pengeluaranSeries' => array_map(fn (float $nilai) => round($nilai, 2), $bucket['seris']['pengeluaran']),
            'puncak' => $puncak,
        ];
    }

    /**
     * Ringkasan aktivitas hari ini dengan batas hari Asia/Jakarta. Kartu ini
     * tidak terikat filter periode dashboard karena judulnya "Hari Ini".
     *
     * @return array<string, mixed>
     */
    protected function aktivitasHariIni(): array
    {
        $hariIni = $this->hariIni();
        $tanggal = $hariIni->toDateString();

        $queryTransaksi = Transaksi::query()->whereDate('tanggal', $tanggal);
        $this->scopeKepemilikan($queryTransaksi, 'transaksis.created_by');

        $auditTerakhir = LogAktivitas::max('created_at');

        return [
            'tanggal' => $tanggal,
            'tanggalLabel' => $hariIni->translatedFormat('d M Y'),
            'transaksi' => [
                'jumlah' => (int) $queryTransaksi->count(),
                'total' => (float) $queryTransaksi->sum('total'),
            ],
            'barangAktif' => (int) Barang::where('status', 'aktif')->count(),
            'clientAktif' => (int) Client::where('status', 'aktif')->count(),
            'hutangLebihBesar' => $this->hutangLebihBesar(),
            'jurnal' => $this->keseimbanganJurnal(),
            'auditTerakhir' => $auditTerakhir
                ? Carbon::parse($auditTerakhir)->setTimezone(self::ZONA_WIB)->format('H:i')
                : null,
        ];
    }

    /**
     * Client dengan sisa hutang lebih besar dari sisa piutang, beserta total
     * selisihnya.
     *
     * @return array{jumlah: int, selisih: float}
     */
    protected function hutangLebihBesar(): array
    {
        $hutang = $this->sisaPerClient(Hutang::class, 'pembayaran_hutangs', 'hutang_id');
        $piutang = $this->sisaPerClient(Piutang::class, 'pembayaran_piutangs', 'piutang_id');

        $jumlah = 0;
        $selisih = 0.0;

        foreach ($hutang as $clientId => $sisaHutang) {
            $sisaPiutang = $piutang[$clientId] ?? 0.0;

            if ($sisaHutang > $sisaPiutang) {
                $jumlah++;
                $selisih += $sisaHutang - $sisaPiutang;
            }
        }

        return ['jumlah' => $jumlah, 'selisih' => round($selisih, 2)];
    }

    /**
     * Sisa tagihan (total - terbayar) per client dalam satu query per model,
     * tanpa N+1 akibat pemanggilan Hutang::sisa()/Piutang::sisa() per baris.
     *
     * @param  class-string<Model>  $model
     * @return array<int, float>
     */
    protected function sisaPerClient(string $model, string $tabelPembayaran, string $kunci): array
    {
        $tabel = $model::query()->getModel()->getTable();

        $query = $model::query()
            ->selectRaw("client_id, total - COALESCE((
                SELECT SUM(p.jumlah) FROM {$tabelPembayaran} p WHERE p.{$kunci} = {$tabel}.id
            ), 0) as sisa")
            ->where('status', '!=', 'lunas')
            ->whereNotNull('client_id');

        $this->scopeKepemilikan($query);

        return $query->get()
            ->groupBy(fn ($row) => (int) $row->client_id)
            ->map(fn ($rows) => round((float) $rows->sum(fn ($row) => (float) $row->sisa), 2))
            ->all();
    }

    /**
     * Jurnal yang tidak seimbang (total debit <> total kredit). Wajib memilih
     * kolom yang dikelompokkan agar lolos only_full_group_by MySQL.
     *
     * @return array{seimbang: bool, tidakSeimbang: int}
     */
    protected function keseimbanganJurnal(): array
    {
        $query = JurnalDetail::query()
            ->join('jurnals', 'jurnals.id', '=', 'jurnal_details.jurnal_id')
            ->select('jurnal_details.jurnal_id')
            ->groupBy('jurnal_details.jurnal_id')
            ->havingRaw('SUM(jurnal_details.debit) <> SUM(jurnal_details.kredit)');

        $this->scopeKepemilikan($query, 'jurnals.created_by');

        $tidakSeimbang = (int) $query->count();

        return ['seimbang' => $tidakSeimbang === 0, 'tidakSeimbang' => $tidakSeimbang];
    }

    /**
     * Detail stok barang per jenis barang: opsi jenis, ringkasan kategori,
     * seri chart seluruh varian, dan baris paginasi. Stok bersifat real-time
     * sehingga tidak mengikuti filter periode dashboard.
     */
    public function stokPerJenis(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jenis_barang_id' => ['nullable', 'integer', Rule::exists('jenis_barang', 'id')->where('status', 'aktif')],
            'per_page' => ['nullable', 'integer', 'in:5,10,25,50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $opsiJenis = JenisBarang::query()
            ->where('status', 'aktif')
            ->withCount(['barangs as varian' => fn ($query) => $query->where('status', 'aktif')])
            ->orderBy('nama')
            ->get();

        $jenisTerpilih = $data['jenis_barang_id'] ?? $opsiJenis->firstWhere('varian', '>', 0)?->id ?? $opsiJenis->first()?->id;
        $terpilih = $jenisTerpilih !== null ? $opsiJenis->firstWhere('id', $jenisTerpilih) : null;
        $opsiPayload = $opsiJenis->map(fn (JenisBarang $jenis) => [
            'id' => $jenis->id,
            'nama' => $jenis->nama,
            'kelompok' => $jenis->kelompok,
            'varian' => (int) $jenis->varian,
        ])->values();

        if ($terpilih === null) {
            return response()->json([
                'jenis' => $opsiPayload,
                'terpilih' => null,
                'chart' => ['items' => []],
                'items' => [],
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => (int) ($data['per_page'] ?? 10),
                'from' => null,
                'to' => null,
                'total' => 0,
            ]);
        }

        $rekap = $this->rekapStokBatch((int) $terpilih->id);
        $semua = Barang::query()
            ->where('jenis_barang_id', $terpilih->id)
            ->where('status', 'aktif')
            ->orderBy('nama_barang')
            ->get()
            ->map(fn (Barang $barang) => $this->barisStok($barang, $rekap->get($barang->id)))
            ->values();

        $totalQty = (float) $semua->sum('qty');
        $totalNilai = (float) $semua->sum('subtotalNilai');
        $satuan = $semua->pluck('satuan')->filter()->unique()->values();

        $perPage = (int) ($data['per_page'] ?? 10);
        $total = $semua->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min(max(1, (int) ($data['page'] ?? 1)), $lastPage);
        $items = $semua->forPage($page, $perPage)->values();
        $from = $total === 0 ? null : ($page - 1) * $perPage + 1;

        return response()->json([
            'jenis' => $opsiPayload,
            'terpilih' => [
                'id' => $terpilih->id,
                'nama' => $terpilih->nama,
                'kelompok' => $terpilih->kelompok,
                'varian' => $total,
                'totalQty' => round($totalQty, 2),
                'totalNilai' => round($totalNilai, 2),
                'satuan' => $satuan->take(2)->implode(' / ').($satuan->count() > 2 ? ' / +'.($satuan->count() - 2) : ''),
                'kondisi' => $totalQty > 0 ? 'Siap Distribusi' : 'Stok Kosong',
            ],
            'chart' => ['items' => $semua],
            'items' => $items,
            'current_page' => $page,
            'last_page' => $lastPage,
            'per_page' => $perPage,
            'from' => $from,
            'to' => $from === null ? null : $from + $items->count() - 1,
            'total' => $total,
        ]);
    }

    /**
     * Qty sisa dan nilai persediaan per barang dari stok batch tersisa.
     *
     * @return Collection<int, StokBatch>
     */
    protected function rekapStokBatch(int $jenisBarangId): Collection
    {
        return StokBatch::query()
            ->join('barangs', 'barangs.id', '=', 'stok_batches.barang_id')
            ->where('barangs.jenis_barang_id', $jenisBarangId)
            ->where('barangs.status', 'aktif')
            ->where('stok_batches.qty_sisa', '>', 0)
            ->groupBy('stok_batches.barang_id')
            ->selectRaw('stok_batches.barang_id as barang_id, SUM(stok_batches.qty_sisa) as qty, SUM(stok_batches.qty_sisa * stok_batches.harga_beli) as nilai')
            ->get()
            ->keyBy(fn ($row) => (int) $row->barang_id);
    }

    /**
     * Satu baris tabel/chart stok. Harga satuan = rata-rata tertimbang batch
     * tersisa (sepadan dengan StokOpnameService::hargaSatuanRataRata) dan
     * subtotal = qty x harga agar kolom tabel konsisten saat dikalikan.
     *
     * @return array<string, float|int|string>
     */
    protected function barisStok(Barang $barang, ?StokBatch $rekap): array
    {
        $qty = (float) ($rekap?->qty ?? 0);
        $nilai = (float) ($rekap?->nilai ?? 0);
        $hargaSatuan = $qty > 0 ? round($nilai / $qty, 2) : 0.0;

        return [
            'barang_id' => $barang->id,
            'kode' => $barang->kode_barang,
            'nama' => $barang->nama_barang,
            'satuan' => $barang->satuan,
            'qty' => round($qty, 2),
            'hargaSatuan' => $hargaSatuan,
            'subtotalNilai' => round($qty * $hargaSatuan, 2),
        ];
    }

    /**
     * @param  array<string, float>  $perTanggal
     */
    protected function jumlahDenganPrefix(array $perTanggal, string $prefix): float
    {
        $total = 0.0;

        foreach ($perTanggal as $tanggal => $nilai) {
            if (str_starts_with($tanggal, $prefix)) {
                $total += $nilai;
            }
        }

        return $total;
    }
}
