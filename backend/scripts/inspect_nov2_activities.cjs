const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING ALL RECORDS CREATED ON 2026-11-02 ===');

  const jurs = await prisma.jurnalUmum.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-11-02 13:30:00Z'),
        lte: new Date('2026-11-02 14:30:00Z')
      }
    },
    include: { details: { include: { kategori: true } } },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`Total jurnals created on 2026-11-02: ${jurs.length}`);
  for (const j of jurs) {
    console.log(`[${j.createdAt.toISOString()}] (tgl: ${j.tanggal.toISOString().slice(0, 10)}) ${j.nomorJurnal} | ${j.keterangan}`);
    for (const d of j.details) {
      console.log(`   - ${d.kategori?.name} (id: ${d.kategoriId}) D: ${d.debit} K: ${d.kredit}`);
    }
  }

  // Also check transaksis created on 2026-11-02
  const txs = await prisma.transaksi.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-11-02 00:00:00'),
        lte: new Date('2026-11-02 23:59:59')
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`\nTotal transaksis created on 2026-11-02: ${txs.length}`);
  for (const t of txs) {
    console.log(`[${t.createdAt.toISOString()}] (tgl: ${t.tanggal.toISOString().slice(0, 10)}) ${t.invoice} ${t.type} ${t.paymentMethod} Total: ${t.total} | ${t.keterangan}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
