import mysql from 'mysql2/promise';

async function analyzeLegacyData() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bimapratama',
  });

  console.log('🔍 Menganalisis seluruh 83.000+ data transaksi lama...');

  // 1. Group all by date and hash
  const [groups] = await conn.query<any[]>(`
    SELECT 
      DATE_FORMAT(t.tanggal, '%Y-%m-%d') as tgl,
      SUBSTRING_INDEX(t.invoice, '-', -1) as hash_code,
      COUNT(DISTINCT t.id) as tx_count,
      GROUP_CONCAT(DISTINCT k.name SEPARATOR ' | ') as categories,
      GROUP_CONCAT(DISTINCT t.name SEPARATOR ' | ') as names,
      SUM(CASE WHEN t.type = 'Debit' THEN t.total ELSE 0 END) as total_debit
    FROM transaksis t
    JOIN detail_transaksis dt ON dt.transaksi_id = t.id
    JOIN kategoris k ON dt.kategori_id = k.id
    WHERE t.invoice LIKE 'INV-%'
    GROUP BY tgl, hash_code
  `);

  console.log(`Total Peristiwa Bisnis Unik (Groups): ${groups.length}`);

  let penjualanCount = 0;
  let pembelianCount = 0;
  let opnameCount = 0;
  let kasMutasiCount = 0;
  let lainnyaCount = 0;

  for (const g of groups) {
    const cats = g.categories || '';
    const hasStok = cats.includes('Stok');
    const hasPeternak = cats.includes('Peternak');
    const hasPenjualan = cats.includes('Penjualan');

    if (hasPenjualan) {
      penjualanCount++;
    } else if (hasStok && hasPeternak) {
      pembelianCount++;
    } else if (hasStok && !hasPeternak) {
      opnameCount++;
    } else if (cats.includes('Kas') || cats.includes('Bank') || cats.includes('Beban') || cats.includes('Biaya')) {
      kasMutasiCount++;
    } else {
      lainnyaCount++;
    }
  }

  console.log('📊 Rekapitulasi Klasifikasi Peristiwa Bisnis:');
  console.log(`   - Penjualan Murni           : ${penjualanCount} transaksi`);
  console.log(`   - Pembelian Peternak Murni  : ${pembelianCount} transaksi`);
  console.log(`   - Opname Stok / Saldo Awal  : ${opnameCount} transaksi (BUKAN Pembelian!)`);
  console.log(`   - Kas / Bank / Beban Operasional: ${kasMutasiCount} transaksi`);
  console.log(`   - Lain-lain                 : ${lainnyaCount} transaksi`);
  console.log(`   -------------------------------------------------`);
  console.log(`   TOTAL TRANSAKSI BERSIH      : ${penjualanCount + pembelianCount + opnameCount + kasMutasiCount + lainnyaCount} peristiwa`);
  console.log(`   (Turun dari 83.615 baris sampah multi-faktur menjadi ~${groups.length} peristiwa rapi!)`);

  await conn.end();
}

analyzeLegacyData();
