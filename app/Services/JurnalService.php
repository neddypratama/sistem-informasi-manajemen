<?php

namespace App\Services;

use App\Models\Akun;
use App\Models\Client;
use App\Models\JenisBarang;
use App\Models\Jurnal;
use App\Models\Kategori;
use App\Models\StokOpname;
use App\Models\Transaksi;

class JurnalService
{
    public function __construct(
        private FifoStockService $fifoStockService,
    ) {}

    /**
     * Membuat jurnal otomatis dari sebuah transaksi pembelian/penjualan.
     *
     * Jika akun sistem yang dibutuhkan belum dikonfigurasi, jurnal dilewati
     * (null) agar alur stok/transaksi tetap berjalan.
     */
    public function postFromTransaksi(Transaksi $transaksi): ?Jurnal
    {
        if ($transaksi->isPembelianRetur()) {
            return $this->postPembelianRetur($transaksi);
        }

        if ($transaksi->isPenjualanRetur()) {
            return $this->postPenjualanRetur($transaksi);
        }

        if ($transaksi->isPembelian()) {
            return $this->postPembelian($transaksi);
        }

        return $this->postPenjualan($transaksi);
    }

    protected function postPembelian(Transaksi $transaksi): ?Jurnal
    {
        $transaksi->load('client', 'detailTransaksis.barang.jenisBarang');

        /** @var array<string, array{stok: Akun, hutang: Akun, subtotal: float}> $kelompokLines */
        $kelompokLines = [];

        foreach ($transaksi->detailTransaksis as $detail) {
            $jenisBarang = $detail->barang?->jenisBarang;
            $unitKey = $this->unitKey($jenisBarang);

            if (! isset($kelompokLines[$unitKey])) {
                $stok = $this->resolveStokAkun($jenisBarang);
                $hutang = $this->resolveHutangAkun($jenisBarang, $transaksi->client);

                if ($stok === null || $hutang === null) {
                    return null;
                }

                $kelompokLines[$unitKey] = ['stok' => $stok, 'hutang' => $hutang, 'subtotal' => 0.0];
            }

            $kelompokLines[$unitKey]['subtotal'] += (float) $detail->subtotal;
        }

        $jurnal = $this->buatHeader($transaksi);

        foreach ($kelompokLines as $line) {
            $jurnal->details()->create([
                'akun_id' => $line['stok']->id,
                'debit' => $line['subtotal'],
                'kredit' => 0,
            ]);

            $jurnal->details()->create([
                'akun_id' => $line['hutang']->id,
                'debit' => 0,
                'kredit' => $line['subtotal'],
            ]);
        }

        $jurnal->update(['entitas_type' => 'hutang']);

        return $jurnal;
    }

    protected function postPenjualan(Transaksi $transaksi): ?Jurnal
    {
        $transaksi->load('client', 'detailTransaksis.barang.jenisBarang');

        /**
         * Piutang dikelompokkan per unit (curah vs non-curah per tipe client).
         * Penjualan + HPP + Stok dikelompokkan per jenis barang.
         *
         * @var array<string, array{piutang: Akun, subtotal: float}> $unitLines
         * @var array<string, array{penjualan: Akun, hpp: Akun, stok: Akun, hpp_total: float, stok_total: float}> $jenisLines
         */
        $unitLines = [];
        $jenisLines = [];

        foreach ($transaksi->detailTransaksis as $detail) {
            $jenisBarang = $detail->barang?->jenisBarang;
            $unitKey = $this->unitKey($jenisBarang);
            $jenisKey = $jenisBarang?->nama ?? '-';

            // Piutang per unit
            if (! isset($unitLines[$unitKey])) {
                $piutang = $this->resolvePiutangAkun($jenisBarang, $transaksi->client);
                if ($piutang === null) {
                    return null;
                }
                $unitLines[$unitKey] = ['piutang' => $piutang, 'subtotal' => 0.0];
            }
            $unitLines[$unitKey]['subtotal'] += (float) $detail->subtotal;

            // Penjualan + HPP + Stok per jenis
            if (! isset($jenisLines[$jenisKey])) {
                $penjualan = $this->resolvePenjualanAkun($jenisBarang);
                $hpp = $this->resolveHppAkun($jenisBarang);
                $stok = $this->resolveStokAkun($jenisBarang);
                if ($penjualan === null || $hpp === null || $stok === null) {
                    return null;
                }
                $jenisLines[$jenisKey] = [
                    'penjualan' => $penjualan,
                    'hpp' => $hpp,
                    'stok' => $stok,
                    'hpp_total' => 0.0,
                    'stok_total' => 0.0,
                    'penjualan_total' => 0.0,
                ];
            }
            $jenisLines[$jenisKey]['penjualan_total'] += (float) $detail->subtotal;

            $hppDetail = (float) $detail->stokBatchUsages()->sum('subtotal');
            $jenisLines[$jenisKey]['hpp_total'] += $hppDetail;
            $jenisLines[$jenisKey]['stok_total'] += $hppDetail;
        }

        $jurnal = $this->buatHeader($transaksi);

        foreach ($unitLines as $line) {
            $jurnal->details()->create([
                'akun_id' => $line['piutang']->id,
                'debit' => $line['subtotal'],
                'kredit' => 0,
            ]);
        }

        $jurnal->update(['entitas_type' => 'piutang']);

        foreach ($jenisLines as $line) {
            $jurnal->details()->create([
                'akun_id' => $line['penjualan']->id,
                'debit' => 0,
                'kredit' => $line['penjualan_total'],
            ]);

            if ($line['hpp_total'] > 0) {
                $jurnal->details()->create([
                    'akun_id' => $line['hpp']->id,
                    'debit' => $line['hpp_total'],
                    'kredit' => 0,
                ]);

                $jurnal->details()->create([
                    'akun_id' => $line['stok']->id,
                    'debit' => 0,
                    'kredit' => $line['stok_total'],
                ]);
            }
        }

        return $jurnal;
    }

    /**
     * Jurnal retur pembelian: membalik pembelian. Barang dikembalikan ke
     * supplier, sehingga stok berkurang dan hutang supplier didebet.
     */
    protected function postPembelianRetur(Transaksi $transaksi): ?Jurnal
    {
        $transaksi->load('client', 'detailTransaksis.barang.jenisBarang');

        /** @var array<string, array{stok: Akun, hutang: Akun, subtotal: float}> $kelompokLines */
        $kelompokLines = [];

        foreach ($transaksi->detailTransaksis as $detail) {
            $jenisBarang = $detail->barang?->jenisBarang;
            $unitKey = $this->unitKey($jenisBarang);

            if (! isset($kelompokLines[$unitKey])) {
                $stok = $this->resolveStokAkun($jenisBarang);
                $hutang = $this->resolveHutangAkun($jenisBarang, $transaksi->client);

                if ($stok === null || $hutang === null) {
                    return null;
                }

                $kelompokLines[$unitKey] = ['stok' => $stok, 'hutang' => $hutang, 'subtotal' => 0.0];
            }

            $kelompokLines[$unitKey]['subtotal'] += (float) $detail->subtotal;
        }

        $jurnal = $this->buatHeader($transaksi);

        foreach ($kelompokLines as $line) {
            $jurnal->details()->create([
                'akun_id' => $line['hutang']->id,
                'debit' => $line['subtotal'],
                'kredit' => 0,
            ]);

            $jurnal->details()->create([
                'akun_id' => $line['stok']->id,
                'debit' => 0,
                'kredit' => $line['subtotal'],
            ]);
        }

        $this->kurangiEntitasDariRetur($transaksi, Hutang::class);

        return $jurnal;
    }

    /**
     * Jurnal retur penjualan: membalik penjualan. Customer mengembalikan barang,
     * sehingga penjualan didebet, piutang dikredit, dan HPP dibalik (stok
     * didebet, HPP dikredit).
     */
    protected function postPenjualanRetur(Transaksi $transaksi): ?Jurnal
    {
        $transaksi->load('client', 'detailTransaksis.barang.jenisBarang');

        /** @var array<string, array{piutang: Akun, subtotal: float}> $unitLines */
        $unitLines = [];
        /** @var array<string, array{penjualan: Akun, hpp: Akun, stok: Akun, hpp_total: float, penjualan_total: float}> $jenisLines */
        $jenisLines = [];

        foreach ($transaksi->detailTransaksis as $detail) {
            $jenisBarang = $detail->barang?->jenisBarang;
            $unitKey = $this->unitKey($jenisBarang);
            $jenisKey = $jenisBarang?->nama ?? '-';

            if (! isset($unitLines[$unitKey])) {
                $piutang = $this->resolvePiutangAkun($jenisBarang, $transaksi->client);
                if ($piutang === null) {
                    return null;
                }
                $unitLines[$unitKey] = ['piutang' => $piutang, 'subtotal' => 0.0];
            }
            $unitLines[$unitKey]['subtotal'] += (float) $detail->subtotal;

            if (! isset($jenisLines[$jenisKey])) {
                $penjualan = $this->resolvePenjualanAkun($jenisBarang);
                $hpp = $this->resolveHppAkun($jenisBarang);
                $stok = $this->resolveStokAkun($jenisBarang);
                if ($penjualan === null || $hpp === null || $stok === null) {
                    return null;
                }
                $jenisLines[$jenisKey] = [
                    'penjualan' => $penjualan,
                    'hpp' => $hpp,
                    'stok' => $stok,
                    'hpp_total' => 0.0,
                    'penjualan_total' => 0.0,
                ];
            }
            $jenisLines[$jenisKey]['penjualan_total'] += (float) $detail->subtotal;
            $jenisLines[$jenisKey]['hpp_total'] += (float) $this->fifoStockService->hppSalesReturn($detail);
        }

        $jurnal = $this->buatHeader($transaksi);

        foreach ($unitLines as $line) {
            $jurnal->details()->create([
                'akun_id' => $line['piutang']->id,
                'debit' => 0,
                'kredit' => $line['subtotal'],
            ]);
        }

        foreach ($jenisLines as $line) {
            $jurnal->details()->create([
                'akun_id' => $line['penjualan']->id,
                'debit' => $line['penjualan_total'],
                'kredit' => 0,
            ]);

            if ($line['hpp_total'] > 0) {
                $jurnal->details()->create([
                    'akun_id' => $line['stok']->id,
                    'debit' => $line['hpp_total'],
                    'kredit' => 0,
                ]);

                $jurnal->details()->create([
                    'akun_id' => $line['hpp']->id,
                    'debit' => 0,
                    'kredit' => $line['hpp_total'],
                ]);
            }
        }

        $this->kurangiEntitasDariRetur($transaksi, Piutang::class);

        return $jurnal;
    }

    /**
     * Retur mengurangi nilai tagihan asli (hutang/piutang) yang dibentuk dari
     * transaksi sumber, agar total agregasi per client tetap konsisten dengan
     * jurnal balik.
     *
     * @param  class-string<Hutang|Piutang>  $model
     */
    protected function kurangiEntitasDariRetur(Transaksi $retur, string $model): void
    {
        // Retur automatically creates journal details reversing the balance dynamically.
    }

    public function kembalikanEntitasDariRetur(Transaksi $retur, string $model): void
    {
        // Retur deletion automatically removes journal details restoring the balance dynamically.
    }

    /**
     * Jurnal hutang bertambah (tambah manual): menerima kas dari pihak lain.
     * Debit Kas, Kredit Hutang.
     */
    public function postTambahHutang(string $tanggal, int $clientId, float $total, ?string $keterangan, int $createdBy, int $akunPembayaranId, ?string $noHutang = null): Jurnal
    {
        $kas = $this->resolveKasAkun($akunPembayaranId);
        $hutangAkun = $this->resolveAkunHutang();

        if ($kas === null || $hutangAkun === null) {
            throw new \RuntimeException('Akun hutang atau akun kas tidak ditemukan. Pastikan minimal satu akun hutang (kategori liabilitas) dan satu akun kas tersedia.');
        }

        $noHutang = $noHutang ?: $this->generateNomor('HT', $tanggal);

        $jurnal = Jurnal::create([
            'nomor_jurnal' => $noHutang,
            'tanggal' => $tanggal,
            'client_id' => $clientId,
            'keterangan' => $keterangan ?: "Tambah Hutang [{$noHutang}]",
            'created_by' => $createdBy,
            'entitas_type' => 'hutang',
        ]);

        $jurnal->details()->create(['akun_id' => $kas->id, 'debit' => $total, 'kredit' => 0]);
        $jurnal->details()->create(['akun_id' => $hutangAkun->id, 'debit' => 0, 'kredit' => $total]);

        return $jurnal;
    }

    /**
     * Jurnal piutang bertambah (tambah manual): memberikan kas kepada pihak lain.
     * Debit Piutang, Kredit Kas.
     */
    public function postTambahPiutang(string $tanggal, int $clientId, float $total, ?string $keterangan, int $createdBy, int $akunPembayaranId, ?string $noPiutang = null): Jurnal
    {
        $kas = $this->resolveKasAkun($akunPembayaranId);
        $piutangAkun = $this->resolveAkunPiutang();

        if ($kas === null || $piutangAkun === null) {
            throw new \RuntimeException('Akun piutang atau akun kas tidak ditemukan. Pastikan minimal satu akun piutang (kategori aset) dan satu akun kas tersedia.');
        }

        $noPiutang = $noPiutang ?: $this->generateNomor('PT', $tanggal);

        $jurnal = Jurnal::create([
            'nomor_jurnal' => $noPiutang,
            'tanggal' => $tanggal,
            'client_id' => $clientId,
            'keterangan' => $keterangan ?: "Tambah Piutang [{$noPiutang}]",
            'created_by' => $createdBy,
            'entitas_type' => 'piutang',
        ]);

        $jurnal->details()->create(['akun_id' => $piutangAkun->id, 'debit' => $total, 'kredit' => 0]);
        $jurnal->details()->create(['akun_id' => $kas->id, 'debit' => 0, 'kredit' => $total]);

        return $jurnal;
    }

    /**
     * Jurnal pelunasan hutang: pembayaran kepada supplier.
     * Debit Hutang, Kredit Kas.
     */
    public function postPembayaranHutang(Jurnal $invoiceJurnal, string $tanggal, float $jumlah, ?string $keterangan, int $createdBy, int $akunPembayaranId): Jurnal
    {
        $invoiceJurnal->loadMissing('details.akun.kategori');
        $hutang = $invoiceJurnal->details
            ->map(fn ($d) => $d->akun)
            ->first(fn ($a) => $a?->system_code === 'hutang' || $a?->kategori?->jenis === 'liabilitas')
            ?? $this->resolveAkunHutang();

        $kas = $this->resolveKasAkun($akunPembayaranId);

        if ($hutang === null || $kas === null) {
            throw new \RuntimeException('Akun hutang pada faktur atau akun kas tidak ditemukan. Pastikan akun hutang dan kas tersedia.');
        }

        $noBayar = $this->generateNomor('BYR-HT', $tanggal);

        $jurnal = Jurnal::create([
            'nomor_jurnal' => $noBayar,
            'tanggal' => $tanggal,
            'client_id' => $invoiceJurnal->client_id,
            'keterangan' => $keterangan ?: "Pelunasan Hutang [{$invoiceJurnal->nomor_jurnal}]",
            'created_by' => $createdBy,
            'journalable_type' => Jurnal::class,
            'journalable_id' => $invoiceJurnal->id,
        ]);

        $jurnal->details()->create([
            'akun_id' => $hutang->id,
            'debit' => $jumlah,
            'kredit' => 0,
        ]);

        $jurnal->details()->create([
            'akun_id' => $kas->id,
            'debit' => 0,
            'kredit' => $jumlah,
        ]);

        return $jurnal;
    }

    /**
     * Jurnal penerimaan piutang: penerimaan dari customer.
     * Debit Kas, Kredit Piutang.
     */
    public function postPembayaranPiutang(Jurnal $invoiceJurnal, string $tanggal, float $jumlah, ?string $keterangan, int $createdBy, int $akunPembayaranId): Jurnal
    {
        $invoiceJurnal->loadMissing('details.akun.kategori');
        $piutang = $invoiceJurnal->details
            ->map(fn ($d) => $d->akun)
            ->first(fn ($a) => $a?->system_code === 'piutang' || ($a?->kategori?->jenis === 'aset' && ! in_array($a?->system_code, ['kas', 'stok'], true)))
            ?? $this->resolveAkunPiutang();

        $kas = $this->resolveKasAkun($akunPembayaranId);

        if ($kas === null || $piutang === null) {
            throw new \RuntimeException('Akun piutang pada faktur atau akun kas tidak ditemukan. Pastikan akun piutang dan kas tersedia.');
        }

        $noBayar = $this->generateNomor('BYR-PT', $tanggal);

        $jurnal = Jurnal::create([
            'nomor_jurnal' => $noBayar,
            'tanggal' => $tanggal,
            'client_id' => $invoiceJurnal->client_id,
            'keterangan' => $keterangan ?: "Pelunasan Piutang [{$invoiceJurnal->nomor_jurnal}]",
            'created_by' => $createdBy,
            'journalable_type' => Jurnal::class,
            'journalable_id' => $invoiceJurnal->id,
        ]);

        $jurnal->details()->create([
            'akun_id' => $kas->id,
            'debit' => $jumlah,
            'kredit' => 0,
        ]);

        $jurnal->details()->create([
            'akun_id' => $piutang->id,
            'debit' => 0,
            'kredit' => $jumlah,
        ]);

        return $jurnal;
    }

    /**
     * Menghapus jurnal pelunasan.
     */
    public function deletePembayaran(int $jurnalId): void
    {
        if ($jurnalId <= 0) {
            return;
        }

        $jurnal = Jurnal::find($jurnalId);

        if ($jurnal === null) {
            return;
        }

        $jurnal->details()->delete();
        $jurnal->delete();
    }

    /**
     * Jurnal stok opname: menyesuaikan nilai persediaan terhadap selisih hasil
     * opname fisik. Mengkredit/menghapus beban untuk selisih kurang dan mengkredit
     * akun terpilih untuk selisih lebih per rincian baris.
     */
    public function postStokOpname(StokOpname $opname): ?Jurnal
    {
        $stok = Akun::system('stok');
        $selisih = Akun::system('selisih_stok');

        if ($stok === null || $selisih === null) {
            return null;
        }

        $details = $opname->details()->with('bebans.akunBeban')->where('nilai_selisih', '!=', 0)->get();

        if ($details->isEmpty()) {
            return null;
        }

        $jurnal = Jurnal::create([
            'nomor_jurnal' => $this->generateNomor('JNL', $opname->tanggal->toDateString()),
            'tanggal' => $opname->tanggal,
            'client_id' => null,
            'keterangan' => "Stok Opname [{$opname->no_opname}]",
            'created_by' => $opname->created_by,
            'journalable_type' => $opname->getMorphClass(),
            'journalable_id' => $opname->id,
        ]);

        foreach ($details as $detail) {
            $nilai = (float) $detail->nilai_selisih;
            $garis = $detail->bebans;

            if ($garis->isEmpty()) {
                if ($nilai > 0) {
                    $jurnal->details()->create(['akun_id' => $stok->id, 'debit' => $nilai, 'kredit' => 0]);
                    $jurnal->details()->create(['akun_id' => $selisih->id, 'debit' => 0, 'kredit' => $nilai]);
                } else {
                    $abs = abs($nilai);
                    $jurnal->details()->create(['akun_id' => $selisih->id, 'debit' => $abs, 'kredit' => 0]);
                    $jurnal->details()->create(['akun_id' => $stok->id, 'debit' => 0, 'kredit' => $abs]);
                }

                continue;
            }

            foreach ($garis as $beban) {
                $nilaiBeban = (float) ($beban->nilai ?? 0);
                $akunId = $beban->akunBeban?->id ?? $selisih->id;

                if ($beban->arah === 'tambah') {
                    // Bertambah (+): Dr Stok, Cr Akun Terpilih
                    $jurnal->details()->create(['akun_id' => $stok->id, 'debit' => $nilaiBeban, 'kredit' => 0]);
                    $jurnal->details()->create(['akun_id' => $akunId, 'debit' => 0, 'kredit' => $nilaiBeban]);
                } else {
                    // Berkurang (-): Dr Akun Terpilih, Cr Stok
                    $jurnal->details()->create(['akun_id' => $akunId, 'debit' => $nilaiBeban, 'kredit' => 0]);
                    $jurnal->details()->create(['akun_id' => $stok->id, 'debit' => 0, 'kredit' => $nilaiBeban]);
                }
            }
        }

        $opname->update(['jurnal_id' => $jurnal->id]);

        return $jurnal;
    }

    /**
     * Menghapus jurnal stok opname tanpa melepas tautan agar history tetap tercatat.
     */
    public function deleteStokOpnameJurnal(?int $jurnalId): void
    {
        if ($jurnalId === null || $jurnalId <= 0) {
            return;
        }

        $jurnal = Jurnal::find($jurnalId);

        if ($jurnal === null) {
            return;
        }

        $jurnal->details()->delete();
        $jurnal->delete();
    }

    /**
     * Apakah jenis barang termasuk Pakan Curah (unit usaha terpisah).
     */
    protected function isPakanCurah(?JenisBarang $jenisBarang): bool
    {
        return $jenisBarang?->nama === 'Pakan Curah';
    }

    /**
     * Kunci pengelompokan untuk piutang/hutang: curah vs kelompok umum.
     */
    protected function unitKey(?JenisBarang $jenisBarang): string
    {
        if ($this->isPakanCurah($jenisBarang)) {
            return 'pakan-curah';
        }

        return $jenisBarang?->kelompok ?? '-';
    }

    /**
     * Mencari akun aktif berdasarkan nama (helper untuk menghindari duplikasi query).
     */
    protected function cariAkun(string $nama): ?Akun
    {
        return Akun::where('nama', $nama)->where('status', 'aktif')->first();
    }

    /**
     * Mencari akun aktif yang namanya diawali awalan tertentu, mis. "Hutang".
     */
    protected function cariAkunMulaiDengan(string $awalan): ?Akun
    {
        return Akun::where('nama', 'like', $awalan.'%')->where('status', 'aktif')->orderBy('id')->first();
    }

    /**
     * Menentukan akun stok berdasarkan jenis barang.
     * Pakan Curah → Stok Pakan Curah; lainnya berdasarkan kelompok.
     * Fallback ke akun sistem 'stok' jika akun spesifik tidak ditemukan.
     */
    protected function resolveStokAkun(?JenisBarang $jenisBarang): ?Akun
    {
        if ($this->isPakanCurah($jenisBarang)) {
            return Akun::system('stok_pakan_curah') ?? $this->cariAkun('Stok Pakan Curah');
        }

        $nama = match ($jenisBarang?->kelompok) {
            'telur' => 'Stok Telur',
            'pakan' => 'Stok Pakan',
            'obat' => 'Stok Obat-Obatan',
            'tray' => 'Stok Tray',
            default => null,
        };

        if ($nama !== null) {
            $akun = $this->cariAkun($nama);
            if ($akun !== null) {
                return $akun;
            }
        }

        return Akun::system('stok');
    }

    /**
     * Menentukan akun HPP dari kelompok jenis barang — hanya 5 akun HPP:
     * HPP Telur (semua jenis telur), HPP Tray, HPP Obat-Obatan, HPP Pakan,
     * dan HPP Curah (system_code hpp_pakan_curah). Kelompok yang tidak
     * dikenal memakai akun sistem 'hpp' tanpa membuat akun baru.
     */
    protected function resolveHppAkun(?JenisBarang $jenisBarang): ?Akun
    {
        if ($this->isPakanCurah($jenisBarang)) {
            return Akun::system('hpp_pakan_curah')
                ?? $this->cariAkun('HPP Curah')
                ?? $this->cariAkun('HPP Pakan Curah');
        }

        if ($jenisBarang === null) {
            return null;
        }

        $namaHpp = $this->namaHppKelompok($jenisBarang->kelompok);

        if ($namaHpp === null) {
            return Akun::system('hpp');
        }

        return $this->cariAkun($namaHpp)
            ?? $this->buatAkunHppKelompok($namaHpp)
            ?? Akun::system('hpp');
    }

    /**
     * Nama akun HPP untuk kelompok jenis barang.
     */
    protected function namaHppKelompok(?string $kelompok): ?string
    {
        return match ($kelompok) {
            'telur' => 'HPP Telur',
            'tray' => 'HPP Tray',
            'obat' => 'HPP Obat-Obatan',
            'pakan' => 'HPP Pakan',
            default => null,
        };
    }

    /**
     * Membuat kategori "HPP {namaHpp}" dan akun HPP-nya bila belum ada.
     */
    protected function buatAkunHppKelompok(string $namaHpp): ?Akun
    {
        $kategori = Kategori::firstOrCreate(
            ['nama' => $namaHpp],
            ['jenis' => 'beban', 'keterangan' => 'Harga Pokok Penjualan '.substr($namaHpp, 4), 'status' => 'aktif'],
        );

        $kode = $this->generateAkunKode('beban');

        if (Akun::where('kode', $kode)->exists()) {
            return null;
        }

        return Akun::create([
            'kode' => $kode,
            'nama' => $namaHpp,
            'kategori_id' => $kategori->id,
            'saldo_normal' => 'debit',
            'system_code' => null,
            'status' => 'aktif',
        ]);
    }

    /**
     * Menentukan akun hutang pembelian.
     * Pakan Curah → Hutang Pakan Curah.
     * Pakan/Obat/Tray → akun per client "Hutang {nama client}" yang dibuat
     * otomatis bila belum ada; Telur → Hutang Peternak; lainnya → Hutang
     * Supplier; fallback ke akun sistem.
     */
    protected function resolveHutangAkun(?JenisBarang $jenisBarang, ?Client $client = null): ?Akun
    {
        $kelompok = $jenisBarang?->kelompok;

        if ($this->isPakanCurah($jenisBarang)) {
            return $this->cariAkun('Saldo Bp.Supriyadi')
                ?? Akun::system('hutang_pakan_curah')
                ?? $this->cariAkun('Hutang Pakan Curah')
                ?? $this->cariAkun('Hutang Supplier');
        }

        if ($client !== null && in_array($kelompok, ['pakan', 'obat', 'tray'], true)) {
            return $this->resolveHutangClientAkun($kelompok, $client);
        }

        $nama = $kelompok === 'telur' ? 'Hutang Peternak' : 'Hutang Supplier';

        $akun = $this->cariAkun($nama);

        return $akun ?? Akun::system('hutang');
    }

    /**
     * Akun hutang per client: "Hutang {nama client}". Dibuat otomatis bila
     * belum ada; fallback ke akun sistem.
     */
    protected function resolveHutangClientAkun(string $kelompok, Client $client): ?Akun
    {
        $nama = 'Hutang '.$client->nama;

        $akun = $this->cariAkun($nama);

        if ($akun !== null) {
            return $akun;
        }

        return $this->buatAkunHutangClient($kelompok, $client) ?? Akun::system('hutang');
    }

    /**
     * Membuat akun hutang per client pada kategori liabilitas yang sesuai
     * kelompok barang, dengan kode otomatis mengikuti kode terakhir.
     */
    protected function buatAkunHutangClient(string $kelompok, Client $client): ?Akun
    {
        $kategori = $this->kategoriHutangUntukKelompok($kelompok);

        if ($kategori === null) {
            return null;
        }

        $kode = $this->generateAkunKode('liabilitas');

        if (Akun::where('kode', $kode)->exists()) {
            return null;
        }

        return Akun::create([
            'kode' => $kode,
            'nama' => 'Hutang '.$client->nama,
            'kategori_id' => $kategori->id,
            'saldo_normal' => 'kredit',
            'system_code' => null,
            'status' => 'aktif',
        ]);
    }

    /**
     * Kategori liabilitas untuk akun hutang per client, mengikuti gaya
     * pengelompokan akun hutang sejenis (Hutang Pakan/Obat/Tray). Apabila
     * kategori spesifik tidak ditemukan, memakai kategori liabilitas aktif
     * pertama.
     */
    protected function kategoriHutangUntukKelompok(string $kelompok): ?Kategori
    {
        $nama = match ($kelompok) {
            'pakan' => 'Hutang Pakan',
            'obat' => 'Hutang Obat',
            'tray' => 'Hutang Tray',
            default => null,
        };

        if ($nama !== null) {
            $kategori = Kategori::where('nama', $nama)->where('status', 'aktif')->first();

            if ($kategori !== null) {
                return $kategori;
            }
        }

        return Kategori::where('jenis', 'liabilitas')->where('status', 'aktif')->orderBy('id')->first();
    }

    /**
     * Kode akun otomatis sesuai pola {prefix jenis}{urutan 3 digit}.
     */
    protected function generateAkunKode(string $jenis): string
    {
        $prefix = match ($jenis) {
            'aset' => '1',
            'liabilitas' => '2',
            'ekuitas' => '3',
            'pendapatan' => '4',
            'beban' => '5',
            default => '9',
        };

        $terakhir = Akun::where('kode', 'like', $prefix.'%')->max('kode');
        $urutan = $terakhir === null ? 1 : ((int) substr($terakhir, -3)) + 1;

        return $prefix.str_pad((string) $urutan, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Menentukan akun piutang berdasarkan jenis barang dan tipe client.
     * Pakan Curah → Piutang Pakan Curah.
     * Pedagang → Piutang Pedagang; Peternak → Piutang Peternak;
     * Karyawan → Piutang Karyawan; fallback sistem.
     */
    protected function resolvePiutangAkun(?JenisBarang $jenisBarang, ?Client $client): ?Akun
    {
        if ($this->isPakanCurah($jenisBarang)) {
            return Akun::system('piutang_pakan_curah') ?? $this->cariAkun('Piutang Pakan Curah');
        }

        $nama = match ($client?->tipe) {
            'Pedagang' => 'Piutang Pedagang',
            'Peternak' => 'Piutang Peternak',
            'Karyawan' => 'Piutang Karyawan',
            default => null,
        };

        if ($nama !== null) {
            $akun = $this->cariAkun($nama);
            if ($akun !== null) {
                return $akun;
            }
        }

        return Akun::system('piutang');
    }

    /**
     * Menentukan akun penjualan berdasarkan jenis barang.
     * Nama akun = "Penjualan {nama_jenis}", dengan pengecualian:
     * - "Tray" → "Penjualan EggTray"
     * - "Obat-Obatan" → "Penjualan Obat-Obatan"
     * Fallback ke akun sistem 'penjualan'.
     */
    protected function resolvePenjualanAkun(?JenisBarang $jenisBarang): ?Akun
    {
        if ($jenisBarang === null) {
            return Akun::system('penjualan');
        }

        $namaJenis = $jenisBarang->nama;

        $namaAkun = match (true) {
            $namaJenis === 'Tray' => 'Penjualan EggTray',
            default => 'Penjualan '.$namaJenis,
        };

        $akun = $this->cariAkun($namaAkun);

        return $akun ?? Akun::system('penjualan');
    }

    /**
     * @param  object{id: int}  $journalable
     */
    protected function buatHeaderPembayaran(
        mixed $tanggal,
        ?int $clientId,
        int $createdBy,
        string $keterangan,
        object $journalable
    ): Jurnal {
        return Jurnal::create([
            'nomor_jurnal' => $this->generateNomor('JNL', $tanggal),
            'tanggal' => $tanggal,
            'client_id' => $clientId,
            'keterangan' => $keterangan,
            'created_by' => $createdBy,
            'journalable_type' => $journalable->getMorphClass(),
            'journalable_id' => $journalable->id,
        ]);
    }

    /**
     * Menentukan akun kas/bank: pilihan pengguna, akun sistem, atau kategori
     * "Kas" pada chart of accounts produksi (mis. "Kas Tunai").
     */
    public function resolveKasAkun(?int $akunId = null): ?Akun
    {
        if ($akunId) {
            $akun = Akun::where('id', $akunId)->where('status', 'aktif')->first();
            if ($akun) {
                return $akun;
            }
        }

        return $this->resolveAkunKas();
    }

    /**
     * Akun kas default untuk jurnal manual hutang/piutang.
     */
    public function resolveAkunKas(): ?Akun
    {
        return Akun::system('kas')
            ?? $this->cariAkun('Kas Tunai')
            ?? $this->cariAkunMulaiDengan('Kas')
            ?? Akun::where('status', 'aktif')
                ->whereHas('kategori', fn ($q) => $q->where('nama', 'like', 'Kas%'))
                ->orderBy('id')
                ->first();
    }

    /**
     * Akun hutang default: akun sistem, nama berawalan "Hutang", atau kategori
     * liabilitas pertama pada chart of accounts produksi.
     */
    public function resolveAkunHutang(): ?Akun
    {
        return Akun::system('hutang')
            ?? $this->cariAkun('Hutang Peternak')
            ?? $this->cariAkunMulaiDengan('Hutang')
            ?? Akun::where('status', 'aktif')
                ->whereHas('kategori', fn ($q) => $q->where('jenis', 'liabilitas'))
                ->orderBy('id')
                ->first();
    }

    /**
     * Akun piutang default: akun sistem, nama berawalan "Piutang", atau
     * kategori aset non stok/kas/bank pertama pada chart of accounts produksi.
     */
    public function resolveAkunPiutang(): ?Akun
    {
        return Akun::system('piutang')
            ?? $this->cariAkun('Piutang Peternak')
            ?? $this->cariAkunMulaiDengan('Piutang')
            ?? Akun::where('status', 'aktif')
                ->whereHas('kategori', fn ($q) => $q->where('jenis', 'aset')
                    ->where('nama', 'not like', 'Stok%')
                    ->where('nama', 'not like', 'Kas%')
                    ->where('nama', 'not like', 'Bank%'))
                ->orderBy('id')
                ->first();
    }

    /**
     * Membatalkan jurnal dan catatan hutang/piutang yang ditautkan.
     */
    public function deleteFromTransaksi(Transaksi $transaksi): void
    {
        foreach ($transaksi->jurnals as $jurnal) {
            // Also delete any payment journals linked to this invoice journal
            $paymentJurnals = Jurnal::where('journalable_type', Jurnal::class)
                ->where('journalable_id', $jurnal->id)
                ->get();
            foreach ($paymentJurnals as $pj) {
                $pj->details()->delete();
                $pj->delete();
            }

            $jurnal->details()->delete();
            $jurnal->delete();
        }
    }

    protected function buatHeader(Transaksi $transaksi): Jurnal
    {
        return Jurnal::create([
            'nomor_jurnal' => $this->generateNomor('JNL', $transaksi->tanggal),
            'tanggal' => $transaksi->tanggal,
            'client_id' => $transaksi->client_id,
            'keterangan' => $this->keteranganSumber($transaksi),
            'created_by' => $transaksi->created_by,
            'journalable_type' => $transaksi->getMorphClass(),
            'journalable_id' => $transaksi->id,
        ]);
    }

    protected function keteranganSumber(Transaksi $transaksi): string
    {
        $tipe = match ($transaksi->tipe_transaksi) {
            'pembelian' => 'Pembelian',
            'penjualan' => 'Penjualan',
            'pembelian_retur' => 'Retur Pembelian',
            'penjualan_retur' => 'Retur Penjualan',
            default => ucfirst($transaksi->tipe_transaksi),
        };

        return "[{$tipe}] {$transaksi->nomor_transaksi}";
    }

    protected function generateNomor(string $prefix, string $tanggal): string
    {
        $datePart = str_replace('-', '', $tanggal);

        $last = Jurnal::where('nomor_jurnal', 'like', "{$prefix}-{$datePart}-%")
            ->orderByDesc('id')
            ->value('nomor_jurnal');

        $sequence = $last ? (int) substr($last, -4) + 1 : 1;

        return sprintf('%s-%s-%04d', $prefix, $datePart, $sequence);
    }
}
