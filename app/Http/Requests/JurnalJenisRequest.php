<?php

namespace App\Http\Requests;

use App\Models\Akun;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class JurnalJenisRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'jenis' => ['required', Rule::in(['kas', 'hutang', 'piutang', 'beban', 'pendapatan'])],
            'tanggal' => ['required', 'date'],
            'client_id' => ['nullable', 'exists:clients,id'],
            'keterangan' => ['nullable', 'string'],
            'jumlah' => ['required', 'numeric', 'gt:0'],
            'arah' => ['required_if:jenis,kas', Rule::in(['masuk', 'keluar'])],
            'akun_fixed' => ['required', 'exists:akuns,id'],
            'akun_lawan' => ['required', 'exists:akuns,id'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $jenis = $this->input('jenis');

            $akunFixed = $this->resolveAkun('akun_fixed');
            $akunLawan = $this->resolveLawan();

            if ($akunFixed === null || $akunLawan === null) {
                $validator->errors()->add('akun_lawan', $this->resolusiLawanGagal($jenis));

                return;
            }

            if ($akunFixed->id === $akunLawan->id) {
                $validator->errors()->add('akun_lawan', 'Akun lawan tidak boleh sama dengan akun utama.');
            }

            if (in_array($jenis, ['beban', 'pendapatan'], true) && ! $akunLawan->adalahKasBank()) {
                $validator->errors()->add('akun_lawan', 'Akun lawan harus akun Kas/Bank.');
            }

            if (! $this->akunCocokJenis($akunFixed, $jenis)) {
                $validator->errors()->add('akun_fixed', 'Akun utama tidak sesuai dengan jenis jurnal.');
            }
        });
    }

    /**
     * Menentukan dua baris jurnal (debit/kredit) berdasarkan jenis.
     *
     * @return array<int, array{akun_id: int, debit: float, kredit: float}>
     */
    public function itemsJurnal(): array
    {
        $jumlah = (float) $this->input('jumlah');
        $jenis = $this->input('jenis');
        $fixedId = (int) $this->input('akun_fixed');
        $lawan = $this->resolveLawan();

        if ($lawan === null) {
            return [];
        }

        $lawanId = (int) $lawan->id;

        $baris = function (int $akunId, float $debit, float $kredit): array {
            return ['akun_id' => $akunId, 'debit' => $debit, 'kredit' => $kredit];
        };

        return match ($jenis) {
            'hutang' => [
                $baris($lawanId, $jumlah, 0),
                $baris($fixedId, 0, $jumlah),
            ],
            'piutang' => [
                $baris($fixedId, $jumlah, 0),
                $baris($lawanId, 0, $jumlah),
            ],
            'beban' => [
                $baris($fixedId, $jumlah, 0),
                $baris($lawanId, 0, $jumlah),
            ],
            'pendapatan' => [
                $baris($lawanId, $jumlah, 0),
                $baris($fixedId, 0, $jumlah),
            ],
            'kas' => $this->input('arah') === 'masuk'
                ? [$baris($fixedId, $jumlah, 0), $baris($lawanId, 0, $jumlah)]
                : [$baris($lawanId, $jumlah, 0), $baris($fixedId, 0, $jumlah)],
        };
    }

    protected function resolveAkun(string $field): ?Akun
    {
        $id = $this->input($field);

        return $id !== null ? Akun::find((int) $id) : null;
    }

    /**
     * Resolusi akun lawan. Untuk jenis kas/hutang/piutang/beban/pendapatan
     * memakai pilihan pengguna; beban & pendapatan mengharuskan akun Kas/Bank.
     */
    protected function resolveLawan(): ?Akun
    {
        return $this->resolveAkun('akun_lawan') ?? Akun::system('kas');
    }

    protected function resolusiLawanGagal(string $jenis): string
    {
        return 'Akun lawan tidak ditemukan.';
    }

    /**
     * Memastikan akun utama sesuai dengan jenis jurnal yang dipilih.
     */
    protected function akunCocokJenis(?Akun $akun, string $jenis): bool
    {
        if ($akun === null) {
            return false;
        }

        return match ($jenis) {
            'kas' => $akun->adalahKasBank(),
            'hutang', 'piutang' => $akun->system_code === $jenis,
            'beban' => $akun->kategori?->jenis === 'beban' && ! $this->adalahHpp($akun),
            'pendapatan' => $akun->kategori?->jenis === 'pendapatan' && ! $this->adalahPenjualan($akun),
            default => false,
        };
    }

    protected function adalahHpp(Akun $akun): bool
    {
        return $akun->system_code === 'hpp'
            || str_starts_with((string) $akun->kategori?->nama, 'HPP');
    }

    protected function adalahPenjualan(Akun $akun): bool
    {
        return $akun->system_code === 'penjualan'
            || str_starts_with((string) $akun->kategori?->nama, 'Penjualan');
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'jumlah.required' => 'Jumlah wajib diisi.',
            'jumlah.gt' => 'Jumlah harus lebih besar dari 0.',
            'arah.required_if' => 'Pilih arah kas (masuk/keluar).',
            'akun_fixed.exists' => 'Akun utama tidak valid.',
            'akun_lawan.exists' => 'Akun lawan tidak valid.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'tanggal' => 'Tanggal',
            'client_id' => 'Client',
            'jumlah' => 'Jumlah',
            'akun_fixed' => 'Akun utama',
            'akun_lawan' => 'Akun lawan',
        ];
    }
}
