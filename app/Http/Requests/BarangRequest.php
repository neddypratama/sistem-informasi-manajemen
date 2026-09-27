<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BarangRequest extends FormRequest
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
            'jenis_barang_id' => ['required', 'exists:jenis_barang,id'],
            'kode_barang' => [
                'required',
                'string',
                'max:50',
                Rule::unique('barangs', 'kode_barang')->ignore($this->route('barang')),
            ],
            'nama_barang' => ['required', 'string', 'max:255'],
            'satuan' => ['required', 'string', 'max:50'],
            'stok' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:aktif,nonaktif'],
        ];
    }
}
