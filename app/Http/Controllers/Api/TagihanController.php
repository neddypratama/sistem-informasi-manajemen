<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Hutang;
use App\Models\Piutang;
use App\Services\ExcelExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TagihanController extends Controller
{
    public function index(): JsonResponse
    {
        $hutangs = Hutang::with('client');
        $piutangs = Piutang::with('client');

        $this->scopeKepemilikan($hutangs);
        $this->scopeKepemilikan($piutangs);

        $items = $hutangs->get()
            ->concat($piutangs->get())
            ->groupBy('client_id')
            ->filter(fn ($group) => $group->first()->client !== null)
            ->map(function (Collection $group) {
                $client = $group->first()->client;
                $ht = $group->filter(fn ($r) => $r instanceof Hutang);
                $pt = $group->filter(fn ($r) => $r instanceof Piutang);

                $totalHutang = (float) $ht->sum('total');
                $sisaHutang = (float) $ht->sum(fn ($r) => $r->sisa());
                $totalPiutang = (float) $pt->sum('total');
                $sisaPiutang = (float) $pt->sum(fn ($r) => $r->sisa());

                return [
                    'client_id' => $client->id,
                    'client' => $client->nama,
                    'jumlah_hutang' => $ht->count(),
                    'jumlah_piutang' => $pt->count(),
                    'total_hutang' => $totalHutang,
                    'sisa_hutang' => $sisaHutang,
                    'total_piutang' => $totalPiutang,
                    'sisa_piutang' => $sisaPiutang,
                    'total' => $totalHutang + $totalPiutang,
                    'sisa' => $sisaHutang + $sisaPiutang,
                ];
            })
            ->values()
            ->sortByDesc('sisa')
            ->values();

        $totalHutang = (float) $items->sum('total_hutang');
        $sisaHutang = (float) $items->sum('sisa_hutang');
        $totalPiutang = (float) $items->sum('total_piutang');
        $sisaPiutang = (float) $items->sum('sisa_piutang');

        return response()->json(compact(
            'items',
            'totalHutang',
            'sisaHutang',
            'totalPiutang',
            'sisaPiutang',
        ));
    }

    public function export(): StreamedResponse
    {
        $hutangs = Hutang::with('client');
        $piutangs = Piutang::with('client');

        $this->scopeKepemilikan($hutangs);
        $this->scopeKepemilikan($piutangs);

        $items = $hutangs->get()
            ->concat($piutangs->get())
            ->groupBy('client_id')
            ->filter(fn ($group) => $group->first()->client !== null)
            ->map(function (Collection $group) {
                $client = $group->first()->client;
                $ht = $group->filter(fn ($r) => $r instanceof Hutang);
                $pt = $group->filter(fn ($r) => $r instanceof Piutang);

                $totalHutang = (float) $ht->sum('total');
                $sisaHutang = (float) $ht->sum(fn ($r) => $r->sisa());
                $totalPiutang = (float) $pt->sum('total');
                $sisaPiutang = (float) $pt->sum(fn ($r) => $r->sisa());

                return [
                    'client' => $client->nama,
                    'jumlah_hutang' => $ht->count(),
                    'sisa_hutang' => $sisaHutang,
                    'jumlah_piutang' => $pt->count(),
                    'sisa_piutang' => $sisaPiutang,
                    'sisa' => $sisaHutang + $sisaPiutang,
                ];
            })
            ->values()
            ->sortByDesc('sisa')
            ->values();

        $rows = $items->map(fn ($item) => [
            $item['client'],
            $item['jumlah_hutang'],
            (float) $item['sisa_hutang'],
            $item['jumlah_piutang'],
            (float) $item['sisa_piutang'],
            (float) $item['sisa'],
        ]);

        return ExcelExportService::download(
            'saldo-client-'.now()->format('Y-m-d').'.xlsx',
            ['Client', 'Jml Hutang', 'Sisa Hutang', 'Jml Piutang', 'Sisa Piutang', 'Total Sisa'],
            $rows,
            ['C' => '#,##0.00', 'E' => '#,##0.00', 'F' => '#,##0.00'],
        );
    }

    public function show(Client $client): JsonResponse
    {
        $hutangs = Hutang::with('pembayarans')
            ->where('client_id', $client->id);

        $this->scopeKepemilikan($hutangs);

        $dataHutangs = $hutangs
            ->orderByDesc('tanggal')
            ->get()
            ->map(fn ($h) => [
                'id' => $h->id,
                'no_hutang' => $h->no_hutang,
                'tanggal' => $h->tanggal->toDateString(),
                'total' => (float) $h->total,
                'sisa' => $h->sisa(),
                'status' => $h->status,
                'keterangan' => $h->keterangan,
                'pembayarans' => $h->pembayarans->map(fn ($p) => [
                    'id' => $p->id,
                    'tanggal' => $p->tanggal->toDateString(),
                    'jumlah' => (float) $p->jumlah,
                    'keterangan' => $p->keterangan,
                ])->values(),
            ])
            ->values();

        $piutangs = Piutang::with('pembayarans')
            ->where('client_id', $client->id);

        $this->scopeKepemilikan($piutangs);

        $dataPiutangs = $piutangs
            ->orderByDesc('tanggal')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'no_piutang' => $p->no_piutang,
                'tanggal' => $p->tanggal->toDateString(),
                'total' => (float) $p->total,
                'sisa' => $p->sisa(),
                'status' => $p->status,
                'keterangan' => $p->keterangan,
                'pembayarans' => $p->pembayarans->map(fn ($b) => [
                    'id' => $b->id,
                    'tanggal' => $b->tanggal->toDateString(),
                    'jumlah' => (float) $b->jumlah,
                    'keterangan' => $b->keterangan,
                ])->values(),
            ])
            ->values();

        $totalHutang = (float) $dataHutangs->sum('total');
        $sisaHutang = (float) $dataHutangs->sum('sisa');
        $totalPiutang = (float) $dataPiutangs->sum('total');
        $sisaPiutang = (float) $dataPiutangs->sum('sisa');

        $riwayat = $this->riwayatPembayaran($dataHutangs, $dataPiutangs);

        return response()->json(compact(
            'client',
            'totalHutang',
            'sisaHutang',
            'totalPiutang',
            'sisaPiutang',
            'riwayat',
        ) + [
            'hutangs' => $dataHutangs,
            'piutangs' => $dataPiutangs,
        ]);
    }

    protected function riwayatPembayaran(Collection $hutangs, Collection $piutangs): Collection
    {
        $fromHutang = $hutangs->flatMap(fn ($h) => collect($h['pembayarans'])->map(fn ($p) => [
            'tipe' => 'hutang',
            'tanggal' => $p['tanggal'],
            'jumlah' => $p['jumlah'],
            'keterangan' => $p['keterangan'],
            'nomor' => $h['no_hutang'],
        ]));

        $fromPiutang = $piutangs->flatMap(fn ($p) => collect($p['pembayarans'])->map(fn ($b) => [
            'tipe' => 'piutang',
            'tanggal' => $b['tanggal'],
            'jumlah' => $b['jumlah'],
            'keterangan' => $b['keterangan'],
            'nomor' => $p['no_piutang'],
        ]));

        return collect()
            ->concat($fromHutang)
            ->concat($fromPiutang)
            ->sortByDesc('tanggal')
            ->values();
    }
}
