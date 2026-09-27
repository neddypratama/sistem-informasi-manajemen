<?php

namespace App\Http\Requests;

use App\Models\Hutang;
use App\Models\Piutang;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class PembayaranRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'tipe' => ['required_with:client_id', 'string', 'in:hutang,piutang'],
            'hutang_id' => ['nullable', 'integer', 'exists:hutangs,id'],
            'piutang_id' => ['nullable', 'integer', 'exists:piutangs,id'],
            'tanggal' => ['required', 'date'],
            'jumlah' => ['required', 'numeric', 'gt:0'],
            'keterangan' => ['nullable', 'string', 'max:255'],
            'akun_pembayaran_id' => ['required', 'integer', 'exists:akuns,id'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $jumlah = (float) $this->input('jumlah');

                if ($this->input('client_id') && $this->input('tipe')) {
                    $this->validasiPerClient($validator, $jumlah);

                    return;
                }

                $this->validasiPerFaktur($validator, $jumlah);
            },
        ];
    }

    protected function validasiPerClient(Validator $validator, float $jumlah): void
    {
        $clientId = (int) $this->input('client_id');
        $tipe = $this->input('tipe');
        $model = $tipe === 'piutang' ? Piutang::class : Hutang::class;

        $sisaClient = (float) $model::where('client_id', $clientId)->get()->sum(fn ($e) => $e->sisa());

        if ($sisaClient <= 0) {
            $validator->errors()->add('client_id', 'Tidak ada tagihan yang masih bersisa untuk client ini.');

            return;
        }

        if ($jumlah > $sisaClient) {
            $validator->errors()->add(
                'jumlah',
                'Jumlah melebihi sisa tagihan client (Rp '.number_format($sisaClient, 0, ',', '.').').',
            );
        }
    }

    protected function validasiPerFaktur(Validator $validator, float $jumlah): void
    {
        $id = (int) $this->input('hutang_id') ?: (int) $this->input('piutang_id');

        if ($id <= 0 || $jumlah <= 0) {
            return;
        }

        if ($this->input('hutang_id')) {
            $entitas = Hutang::find($id);
            $label = 'hutang';
        } else {
            $entitas = Piutang::find($id);
            $label = 'piutang';
        }

        if ($entitas === null) {
            $validator->errors()->add($label.'_id', 'Tagihan tidak ditemukan.');

            return;
        }

        if ($jumlah > $entitas->sisa()) {
            $validator->errors()->add(
                'jumlah',
                'Jumlah melebihi sisa tagihan (Rp '.number_format($entitas->sisa(), 0, ',', '.').').',
            );
        }
    }
}
