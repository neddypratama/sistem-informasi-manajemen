<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class JenisBarangRequest extends FormRequest
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
            'nama' => ['required', 'string', 'max:255'],
            'kelompok' => ['nullable', 'in:telur,pakan,obat,tray'],
            'keterangan' => ['nullable', 'string'],
            'status' => ['required', 'in:aktif,nonaktif'],
        ];
    }
}
