<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use App\Models\DetailTransaksi;
use App\Models\StokOpnameDetail;
use App\Services\ExcelExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StokRiwayatController extends Controller
{
    /**
     * Arah perubahan stok untuk tiap tipe transaksi (positif = masuk).
     *
     * @var array<string, int>
     */
    private const ARAH_QTY = [
        'pembelian' => 1,
        'penjualan' => -1,
        'pembelian_retur' => -1,
        'penjualan_retur' => 1,
        'stok_opname' => 1,
    ];

    private const LABEL_TIPE = [
        'pembelian' => 'Pembelian',
        'penjualan' => 'Penjualan',
        'pembelian_retur' => 'Retur Pembelian',
        'penjualan_retur' => 'Retur Penjualan',
        'stok_opname' => 'Stok Opname',
    ];

    /**
     * Daftar barang yang bisa dibuka riwayat transaksinya.
     */
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));
        $kelompok = $request->query('kelompok');
        $tipe = $this->tipeValid($request);

        [$sort, $order] = $this->sortParams(
            ['nama_barang', 'kode_barang', 'stok', 'created_at'],
            'nama_barang',
            'asc',
        );

        $barangs = Barang::with('jenisBarang')
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
            ->when(
                $tipe !== null,
                fn ($query) => $query->whereHas(
                    'detailTransaksis.transaksi',
                    fn ($transaksi) => $transaksi->where('tipe_transaksi', $tipe),
                ),
            )
            ->orderBy($sort, $order)
            ->paginate(15);

        return response()->json($barangs);
    }

    /**
     * Detail mutasi stok satu barang: saldo berjalan per transaksi dan
     * total nilai dari seluruh hasil filter (bukan hanya halaman aktif).
     */
    public function show(Barang $barang, Request $request): JsonResponse
    {
        $tipe = $this->tipeValid($request);
        $dari = trim((string) $request->query('dari'));
        $sampai = trim((string) $request->query('sampai'));
        $order = $request->query('order') === 'desc' ? 'desc' : 'asc';

        [$baris, $totalNilai, $saldoSebelumDari] = $this->mutasiBarang($barang, $tipe, $dari, $sampai, $order);

        $page = max(1, (int) $request->query('page', 1));
        $perPage = 15;
        $halaman = $baris->forPage($page, $perPage)->values();

        $paginator = new LengthAwarePaginator(
            $halaman,
            $baris->count(),
            $perPage,
            $page,
            ['path' => Paginator::resolveCurrentPath(), 'pageName' => 'page'],
        );

        $saldoAwal = $halaman->first()['saldo_sebelum']
            ?? ($dari !== '' ? $saldoSebelumDari : (float) $barang->stok);

        return response()->json(array_merge($paginator->toArray(), [
            'barang' => [
                'id' => $barang->id,
                'kode_barang' => $barang->kode_barang,
                'nama_barang' => $barang->nama_barang,
                'satuan' => $barang->satuan,
                'stok' => (float) $barang->stok,
            ],
            'saldo_awal' => (float) $saldoAwal,
            'total_nilai' => $totalNilai,
        ]));
    }

    /**
     * Export riwayat stok satu barang (mutasi + saldo berjalan + baris total).
     */
    public function export(Barang $barang, Request $request): StreamedResponse
    {
        $tipe = $this->tipeValid($request);
        $dari = trim((string) $request->query('dari'));
        $sampai = trim((string) $request->query('sampai'));

        [$baris, $totalNilai] = $this->mutasiBarang($barang, $tipe, $dari, $sampai, 'asc');

        $rows = $baris->map(fn (array $baris) => [
            $baris['tanggal'],
            $baris['nomor'],
            $baris['tipe_label'],
            $baris['client'] ?? '',
            $baris['qty'],
            $baris['harga'],
            $baris['subtotal'],
            $baris['saldo'],
        ])->values();

        $rows->push([
            '',
            'Total',
            '',
            '',
            '',
            '',
            $totalNilai,
            $baris->isEmpty() ? (float) $barang->stok : (float) $baris->last()['saldo'],
        ]);

        $kode = preg_replace('/[^A-Za-z0-9_-]/', '-', (string) $barang->kode_barang);

        return ExcelExportService::download(
            'riwayat-stok-'.$kode.'-'.now()->format('Y-m-d').'.xlsx',
            ['Tanggal', 'Nomor', 'Tipe', 'Client', 'Qty', 'Harga', 'Subtotal', 'Saldo'],
            $rows,
            ['E' => '#,##0.00', 'F' => '#,##0.00', 'G' => '#,##0.00', 'H' => '#,##0.00'],
        );
    }

    /**
     * Nilai tipe transaksi yang valid dari query string, atau null (semua tipe).
     */
    private function tipeValid(Request $request): ?string
    {
        $tipe = $request->query('tipe');

        return is_string($tipe) && array_key_exists($tipe, self::ARAH_QTY) ? $tipe : null;
    }

    /**
     * Susun seluruh mutasi stok barang secara kronologis dengan saldo berjalan.
     *
     * Saldo dihitung dari seluruh transaksi (tanpa filter) agar tetap konsisten
     * dengan stok nyata; filter hanya menentukan baris yang ditampilkan.
     *
     * @return array{0: Collection<int, array<string, mixed>>, 1: float, 2: float}
     *                                                                             [baris tampil, total nilai, saldo sebelum filter tanggal]
     */
    private function mutasiBarang(Barang $barang, ?string $tipe, string $dari, string $sampai, string $order): array
    {
        $transaksis = DetailTransaksi::query()
            ->where('barang_id', $barang->id)
            ->with(['transaksi:id,tipe_transaksi,tanggal,nomor_transaksi,client_id,created_at', 'transaksi.client:id,nama'])
            ->get()
            ->filter(fn (DetailTransaksi $detail) => $detail->transaksi !== null)
            ->map(function (DetailTransaksi $detail) {
                $qty = (self::ARAH_QTY[$detail->transaksi->tipe_transaksi] ?? 0) * (float) $detail->kuantitas;

                return [
                    'id' => 'tx-'.$detail->id,
                    'transaksi_id' => $detail->transaksi_id,
                    'tanggal' => $detail->transaksi->tanggal->toDateString(),
                    'created_at' => $detail->transaksi->created_at ?? $detail->created_at,
                    'nomor' => $detail->transaksi->nomor_transaksi,
                    'tipe' => $detail->transaksi->tipe_transaksi,
                    'tipe_label' => self::LABEL_TIPE[$detail->transaksi->tipe_transaksi] ?? $detail->transaksi->tipe_transaksi,
                    'client' => $detail->transaksi->client?->nama,
                    'kuantitas' => (float) $detail->kuantitas,
                    'qty' => $qty,
                    'harga' => (float) $detail->harga,
                    'subtotal' => (float) $detail->subtotal,
                ];
            });

        $opnames = StokOpnameDetail::query()
            ->where('barang_id', $barang->id)
            ->whereHas('stokOpname', fn ($q) => $q->where('status', 'selesai'))
            ->with('stokOpname:id,no_opname,tanggal,created_at')
            ->get()
            ->filter(fn ($detail) => $detail->stokOpname !== null)
            ->map(function ($detail) {
                $selisih = (float) $detail->selisih;

                return [
                    'id' => 'op-'.$detail->id,
                    'transaksi_id' => null,
                    'tanggal' => $detail->stokOpname->tanggal->toDateString(),
                    'created_at' => $detail->stokOpname->created_at ?? $detail->created_at,
                    'nomor' => $detail->stokOpname->no_opname,
                    'tipe' => 'stok_opname',
                    'tipe_label' => 'Stok Opname',
                    'client' => 'Opname '.$detail->stokOpname->no_opname,
                    'kuantitas' => abs($selisih),
                    'qty' => $selisih,
                    'harga' => (float) $detail->harga_satuan,
                    'subtotal' => abs((float) $detail->nilai_selisih),
                ];
            });

        $semua = $transaksis->concat($opnames)
            ->sortBy(fn ($item) => [$item['tanggal'], (string) $item['created_at'], $item['id']])
            ->values();

        $saldo = (float) $barang->stok - (float) $semua->sum('qty');
        $saldoSebelumDari = $saldo;
        $baris = collect();
        $totalNilai = 0.0;

        foreach ($semua as $item) {
            $tanggal = $item['tanggal'];

            if ($dari !== '' && $tanggal < $dari) {
                $saldoSebelumDari += $item['qty'];
            }

            $saldoSebelum = $saldo;
            $saldo += $item['qty'];

            $cocok = ($tipe === null || $item['tipe'] === $tipe)
                && ($dari === '' || $tanggal >= $dari)
                && ($sampai === '' || $tanggal <= $sampai);

            if (! $cocok) {
                continue;
            }

            $totalNilai += (float) $item['subtotal'];

            $baris->push(array_merge($item, [
                'arah' => $item['qty'] >= 0 ? 'masuk' : 'keluar',
                'saldo_sebelum' => $saldoSebelum,
                'saldo' => $saldo,
            ]));
        }

        if ($order === 'desc') {
            $baris = $baris->reverse();
        }

        return [$baris->values(), $totalNilai, $saldoSebelumDari];
    }
}
