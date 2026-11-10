const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mysql = require('mysql2/promise');

async function main() {
  console.log('=== COMPARING KAS DEBY TRANSACTIONS ===');

  // 1. Get all journal details for Kas Deby (kategori_id = 71 or coa_id = 71) in v2
  const v2Journals = await prisma.$queryRaw`
    SELECT 
      ju.id as jurnal_id,
      ju.nomor_jurnal,
      ju.tanggal,
      ju.keterangan as ju_keterangan,
      ju.transaksi_id,
      jd.debit,
      jd.kredit,
      t.invoice,
      t.type as tx_type,
      t.status as tx_status,
      t.keterangan as tx_keterangan
    FROM jurnal_details jd
    JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
    LEFT JOIN transaksis t ON t.id = ju.transaksi_id
    WHERE jd.kategori_id = 71 OR jd.coa_id = 71
    ORDER BY ju.tanggal ASC, ju.id ASC
  `;
  console.log('v2 Journals count:', v2Journals.length);

  // 2. Connect to SIM Lama (bimapratama)
  const oldConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bimapratama',
  });

  const [cols] = await oldConn.query('DESCRIBE transaksis');
  console.log('Old transaksis columns:', cols.map(c => c.Field));
  const [dtCols] = await oldConn.query('DESCRIBE detail_transaksis');
  console.log('Old detail_transaksis columns:', dtCols.map(c => c.Field));

  const [oldTxs] = await oldConn.query(`
    SELECT 
      t.id,
      t.tanggal,
      t.type,
      t.status,
      dt.kategori_id,
      dt.sub_total
    FROM transaksis t
    JOIN detail_transaksis dt ON dt.transaksi_id = t.id
    WHERE dt.kategori_id = 71
    ORDER BY t.tanggal ASC, t.id ASC
  `);
  console.log('Old SIM Txs count:', oldTxs.length);

  // Let's inspect any entry with 50.000.000
  console.log('\n--- v2 Entries with 50.000.000 ---');
  for (const j of v2Journals) {
    if (Number(j.debit) === 50000000 || Number(j.kredit) === 50000000) {
      console.log(`v2 JUR: [${j.tanggal.toISOString().slice(0, 10)}] ${j.nomor_jurnal} | Tx: ${j.invoice} (${j.tx_type}) | D: ${j.debit} | K: ${j.kredit} | Ket: ${j.ju_keterangan || j.tx_keterangan}`);
    }
  }

  console.log('\n--- Old SIM Entries with 50.000.000 ---');
  for (const t of oldTxs) {
    if (Number(t.sub_total) === 50000000) {
      console.log(`Old TX: [${new Date(t.tanggal).toISOString().slice(0, 10)}] ${t.kode_transaksi} | Type: ${t.type} | Subtotal: ${t.sub_total} | Ket: ${t.t_keterangan || t.dt_keterangan}`);
    }
  }

  // Let's find entries in v2 that do not exist in SIM lama or vice versa
  console.log('\n--- v2 Kredit entries in November 2026 ---');
  for (const j of v2Journals) {
    const tglStr = j.tanggal.toISOString().slice(0, 10);
    if (tglStr >= '2026-11-01') {
      console.log(`Nov v2: [${tglStr}] ${j.nomor_jurnal} | Tx: ${j.invoice} (${j.tx_type}) | D: ${j.debit} | K: ${j.kredit} | Ket: ${j.ju_keterangan || j.tx_keterangan}`);
    }
  }

  console.log('\n--- Old SIM entries in November 2026 ---');
  for (const t of oldTxs) {
    const tglStr = new Date(t.tanggal).toISOString().slice(0, 10);
    if (tglStr >= '2026-11-01') {
      console.log(`Nov Old: [${tglStr}] ${t.kode_transaksi} | Type: ${t.type} | Subtotal: ${t.sub_total} | Ket: ${t.t_keterangan || t.dt_keterangan}`);
    }
  }

  await oldConn.end();
}

main().catch(console.error).finally(() => prisma.$disconnect());
