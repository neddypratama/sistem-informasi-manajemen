<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ClientRequest;
use App\Models\Client;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search'));
        $tipe = $request->query('tipe');
        $status = $request->query('status');

        [$sort, $order] = $this->sortParams(
            ['nama', 'alamat', 'tipe', 'status', 'no_telepon'],
            'nama',
            'asc',
        );

        $clients = Client::query()
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('nama', 'like', "%{$search}%")
                        ->orWhere('alamat', 'like', "%{$search}%")
                        ->orWhere('no_telepon', 'like', "%{$search}%")
                        ->orWhere('keterangan', 'like', "%{$search}%");
                });
            })
            ->when(
                is_string($tipe) && in_array($tipe, ['Peternak', 'Supplier', 'Pedagang', 'Karyawan', 'Truk'], true),
                fn ($query) => $query->where('tipe', $tipe),
            )
            ->when(is_string($status) && $status !== '', fn ($query) => $query->where('status', $status))
            ->orderBy($sort, $order)
            ->paginate(10);

        return response()->json($clients);
    }

    /**
     * Daftar semua client aktif untuk opsi form.
     */
    public function options(): JsonResponse
    {
        $clients = Client::where('status', 'aktif')
            ->orderBy('nama')
            ->get();

        return response()->json($clients);
    }

    public function store(ClientRequest $request): JsonResponse
    {
        $client = Client::create($request->validated());

        LogAktivitasService::catat('client', 'tambah', 'Menambah client '.$client->nama, $client->nama);

        return response()->json($client, 201);
    }

    public function update(ClientRequest $request, Client $client): JsonResponse
    {
        $client->update($request->validated());

        LogAktivitasService::catat('client', 'ubah', 'Mengubah client '.$client->nama, $client->nama);

        return response()->json($client);
    }

    public function destroy(Client $client): JsonResponse
    {
        if ($client->transaksis()->exists()) {
            return response()->json([
                'message' => 'Client tidak dapat dihapus karena sudah memiliki transaksi.',
            ], 422);
        }

        LogAktivitasService::catat('client', 'hapus', 'Menghapus client '.$client->nama, $client->nama);

        $client->delete();

        return response()->json(['message' => 'Client berhasil dihapus.']);
    }
}
