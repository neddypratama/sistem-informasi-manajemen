const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ReportsService } = require('../dist/modules/reports/reports.service');

async function testScenario(label, startDate, endDate) {
  console.log(`\n======================================================`);
  console.log(`SCENARIO: ${label} (start: ${startDate || 'null'}, end: ${endDate || 'null'})`);
  console.log(`======================================================`);

  const reportsService = new ReportsService(prisma);
  const result = await reportsService.getLaporanAset(startDate, endDate);

  console.log(`Total Aset      : Rp ${result.totalAset.toLocaleString('id-ID')}`);
  console.log(`Total Liabilitas: Rp ${result.totalLiabilitas.toLocaleString('id-ID')}`);
  console.log(`Modal Bersih    : Rp ${result.totalModal.toLocaleString('id-ID')}`);

  console.log("\nRincian Liabilitas (Hutang):");
  for (const g of result.liabilitasGroups) {
    console.log(`[Group] ${g.group} - Total: Rp ${g.total.toLocaleString('id-ID')}`);
    for (const d of g.details) {
      if (d.saldo !== 0 || d.kategori.includes('Supriyadi') || d.kategori.includes('Peternak') || d.kategori.includes('Pedagang')) {
        console.log(`   - ${d.kategori}: Rp ${Number(d.saldo).toLocaleString('id-ID')}`);
      }
    }
  }

  console.log("\nRincian Piutang / Aset Terkait:");
  for (const g of result.asetGroups) {
    if (g.group.includes('Piutang') || g.group.includes('Stok') || g.group.includes('Kas')) {
      console.log(`[Group] ${g.group} - Total: Rp ${g.total.toLocaleString('id-ID')}`);
      for (const d of g.details) {
        if (d.saldo !== 0 || d.kategori.includes('Supriyadi')) {
          console.log(`   - ${d.kategori}: Rp ${Number(d.saldo).toLocaleString('id-ID')}`);
        }
      }
    }
  }
}

async function main() {
  await testScenario("1. SEMUA WAKTU (Tanpa Filter)", undefined, undefined);
  await testScenario("2. RENTANG SAMPAI HARI INI (01 Nov - 07 Nov)", '2026-11-01', '2026-11-07');
  await testScenario("3. PER TGL 31 OKT (End: 2026-10-31)", undefined, '2026-10-31');
  await testScenario("4. BULAN OKTOBER (01 Okt - 31 Okt)", '2026-10-01', '2026-10-31');
}

main().catch(console.error).finally(() => prisma.$disconnect());
