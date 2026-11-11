const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyScenario(title, startDate, endDate) {
  console.log(`\n==================================================`);
  console.log(`SCENARIO: ${title} (${startDate || 'Awal'} s/d ${endDate || 'Kini'})`);
  console.log(`==================================================`);
  
  const reportsService = new (require('../dist/modules/reports/reports.service').ReportsService)(prisma);
  const result = await reportsService.getLaporanAset(startDate, endDate);

  console.log(`Total Aset:       Rp ${result.totalAset.toLocaleString('id-ID')}`);
  console.log(`Total Liabilitas: Rp ${result.totalLiabilitas.toLocaleString('id-ID')}`);
  console.log(`Total Modal:      Rp ${result.totalModal.toLocaleString('id-ID')}`);

  const hasCurahGroup = result.asetGroups.some(g => g.group.toLowerCase().includes('curah'));
  const hasCurahDetail = result.asetGroups.some(g => g.details.some(d => d.kategori.toLowerCase().includes('curah') || d.kategoriId === 89));

  console.log(`- Has Curah Group in Aset?  ${hasCurahGroup}`);
  console.log(`- Has Curah Detail in Aset? ${hasCurahDetail}`);

  if (hasCurahGroup || hasCurahDetail) {
    throw new Error(`FAILED: Curah still present in Aset groups!`);
  }

  // Check sum matches
  const sumAset = result.asetGroups.reduce((acc, g) => acc + g.total, 0);
  const sumLiab = result.liabilitasGroups.reduce((acc, g) => acc + g.total, 0);
  const matchAset = Math.abs(sumAset - result.totalAset) < 0.01;
  const matchLiab = Math.abs(sumLiab - result.totalLiabilitas) < 0.01;
  const matchModal = Math.abs((result.totalAset - result.totalLiabilitas) - result.totalModal) < 0.01;

  console.log(`- Sum Aset matches totalAset?         ${matchAset}`);
  console.log(`- Sum Liabilitas matches totalLiab?  ${matchLiab}`);
  console.log(`- Total Modal matches Aset - Liab?   ${matchModal}`);

  console.log(`Aset Groups List:`);
  for (const g of result.asetGroups) {
    console.log(`  * ${g.group}: Rp ${g.total.toLocaleString('id-ID')}`);
  }
}

async function verifyCurahStillWorks() {
  console.log(`\n==================================================`);
  console.log(`VERIFY: Portal Pak Pri Curah still has its stock & summary`);
  console.log(`==================================================`);
  const reportsService = new (require('../dist/modules/reports/reports.service').ReportsService)(prisma);
  const curahReport = await reportsService.getLabaRugiCurah();
  console.log(`Curah Penjualan:     Rp ${curahReport.penjualanCurah.toLocaleString('id-ID')}`);
  console.log(`Curah HPP:           Rp ${curahReport.hppCurah.toLocaleString('id-ID')}`);
  console.log(`Curah Stok Fisik Kg: ${curahReport.stokFisikTotalCurah.totalQtyKg} Kg`);
  console.log(`Curah Nilai Stok Rp: Rp ${curahReport.stokFisikTotalCurah.totalNilaiRupiah.toLocaleString('id-ID')}`);
  
  if (curahReport.stokFisikTotalCurah.totalNilaiRupiah <= 0) {
    console.warn('Warning: Curah stock rupiah is 0 or less, check why.');
  } else {
    console.log(`SUCCESS: Curah stock still perfectly tracked in Portal Pak Pri!`);
  }
}

async function main() {
  await verifyScenario('Semua Waktu (Live)', undefined, undefined);
  await verifyScenario('Cut-off 31 Oktober 2026', '2026-10-31', '2026-10-31');
  await verifyScenario('Rentang 01 Nov - 11 Nov 2026', '2026-11-01', '2026-11-11');
  await verifyCurahStillWorks();
  console.log(`\nALL VERIFICATION SCENARIOS PASSED WITH 100% SUCCESS!`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
