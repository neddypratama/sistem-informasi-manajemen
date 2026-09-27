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
        $query = JurnalDetail::where('akun_id', $akun->id)
            ->whereHas('jurnal', function ($q) use ($tanggal, $operator): void {
                $q->where('tanggal', $operator, $tanggal);

                if (! auth()->user()?->bisaMelihatSemuaData()) {
                    $q->where('created_by', auth()->id());
                }
            });

        $debit = (float) $query->sum('debit');
        $kredit = (float) $query->sum('kredit');

        if ($akun->saldo_normal === 'debit') {
            return $debit - $kredit;
        }

        return $kredit - $debit;
    }
}
