<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AkunRequest extends FormRequest
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
            'kode' => ['required', 'string', 'max:20', Rule::unique('akuns', 'kode')->ignore($this->route('akun'))],
            'nama' => ['required', 'string', 'max:255'],
            'kategori_id' => ['required', 'exists:kategoris,id'],
            'saldo_normal' => ['required', Rule::in(['debit', 'kredit'])],
            'system_code' => ['nullable', Rule::in(['kas', 'stok', 'hutang', 'piutang', 'penjualan', 'hpp', 'selisih_stok'])],
            'status' => ['required', Rule::in(['aktif', 'nonaktif'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'kode' => 'Kode akun',
            'nama' => 'Nama akun',
            'kategori_id' => 'Kategori',
            'saldo_normal' => 'Saldo normal',
            'system_code' => 'Kode sistem',
            'status' => 'Status',
        ];
    }
}
