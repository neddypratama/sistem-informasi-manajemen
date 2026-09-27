<?php

namespace App\Http\Requests;

use App\Models\Akun;
use Illuminate\Foundation\Http\FormRequest;

class JurnalRequest extends FormRequest
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
            'client_id' => ['nullable', 'exists:clients,id'],
            'keterangan' => ['nullable', 'string'],

            'items' => ['required', 'array', 'min:2'],
            'items.*.akun_id' => ['required', 'exists:akuns,id'],
            'items.*.debit' => ['required_without:items.*.kredit', 'nullable', 'numeric', 'min:0'],
            'items.*.kredit' => ['required_without:items.*.debit', 'nullable', 'numeric', 'min:0'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $items = $this->input('items', []);

            $totalDebit = 0;
            $totalKredit = 0;
            $valid = 0;

            foreach ($items as $item) {
                $debit = (float) ($item['debit'] ?? 0);
                $kredit = (float) ($item['kredit'] ?? 0);

                if ($debit < 0 || $kredit < 0) {
                    $validator->errors()->add('items', 'Nilai debit/kredit tidak boleh negatif.');
                }

                if ($debit > 0 && $kredit > 0) {
                    $validator->errors()->add('items', 'Satu baris tidak boleh memiliki debit dan kredit sekaligus.');
                }

                if ($debit > 0 || $kredit > 0) {
                    $valid++;
                }

                $totalDebit += $debit;
                $totalKredit += $kredit;
            }

            if ($valid < 2) {
                $validator->errors()->add('items', 'Jurnal harus memiliki minimal dua baris (debit dan kredit).');
            }

            if (round($totalDebit, 2) !== round($totalKredit, 2)) {
                $validator->errors()->add('items', 'Total debit harus sama dengan total kredit (seimbang).');
            }

            foreach ($items as $index => $item) {
                $akunId = $item['akun_id'] ?? null;
                if ($akunId !== null) {
                    $akun = Akun::find($akunId);
                    if ($akun !== null && ! $akun->isAktif()) {
                        $validator->errors()->add("items.$index.akun_id", 'Akun tidak aktif.');
                    }
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Minimal dua baris jurnal wajib diisi.',
            'items.min' => 'Minimal dua baris jurnal wajib diisi.',
            'items.*.debit.required_without' => 'Isi debit atau kredit pada baris ini.',
            'items.*.kredit.required_without' => 'Isi debit atau kredit pada baris ini.',
            'items.*.akun_id.exists' => 'Akun yang dipilih tidak valid.',
            'items.*.debit.numeric' => 'Debit harus berupa angka.',
            'items.*.kredit.numeric' => 'Kredit harus berupa angka.',
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
            'keterangan' => 'Keterangan',
            'items.*.akun_id' => 'Akun',
            'items.*.debit' => 'Debit',
            'items.*.kredit' => 'Kredit',
        ];
    }
}
