<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExcelExportService
{
    /**
     * Streaming export ke file .xlsx.
     *
     * @param  array<int, string>  $header
     * @param  iterable<int, array<int, mixed>>  $rows
     * @param  array<string, string>  $formats  format angka per kolom, mis. ['F' => '#,##0.00']
     */
    public static function download(string $filename, array $header, iterable $rows, array $formats = []): StreamedResponse
    {
        return response()->streamDownload(
            function () use ($header, $rows, $formats): void {
                $spreadsheet = new Spreadsheet;
                $sheet = $spreadsheet->getActiveSheet();

                $sheet->fromArray($header, null, 'A1');

                $lastCol = $sheet->getHighestColumn();

                $sheet->getStyle('A1:'.$lastCol.'1')->getFont()->setBold(true);
                $sheet->getStyle('A1:'.$lastCol.'1')
                    ->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFE2E8F0');

                $rowIndex = 2;

                foreach ($rows as $row) {
                    $sheet->fromArray($row, null, 'A'.$rowIndex);
                    $rowIndex++;
                }

                $lastRow = $rowIndex - 1;

                foreach ($formats as $col => $format) {
                    $sheet->getStyle($col.'2:'.$col.$lastRow)
                        ->getNumberFormat()
                        ->setFormatCode($format);
                }

                foreach (range('A', $lastCol) as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }

                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
            },
            $filename,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'no-store',
            ],
        );
    }
}
