<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Jurnal;
use App\Services\ExcelExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TagihanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));

        $createdByFilter = '';
        $bindings = [];

        if (! auth()->user()?->bisaMelihatSemuaData()) {
            $createdByFilter = 'AND j.created_by = ?';
            $bindings[] = auth()->id();
        }

        $searchFilter = '';
        if ($search !== '') {
            $searchFilter = 'AND (c.nama LIKE ? OR c.no_telepon LIKE ? OR c.alamat LIKE ?)';
            $bindings[] = "%{$search}%";
            $bindings[] = "%{$search}%";
            $bindings[] = "%{$search}%";
        }

        $sql = "
            SELECT 
                c.id as client_id,
                c.nama as client_nama,
                COALESCE(SUM(CASE WHEN t.entitas_type = 'hutang' THEN t.total ELSE 0 END), 0) as total_hutang,
                COALESCE(SUM(CASE WHEN t.entitas_type = 'hutang' THEN t.sisa ELSE 0 END), 0) as sisa_hutang,
                COALESCE(SUM(CASE WHEN t.entitas_type = 'hutang' AND t.sisa > 0.001 THEN 1 ELSE 0 END), 0) as jumlah_hutang,
                COALESCE(SUM(CASE WHEN t.entitas_type = 'piutang' THEN t.total ELSE 0 END), 0) as total_piutang,
                COALESCE(SUM(CASE WHEN t.entitas_type = 'piutang' THEN t.sisa ELSE 0 END), 0) as sisa_piutang,
                COALESCE(SUM(CASE WHEN t.entitas_type = 'piutang' AND t.sisa > 0.001 THEN 1 ELSE 0 END), 0) as jumlah_piutang
            FROM (
                SELECT 
                    j.client_id,
                    j.entitas_type,
                    j.id,
                    COALESCE(SUM(CASE 
                        WHEN j.entitas_type = 'hutang' AND (a.system_code = 'hutang' OR k.jenis = 'liabilitas') THEN jd.kredit 
                        WHEN j.entitas_type = 'piutang' AND (a.system_code = 'piutang' OR k.jenis = 'aset') THEN jd.debit 
                        ELSE 0 
                    END), 0) as total,
                    (
                        COALESCE(SUM(CASE 
                            WHEN j.entitas_type = 'hutang' AND (a.system_code = 'hutang' OR k.jenis = 'liabilitas') THEN jd.kredit 
                            WHEN j.entitas_type = 'piutang' AND (a.system_code = 'piutang' OR k.jenis = 'aset') THEN jd.debit 
                            ELSE 0 
                        END), 0) -
                        COALESCE((
                            SELECT SUM(CASE 
                                WHEN j.entitas_type = 'hutang' AND (pa.system_code = 'hutang' OR pk.jenis = 'liabilitas') THEN pjd.debit 
                                WHEN j.entitas_type = 'piutang' AND (pa.system_code = 'piutang' OR pk.jenis = 'aset') THEN pjd.kredit 
                                ELSE 0 
                            END)
                            FROM jurnals pj
                            JOIN jurnal_details pjd ON pjd.jurnal_id = pj.id
                            LEFT JOIN akuns pa ON pa.id = pjd.akun_id
                            LEFT JOIN kategoris pk ON pk.id = pa.kategori_id
                            WHERE pj.journalable_type = 'App\\\\Models\\\\Jurnal' AND pj.journalable_id = j.id
                        ), 0) -
                        COALESCE((
                            SELECT SUM(CASE 
                                WHEN j.entitas_type = 'hutang' AND (ra.system_code = 'hutang' OR rk.jenis = 'liabilitas') THEN rjd.debit 
                                WHEN j.entitas_type = 'piutang' AND (ra.system_code = 'piutang' OR rk.jenis = 'aset') THEN rjd.kredit 
                                ELSE 0 
                            END)
                            FROM transaksis ret
                            JOIN jurnals rj ON rj.journalable_type = 'App\\\\Models\\\\Transaksi' AND rj.journalable_id = ret.id
                            JOIN jurnal_details rjd ON rjd.jurnal_id = rj.id
                            LEFT JOIN akuns ra ON ra.id = rjd.akun_id
                            LEFT JOIN kategoris rk ON rk.id = ra.kategori_id
                            WHERE ret.retur_dari_id = j.journalable_id AND j.journalable_type = 'App\\\\Models\\\\Transaksi'
                        ), 0)
                    ) as sisa
                FROM jurnals j
                JOIN jurnal_details jd ON jd.jurnal_id = j.id
                LEFT JOIN akuns a ON a.id = jd.akun_id
                LEFT JOIN kategoris k ON k.id = a.kategori_id
                WHERE j.entitas_type IN ('hutang', 'piutang') AND j.client_id IS NOT NULL {$createdByFilter}
                GROUP BY j.client_id, j.entitas_type, j.id
            ) t
            JOIN clients c ON c.id = t.client_id
            WHERE 1=1 {$searchFilter}
            GROUP BY c.id, c.nama
        ";

        $results = DB::select($sql, $bindings);

        $items = collect($results)->map(function ($row) {
            $sisaHutang = (float) $row->sisa_hutang;
            $sisaPiutang = (float) $row->sisa_piutang;
            $totalHutang = (float) $row->total_hutang;
            $totalPiutang = (float) $row->total_piutang;
            $selisih = $sisaPiutang - $sisaHutang;

            return [
                'client_id' => (int) $row->client_id,
                'client' => $row->client_nama,
                'jumlah_hutang' => (int) $row->jumlah_hutang,
                'jumlah_piutang' => (int) $row->jumlah_piutang,
                'total_hutang' => $totalHutang,
                'sisa_hutang' => $sisaHutang,
                'total_piutang' => $totalPiutang,
                'sisa_piutang' => $sisaPiutang,
                'total' => $totalHutang + $totalPiutang,
                'sisa' => round($selisih, 2),
                'posisi_sisa' => $selisih >= 0 ? 'piutang' : 'hutang',
            ];
        })->sortByDesc(fn ($item) => abs($item['sisa']))->values();

        $totalHutang = (float) $items->sum('total_hutang');
        $sisaHutang = (float) $items->sum('sisa_hutang');
        $totalPiutang = (float) $items->sum('total_piutang');
        $sisaPiutang = (float) $items->sum('sisa_piutang');

        return response()->json([
            'items' => $items,
            'totalHutang' => $totalHutang,
            'sisaHutang' => $sisaHutang,
            'totalPiutang' => $totalPiutang,
            'sisaPiutang' => $sisaPiutang,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $search = trim((string) $request->query('search'));

        $hutangs = Jurnal::with(['client', 'details.akun.kategori', 'pembayarans.details.akun'])
            ->where('entitas_type', 'hutang');
        $piutangs = Jurnal::with(['client', 'details.akun.kategori', 'pembayarans.details.akun'])
            ->where('entitas_type', 'piutang');

        $this->scopeKepemilikan($hutangs);
        $this->scopeKepemilikan($piutangs);

        if ($search !== '') {
            $hutangs->whereHas('client', function ($q) use ($search): void {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('no_telepon', 'like', "%{$search}%")
                    ->orWhere('no_telepon', 'like', "%{$search}%")
                    ->orWhere('alamat', 'like', "%{$search}%");
            });
            $piutangs->whereHas('client', function ($q) use ($search): void {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('no_telepon', 'like', "%{$search}%")
                    ->orWhere('no_telepon', 'like', "%{$search}%")
                    ->orWhere('alamat', 'like', "%{$search}%");
            });
        }

        $items = $hutangs->get()
            ->concat($piutangs->get())
            ->groupBy('client_id')
            ->filter(fn ($group) => $group->first()->client !== null)
            ->map(function (Collection $group) {
                $client = $group->first()->client;
                $ht = $group->filter(fn (Jurnal $r) => $r->entitas_type === 'hutang');
                $pt = $group->filter(fn (Jurnal $r) => $r->entitas_type === 'piutang');

                $sisaHutang = (float) $ht->sum(fn (Jurnal $r) => $r->sisaEntitas());
                $sisaPiutang = (float) $pt->sum(fn (Jurnal $r) => $r->sisaEntitas());
                $selisih = $sisaPiutang - $sisaHutang;

                return [
                    'client' => $client->nama,
                    'jumlah_hutang' => $ht->filter(fn (Jurnal $r) => $r->sisaEntitas() > 0)->count(),
                    'sisa_hutang' => $sisaHutang,
                    'jumlah_piutang' => $pt->filter(fn (Jurnal $r) => $r->sisaEntitas() > 0)->count(),
                    'sisa_piutang' => $sisaPiutang,
                    'sisa' => $selisih,
                ];
            })
            ->values()
            ->sortByDesc(fn ($item) => abs($item['sisa']))
            ->values();

        $rows = $items->map(fn ($item) => [
            $item['client'],
            $item['jumlah_hutang'],
            $item['sisa_hutang'],
            $item['jumlah_piutang'],
            $item['sisa_piutang'],
            $item['sisa'],
        ]);

        return ExcelExportService::download(
            'saldo-client-'.now()->format('Y-m-d').'.xlsx',
            ['Client', 'Jumlah Hutang', 'Sisa Hutang', 'Jumlah Piutang', 'Sisa Piutang', 'Sisa Net'],
            $rows,
            ['C' => '#,##0.00', 'E' => '#,##0.00', 'F' => '#,##0.00'],
        );
    }

    public function show(Client $client): JsonResponse
    {
        $hutangsQuery = Jurnal::with(['pembayarans.details.akun', 'details.akun.kategori', 'user'])
            ->where('client_id', $client->id)
            ->where('entitas_type', 'hutang');
        $piutangsQuery = Jurnal::with(['pembayarans.details.akun', 'details.akun.kategori', 'user'])
            ->where('client_id', $client->id)
            ->where('entitas_type', 'piutang');

        $this->scopeKepemilikan($hutangsQuery);
        $this->scopeKepemilikan($piutangsQuery);

        $hutangsList = $hutangsQuery->orderByDesc('tanggal')->get();
        $piutangsList = $piutangsQuery->orderByDesc('tanggal')->get();

        $hutangs = $hutangsList->map(fn (Jurnal $h) => [
            'id' => $h->id,
            'no_hutang' => $h->nomor_jurnal,
            'tanggal' => $h->tanggal->toDateString(),
            'total' => $h->totalEntitas(),
            'dibayar' => $h->dibayarEntitas(),
            'sisa' => $h->sisaEntitas(),
            'status' => $h->statusEntitas(),
            'keterangan' => $h->keterangan,
        ])->values();

        $piutangs = $piutangsList->map(fn (Jurnal $p) => [
            'id' => $p->id,
            'no_piutang' => $p->nomor_jurnal,
            'tanggal' => $p->tanggal->toDateString(),
            'total' => $p->totalEntitas(),
            'dibayar' => $p->dibayarEntitas(),
            'sisa' => $p->sisaEntitas(),
            'status' => $p->statusEntitas(),
            'keterangan' => $p->keterangan,
        ])->values();

        $totalHutang = (float) $hutangsList->sum(fn ($h) => $h->totalEntitas());
        $sisaHutang = (float) $hutangsList->sum(fn ($h) => $h->sisaEntitas());
        $totalPiutang = (float) $piutangsList->sum(fn ($p) => $p->totalEntitas());
        $sisaPiutang = (float) $piutangsList->sum(fn ($p) => $p->sisaEntitas());

        // Get payment journals linked to these invoices
        $allInvoiceIds = $hutangsList->pluck('id')->concat($piutangsList->pluck('id'));
        $riwayat = Jurnal::with('details.akun')
            ->where('journalable_type', Jurnal::class)
            ->whereIn('journalable_id', $allInvoiceIds)
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get()
            ->map(function (Jurnal $p) use ($hutangsList) {
                $isHutang = $hutangsList->contains('id', $p->journalable_id);
                $jumlah = (float) $p->details
                    ->filter(fn ($d) => $isHutang ? ($d->akun?->system_code === 'hutang' || $d->akun?->kategori?->jenis === 'liabilitas') : ($d->akun?->system_code === 'piutang' || $d->akun?->kategori?->jenis === 'aset'))
                    ->sum($isHutang ? 'debit' : 'kredit');

                return [
                    'id' => $p->id,
                    'tipe' => $isHutang ? 'hutang' : 'piutang',
                    'tanggal' => $p->tanggal->toDateString(),
                    'jumlah' => $jumlah,
                    'keterangan' => $p->keterangan,
                ];
            })->values();

        return response()->json([
            'client' => [
                'id' => $client->id,
                'nama' => $client->nama,
                'tipe' => $client->tipe,
                'no_telepon' => $client->no_telepon,
                'alamat' => $client->alamat,
            ],
            'totalHutang' => $totalHutang,
            'sisaHutang' => $sisaHutang,
            'totalPiutang' => $totalPiutang,
            'sisaPiutang' => $sisaPiutang,
            'hutangs' => $hutangs,
            'piutangs' => $piutangs,
            'riwayat' => $riwayat,
        ]);
    }
}
