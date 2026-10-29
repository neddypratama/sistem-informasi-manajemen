# Rencana Migrasi Data Lama (Migration_Plan.md)
## Dari Legacy MySQL (v1.0) ke Skema Baru PostgreSQL/MySQL 8 (v2.0)

---

## 1. Tujuan & Prinsip Migrasi

Migrasi data dari sistem lama (`SIM_Bima_Pratama`) ke sistem baru memiliki mandat:
1. **Zero Data Loss:** Seluruh histori transaksi 1 tahun terakhir (penjualan, pembelian, retur, kas, piutang, hutang) wajib berpindah tanpa ada nominal yang selisih Rp 1 pun.
2. **Deduplikasi Invois (Normalisasi):** Menggabungkan 3 invoice lama yang terpecah (`INV-...-BON`, `INV-...-TLR`, `INV-...-HPP`) menjadi satu entitas transaksi riil dan satu pasang jurnal umum akuntansi.
3. **Rekonsiliasi Integritas Saldo:** Saldo akhir piutang pedagang dan hutang peternak di sistem baru harus 100% cocok dengan saldo akhir di sistem lama.

---

## 2. Tahapan Eksekusi Migrasi (ETL Process)

```
┌─────────────────────────┐
│  DATABASE LAMA (MySQL)  │
│  - transaksis (100k+)   │
│  - detail_transaksis    │
│  - stok_batches         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                 TAHAP 1: EKSTRAKSI & CLEANSING               │
│ - Ekspor data mentah ke staging sandbox                     │
│ - Filter & mapping ID Kategori ke Chart of Accounts (COA)   │
│ - Deteksi record yatim (orphan rows tanpa parent transaksi)  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                 TAHAP 2: TRANSFORMASI LOGIKA                │
│ - Satukan triplet invoice (-BON, -TLR, -HPP) ke 1 Header    │
│ - Bentuk entri jurnal umum debit & kredit berpasangan       │
│ - Validasi alokasi FIFO historis di stok_keluar_batches     │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                 TAHAP 3: PEMASUKAN DATA (LOAD)              │
│ - Masukkan Master Data (User, Client, Barang, Satuan)       │
│ - Masukkan Transaksi & Detail Transaksi baru                │
│ - Masukkan Jurnal Umum & Jurnal Detail                      │
│ - Generate Snapshot Saldo Bulanan (monthly_balances)        │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                 TAHAP 4: REKONSILIASI AKHIR                 │
│ - Cek saldo kas & bank per hari ini                         │
│ - Cek total piutang pedagang vs laporan lama                │
│ - Uji coba paralel (Dual-run test)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Skrip Algoritma Penggabungan Triple-Invoicing

Berikut adalah logika Python / Node.js migration script untuk menyatukan invoice yang terpecah:

```typescript
// Script Konversi Triplet Invoice ke Single Transaction + Journal
async function migrateSalesTransactions(legacyDb, newDb) {
  // 1. Ambil seluruh transaksi penjualan telur utama
  const salesHeaders = await legacyDb.query(`
    SELECT * FROM transaksis 
    WHERE invoice NOT LIKE '%-BON-%' 
      AND invoice NOT LIKE '%-TLR-%' 
      AND invoice NOT LIKE '%-HPP-%'
      AND type = 'Kredit'
  `);

  for (const sale of salesHeaders) {
    // Ekstrak kode unik tanggal dan nomor
    // Misal: INV-20251015-0012
    const invoiceBase = sale.invoice;
    const parts = invoiceBase.split('-');
    const tanggalPart = parts[1];
    const sequencePart = parts.slice(2).join('-');

    // Cari kembaran invoice BON, TLR, dan HPP
    const bonInv = `INV-${tanggalPart}-BON-${sequencePart}`;
    const tlrInv = `INV-${tanggalPart}-TLR-${sequencePart}`;
    const hppInv = `INV-${tanggalPart}-HPP-${sequencePart}`;

    const [hppRecord] = await legacyDb.query('SELECT total FROM transaksis WHERE invoice = ?', [hppInv]);
    const totalHpp = hppRecord ? Number(hppRecord.total) : 0;

    // 2. Insert ke tabel transaksis baru (Satu Header Bersih)
    const newTx = await newDb.transaksi.create({
      data: {
        invoice: sale.invoice,
        tanggal: sale.tanggal,
        type: 'PENJUALAN',
        status: sale.status === 'Selesai' ? 'SELESAI' : 'BATAL',
        payment_method: 'KREDIT_BON',
        client_id: sale.client_id,
        user_id: sale.user_id,
        subtotal: sale.total,
        total: sale.total,
        keterangan: sale.name
      }
    });

    // 3. Salin detail item barang
    const details = await legacyDb.query('SELECT * FROM detail_transaksis WHERE transaksi_id = ?', [sale.id]);
    for (const d of details) {
      await newDb.detailTransaksi.create({
        data: {
          transaksi_id: newTx.id,
          barang_id: d.barang_id,
          qty: d.kuantitas,
          harga_satuan: d.value,
          subtotal: d.sub_total,
          total_hpp: totalHpp // HPP tertimbang
        }
      });
    }

    // 4. Bentuk Jurnal Umum Otomatis (Double Entry)
    if (sale.status === 'Selesai') {
      const jurnal = await newDb.jurnalUmum.create({
        data: {
          transaksi_id: newTx.id,
          nomor_jurnal: `JUR-${sale.invoice}`,
          tanggal: sale.tanggal,
          keterangan: `Penjualan Telur ${sale.invoice}`
        }
      });

      // Debit Piutang Usaha, Kredit Pendapatan Telur
      await newDb.jurnalDetail.createMany({
        data: [
          { jurnal_id: jurnal.id, coa_id: COA_PIUTANG, debit: sale.total, kredit: 0 },
          { jurnal_id: jurnal.id, coa_id: COA_PENDAPATAN_TELUR, debit: 0, kredit: sale.total },
          { jurnal_id: jurnal.id, coa_id: COA_HPP_TELUR, debit: totalHpp, kredit: 0 },
          { jurnal_id: jurnal.id, coa_id: COA_PERSEDIAAN_TELUR, debit: 0, kredit: totalHpp }
        ]
      });
    }
  }
}
```

---

## 4. Jadwal & Strategi Cutover (Peralihan Sistem)

Untuk mencegah gangguan operasional pada hari kerja:
1. **Hari H - 7:** Uji coba migrasi data tahap 1 ke database testing/staging, lakukan audit selisih saldo bersama bagian akuntansi.
2. **Hari H - 1 (Sabtu Sore setelah tutup toko):**
   * Bekukan sistem lama (Freeze/Maintenance mode).
   * Lakukan final data dump dari database MySQL lama.
   * Jalankan script ETL final ke database baru (estimasi waktu 15–30 menit untuk data 1 tahun).
   * Generate `monthly_account_balances` hingga bulan terakhir.
3. **Hari H (Minggu):** Verifikasi fisik stok dan cek saldo bon kasir.
4. **Hari H + 1 (Senin Pagi):** Kasir dan admin langsung mulai transaksi menggunakan sistem baru (React SPA). Sistem lama dijadikan arsip *read-only*.

---

## 5. Rencana Kontinjensi (Rollback Plan)

Jika pada hari pertama operasional ditemukan kendala kritis:
1. Database MySQL lama tetap utuh dan tidak dimodifikasi sama sekali (*read-only source*).
2. Jika perlu rollback darurat, sistem lama dapat diaktifkan kembali dalam waktu kurang dari 5 menit.
