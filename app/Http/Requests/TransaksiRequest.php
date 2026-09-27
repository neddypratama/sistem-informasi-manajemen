<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransaksiRequest extends FormRequest
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
            'tanggal' => ['required', 'date'],
            'tipe_transaksi' => ['required', Rule::in(['pembelian', 'penjualan'])],
            'client_id' => [
                'required',
                'exists:clients,id',
                Rule::exists('clients', 'id')->where(function ($query) {
                    $query->where('status', 'aktif');
                }),
            ],
            'keterangan' => ['nullable', 'string'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.barang_id' => ['required', 'exists:barangs,id,status,aktif'],
            'items.*.kuantitas' => ['required', 'numeric', 'gt:0'],
            'items.*.harga' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * Tipe client yang sesuai dengan tipe transaksi: supplier untuk pembelian,
     * customer untuk penjualan.
     */
    protected function clientTypeForTipe(): string
    {
        return $this->input('tipe_transaksi') === 'pembelian' ? 'Supplier' : 'Pedagang';
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Minimal satu barang wajib diisi.',
            'items.min' => 'Minimal satu barang wajib diisi.',
            'items.*.kuantitas.gt' => 'Kuantitas harus lebih besar dari 0.',
            'items.*.harga.min' => 'Harga tidak boleh negatif.',
            'items.*.barang_id.exists' => 'Barang yang dipilih tidak valid.',
            'client_id.exists' => ':attribute tidak valid atau tidak aktif.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'client_id' => 'Supplier / Customer',
            'items.*.barang_id' => 'Barang',
            'items.*.kuantitas' => 'Kuantitas',
            'items.*.harga' => 'Harga',
        ];
    }
}
