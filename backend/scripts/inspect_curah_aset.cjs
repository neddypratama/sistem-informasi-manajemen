const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mysql = require('mysql2/promise');

async function main() {
  console.log('=== 1. JURNAL DETAILS FOR KATEGORI 89 (Stok Curah) ===');
  const jds = await prisma.jurnalDetail.findMany({
    where: { kategoriId: 89n },
    include: {
      jurnal: true
    }
  });
  console.log(`Found ${jds.length} jurnal details for kategori 89:`);
  for (const jd of jds) {
    console.log(`- Jurnal [${jd.jurnalId}] ${jd.jurnal.nomorJurnal} tgl:${jd.jurnal.tanggal.toISOString().slice(0, 10)} D:${jd.debit} K:${jd.kredit} ket:${jd.jurnal.keterangan}`);
  }

  console.log('\n=== 2. CURRENT LAPORAN ASET CALL ===');
  const reportsService = new (require('../dist/modules/reports/reports.service').ReportsService)(prisma);
  const asetReport = await reportsService.getLaporanAset();
  console.log('Total Aset:', asetReport.totalAset);
  console.log('Total Liabilitas:', asetReport.totalLiabilitas);
  console.log('Total Modal:', asetReport.totalModal);
  console.log('\nAset Groups:');
  for (const g of asetReport.asetGroups) {
    console.log(`- Group: "${g.group}" (DK ID: ${g.detailKategoriId}), Total: ${g.total}`);
    for (const d of g.details) {
      if (d.saldo !== 0 || g.group.toLowerCase().includes('curah') || d.kategori.toLowerCase().includes('curah')) {
        console.log(`    * [${d.kategoriId}] ${d.kategori}: ${d.saldo}`);
      }
    }
  }

  console.log('\n=== 3. CHECK SIM LAMA (bimapratama) ===');
  const oldConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bimapratama'
  });

  const [oldDks] = await oldConn.query('SELECT * FROM detail_kategoris WHERE type IN ("Aset", "Liabilitas")');
  console.log('SIM Lama DK Aset/Liabilitas count:', oldDks.length);
  for (const dk of oldDks) {
    console.log(`- SIM Lama DK [${dk.id}] ${dk.name} (${dk.type})`);
  }

  const [oldKats] = await oldConn.query('SELECT * FROM kategoris WHERE name LIKE "%curah%"');
  console.log('SIM Lama kategoris with curah:', oldKats);

  await oldConn.end();
}

main().catch(console.error).finally(() => prisma.$disconnect());
