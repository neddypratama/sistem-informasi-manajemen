const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mysql = require('mysql2/promise');

async function main() {
  console.log('=== CHECKING KAS DEBY IN SIM LAMA vs ERP V2 ===');

  // 1. Connect to SIM Lama (bimapratama)
  const oldConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bimapratama',
  });

  // In SIM lama, how does the Kas report / Mutasi Kas calculate Kas Deby?
  // Let's check all transaksis with kategori_id = 71 in SIM lama
  const [oldTxs] = await oldConn.query(`
    SELECT 
      t.id,
      t.invoice,
      t.tanggal,
      t.type,
      t.status,
      dt.sub_total
    FROM transaksis t
    JOIN detail_transaksis dt ON dt.transaksi_id = t.id
    WHERE dt.kategori_id = 71
    ORDER BY t.tanggal ASC, t.id ASC
  `);

  let oldDebit = 0;
  let oldKredit = 0;
  for (const t of oldTxs) {
    if (t.type.toLowerCase() === 'debit') {
      oldDebit += Number(t.sub_total);
    } else {
      oldKredit += Number(t.sub_total);
    }
  }

  console.log('SIM LAMA (bimapratama):');
  console.log(`- Total Transaksi: ${oldTxs.length}`);
  console.log(`- Total Debit (Pemasukan): Rp ${oldDebit.toLocaleString('id-ID')}`);
  console.log(`- Total Kredit (Pengeluaran): Rp ${oldKredit.toLocaleString('id-ID')}`);
  console.log(`- Saldo Akhir Kas Deby SIM Lama: Rp ${(oldDebit - oldKredit).toLocaleString('id-ID')}`);

  // 2. In v2
  const v2Jd = await prisma.$queryRaw`
    SELECT 
      jd.id,
      ju.nomor_jurnal,
      ju.tanggal,
      ju.keterangan,
      jd.debit,
      jd.kredit
    FROM jurnal_details jd
    JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
    LEFT JOIN transaksis t ON t.id = ju.transaksi_id
    WHERE (jd.kategori_id = 71 OR jd.coa_id = 71)
      AND (t.status IS NULL OR t.status != 'BATAL')
    ORDER BY ju.tanggal ASC, ju.id ASC
  `;

  let v2Debit = 0;
  let v2Kredit = 0;
  for (const j of v2Jd) {
    v2Debit += Number(j.debit || 0);
    v2Kredit += Number(j.kredit || 0);
  }

  console.log('\nERP V2 (bimapratama_v2):');
  console.log(`- Total Jurnal Kas Deby: ${v2Jd.length}`);
  console.log(`- Total Debit (Pemasukan): Rp ${v2Debit.toLocaleString('id-ID')}`);
  console.log(`- Total Kredit (Pengeluaran): Rp ${v2Kredit.toLocaleString('id-ID')}`);
  console.log(`- Saldo Akhir Kas Deby v2: Rp ${(v2Debit - v2Kredit).toLocaleString('id-ID')}`);

  console.log(`\nSELISIH V2 vs SIM LAMA: Rp ${((v2Debit - v2Kredit) - (oldDebit - oldKredit)).toLocaleString('id-ID')}`);

  // 3. Now let's check what transactions happened in v2 that were NOT from migration!
  // In migration, how were journals created? Let's check nomor_jurnal format in v2
  const nonMigrated = v2Jd.filter(j => !j.nomor_jurnal.startsWith('JUR-MIG-') && !j.nomor_jurnal.startsWith('JUR-TRX-'));
  console.log(`\nJurnal v2 yang BUKAN dari migrasi: ${nonMigrated.length}`);
  for (const j of nonMigrated) {
    console.log(`- [${j.tanggal.toISOString().slice(0, 10)}] ${j.nomor_jurnal} | D: Rp ${Number(j.debit).toLocaleString('id-ID')} | K: Rp ${Number(j.kredit).toLocaleString('id-ID')} | Ket: ${j.keterangan}`);
  }

  await oldConn.end();
}

main().catch(console.error).finally(() => prisma.$disconnect());
