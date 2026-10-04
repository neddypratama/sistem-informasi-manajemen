<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DataImportService;
use App\Services\LogAktivitasService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportController extends Controller
{
    public function __construct(
        private DataImportService $dataImportService,
    ) {}

    /**
     * Download template Excel untuk modul tertentu.
     */
    public function downloadTemplate(string $modul): StreamedResponse
    {
        return $this->dataImportService->downloadTemplate($modul);
    }

    /**
     * Proses impor data Excel.
     */
    public function import(Request $request, string $modul): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:10240'], // Max 10MB
        ], [
            'file.required' => 'File Excel wajib diunggah.',
            'file.mimes' => 'Format file harus berupa Excel (.xlsx, .xls) atau CSV.',
            'file.max' => 'Ukuran file tidak boleh melebihi 10MB.',
        ]);

        $file = $request->file('file');
        $userId = (int) auth()->id();

        try {
            $res = $this->dataImportService->import($modul, $file, $userId);

            LogAktivitasService::catat(
                'import',
                'tambah',
                "Impor data modul {$modul}: {$res['sukses']} sukses, {$res['gagal']} gagal",
                strtoupper($modul),
            );

            return response()->json([
                'message' => "Proses impor {$modul} selesai.",
                'sukses' => $res['sukses'],
                'gagal' => $res['gagal'],
                'errors' => $res['errors'],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal memproses file impor: '.$e->getMessage(),
            ], 422);
        }
    }
}
