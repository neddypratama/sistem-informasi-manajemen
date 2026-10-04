<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Jurnal;
use App\Services\ExcelExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TagihanController extends Controller
{
    public function index(Request $request): JsonResponse
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

                $totalHutang = (float) $ht->sum(fn (Jurnal $r) => $r->totalEntitas());
                $sisaHutang = (float) $ht->sum(fn (Jurnal $r) => $r->sisaEntitas());
                $totalPiutang = (float) $pt->sum(fn (Jurnal $r) => $r->totalEntitas());
                $sisaPiutang = (float) $pt->sum(fn (Jurnal $r) => $r->sisaEntitas());
                $selisih = $sisaPiutang - $sisaHutang;

                return [
                    'client_id' => $client->id,
                    'client' => $client->nama,
                    'jumlah_hutang' => $ht->filter(fn (Jurnal $r) => $r->sisaEntitas() > 0)->count(),
                    'jumlah_piutang' => $pt->filter(fn (Jurnal $r) => $r->sisaEntitas() > 0)->count(),
                    'total_hutang' => $totalHutang,
                    'sisa_hutang' => $sisaHutang,
                    'total_piutang' => $totalPiutang,
                    'sisa_piutang' => $sisaPiutang,
                    'total' => $totalHutang + $totalPiutang,
                    'sisa' => $selisih,
                    'posisi_sisa' => $selisih >= 0 ? 'piutang' : 'hutang',
                ];
            })
            ->values()
            ->sortByDesc(fn ($item) => abs($item['sisa']))
            ->values();

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
