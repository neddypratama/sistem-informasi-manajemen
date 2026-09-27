<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReturStoreRequest extends FormRequest
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
        $sumberTipe = $this->input('tipe_transaksi') === 'pembelian_retur' ? 'pembelian' : 'penjualan';

        return [
            'tanggal' => ['required', 'date'],
            'tipe_transaksi' => ['required', Rule::in(['pembelian_retur', 'penjualan_retur'])],
            'sumber_id' => [
                'required',
                'exists:transaksis,id',
                Rule::exists('transaksis', 'id')->where(fn ($query) => $query->where('tipe_transaksi', $sumberTipe)),
            ],
            'keterangan' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.detail_sumber_id' => ['nullable', 'integer', 'exists:detail_transaksis,id'],
            'items.*.barang_id' => ['required', 'exists:barangs,id'],
            'items.*.kuantitas' => ['required', 'numeric', 'gt:0'],
            'items.*.harga' => ['required', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'sumber_id.exists' => 'Transaksi sumber tidak valid.',
            'items.required' => 'Minimal satu barang wajib diisi.',
            'items.min' => 'Minimal satu barang wajib diisi.',
            'items.*.kuantitas.gt' => 'Kuantitas harus lebih besar dari 0.',
            'items.*.harga.min' => 'Harga tidak boleh negatif.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'sumber_id' => 'Transaksi sumber',
            'items.*.barang_id' => 'Barang',
            'items.*.kuantitas' => 'Kuantitas',
            'items.*.harga' => 'Harga',
        ];
    }
}
