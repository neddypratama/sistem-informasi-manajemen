<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Barang;
use App\Models\DetailTransaksi;
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
    ];

    /**
     * Label tipe transaksi untuk tampilan & export.
     *
     * @var array<string, string>
     */
    private const LABEL_TIPE = [
        'pembelian' => 'Pembelian',
        'penjualan' => 'Penjualan',
        'pembelian_retur' => 'Retur Pembelian',
        'penjualan_retur' => 'Retur Penjualan',
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
        $semua = DetailTransaksi::query()
            ->where('barang_id', $barang->id)
            ->with(['transaksi:id,tipe_transaksi,tanggal,nomor_transaksi,client_id', 'transaksi.client:id,nama'])
            ->get()
            ->filter(fn (DetailTransaksi $detail) => $detail->transaksi !== null)
            ->sortBy(fn (DetailTransaksi $detail) => [
                $detail->transaksi->tanggal->toDateString(),
                $detail->transaksi->id,
            ])
            ->values();

        $saldo = (float) $barang->stok - (float) $semua->sum(fn ($detail) => $this->qtyBertanda($detail));
        $saldoSebelumDari = $saldo;
        $baris = collect();
        $totalNilai = 0.0;

        foreach ($semua as $detail) {
            $tanggal = $detail->transaksi->tanggal->toDateString();

            if ($dari !== '' && $tanggal < $dari) {
                $saldoSebelumDari += $this->qtyBertanda($detail);
            }

            $saldoSebelum = $saldo;
            $saldo += $this->qtyBertanda($detail);

            $cocok = ($tipe === null || $detail->transaksi->tipe_transaksi === $tipe)
                && ($dari === '' || $tanggal >= $dari)
                && ($sampai === '' || $tanggal <= $sampai);

            if (! $cocok) {
                continue;
            }

            $totalNilai += (float) $detail->subtotal;

            $baris->push($this->payloadBaris($detail, $saldoSebelum, $saldo));
        }

        if ($order === 'desc') {
            $baris = $baris->reverse();
        }

        return [$baris->values(), $totalNilai, $saldoSebelumDari];
    }

    /**
     * Kuantitas bertanda: positif untuk transaksi yang menambah stok.
     */
    private function qtyBertanda(DetailTransaksi $detail): float
    {
        return (self::ARAH_QTY[$detail->transaksi->tipe_transaksi] ?? 0) * (float) $detail->kuantitas;
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadBaris(DetailTransaksi $detail, float $saldoSebelum, float $saldo): array
    {
        $transaksi = $detail->transaksi;
        $qty = $this->qtyBertanda($detail);

        return [
            'id' => $detail->id,
            'transaksi_id' => $detail->transaksi_id,
            'tanggal' => $transaksi->tanggal->toDateString(),
            'nomor' => $transaksi->nomor_transaksi,
            'tipe' => $transaksi->tipe_transaksi,
            'tipe_label' => self::LABEL_TIPE[$transaksi->tipe_transaksi] ?? $transaksi->tipe_transaksi,
            'client' => $transaksi->client?->nama,
            'kuantitas' => (float) $detail->kuantitas,
            'qty' => $qty,
            'arah' => $qty >= 0 ? 'masuk' : 'keluar',
            'harga' => (float) $detail->harga,
            'subtotal' => (float) $detail->subtotal,
            'saldo_sebelum' => $saldoSebelum,
            'saldo' => $saldo,
        ];
    }
}
