<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class KategoriRequest extends FormRequest
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
            'nama' => ['required', 'string', 'max:255', Rule::unique('kategoris', 'nama')->ignore($this->route('kategori'))],
            'jenis' => ['required', Rule::in(['pendapatan', 'beban', 'aset', 'liabilitas', 'ekuitas'])],
            'keterangan' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['aktif', 'nonaktif'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'nama' => 'Nama kategori',
            'jenis' => 'Jenis',
            'keterangan' => 'Keterangan',
            'status' => 'Status',
        ];
    }
}
