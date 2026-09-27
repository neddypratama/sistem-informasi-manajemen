<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ClientRequest extends FormRequest
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
            'alamat' => ['nullable', 'string'],
            'no_telepon' => ['nullable', 'string', 'max:50'],
            'tipe' => ['required', Rule::in(['Peternak', 'Supplier', 'Pedagang', 'Karyawan'])],
            'status' => ['required', 'in:aktif,nonaktif'],
        ];
    }
}
