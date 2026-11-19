const { PrismaClient } = require('../node_modules/@prisma/client');
const { ReportsService } = require('../dist/modules/reports/reports.service.js');
const prisma = new PrismaClient();
const service = new ReportsService(prisma);

async function runTests() {
  console.log('Testing getBonTitipan...');
  
  // 1. All
  const all = await service.getBonTitipan();
  console.log('1. All clients:', all.ringkasan.totalMitra, 'Total Piutang:', all.ringkasan.totalPiutang, 'Total Hutang:', all.ringkasan.totalHutang);
  
  // 2. Karyawan
  const karyawan = await service.getBonTitipan('', 'Karyawan');
  console.log('2. Karyawan clients:', karyawan.ringkasan.totalMitra, 'Total Piutang:', karyawan.ringkasan.totalPiutang, 'Total Hutang:', karyawan.ringkasan.totalHutang);
  
  // 3. Karyawan with saldo only
  const karyawanSaldo = await service.getBonTitipan('', 'Karyawan', 'HAS_SALDO');
  console.log('3. Karyawan with saldo:', karyawanSaldo.ringkasan.totalMitra, 'Total Piutang:', karyawanSaldo.ringkasan.totalPiutang);
  
  // 4. Case-insensitive / legacy variants
  const peternakUpper = await service.getBonTitipan('', 'PETERNAK');
  console.log('4. PETERNAK upper:', peternakUpper.ringkasan.totalMitra);

  const suplierLegacy = await service.getBonTitipan('', 'suplier');
  console.log('5. suplier lower:', suplierLegacy.ringkasan.totalMitra);

  const ekspedisiLegacy = await service.getBonTitipan('', 'ekspedisi');
  console.log('6. ekspedisi legacy:', ekspedisiLegacy.ringkasan.totalMitra);

  // 7. Search
  const searchSyah = await service.getBonTitipan('Syah');
  console.log('7. Search Syah:', searchSyah.ringkasan.totalMitra, searchSyah.items.map(i => ({ name: i.name, type: i.type, bon: i.bon })));

  console.log('ALL TESTS PASSED SUCCESSFULLY!');
}

runTests()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
