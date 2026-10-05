<?php

namespace App\Services;

use App\Models\Akun;
use App\Models\JurnalDetail;

/**
 * Perhitungan saldo akun dari jurnal (debit/kredit) sesuai saldo normal,
 * dengan filter kepemilikan data user yang sedang login.
 */
class SaldoAkunService
{
    /**
     * Saldo akun sampai (termasuk) tanggal tertentu.
     */
    public function saldoAkhir(Akun $akun, string $tanggal): float
    {
        return $this->hitung($akun, $tanggal, '<=');
    }

    /**
     * Saldo akun sebelum tanggal tertentu.
     */
    public function saldoAkhirSebelum(Akun $akun, string $tanggal): float
    {
        return $this->hitung($akun, $tanggal, '<');
    }

    protected function hitung(Akun $akun, string $tanggal, string $operator): float
    {
        $query = JurnalDetail::query()
            ->join('jurnals', 'jurnals.id', '=', 'jurnal_details.jurnal_id')
            ->where('jurnal_details.akun_id', $akun->id)
            ->where('jurnals.tanggal', $operator, $tanggal);

        if (! auth()->user()?->bisaMelihatSemuaData()) {
            $query->where('jurnals.created_by', auth()->id());
        }

        $row = $query->selectRaw('SUM(jurnal_details.debit) as total_debit, SUM(jurnal_details.kredit) as total_kredit')->first();

        $debit = (float) ($row?->total_debit ?? 0);
        $kredit = (float) ($row?->total_kredit ?? 0);

        if ($akun->saldo_normal === 'debit') {
            return $debit - $kredit;
        }

        return $kredit - $debit;
    }
}
