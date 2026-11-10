const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const around = await prisma.jurnalUmum.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-11-02 14:00:00'),
        lte: new Date('2026-11-02 14:30:00')
      }
    },
    include: { details: { include: { kategori: true } } }
  });
  console.log('Jurnals created around 14:10 on 2 Nov:', around.length);
  for (const j of around) {
    console.log(`[${j.createdAt.toISOString()}] ${j.nomorJurnal} | ${j.keterangan}`);
    for (const d of j.details) {
      console.log(`   - ${d.kategori?.name} D: ${d.debit} K: ${d.kredit}`);
    }
  }

  // Also check logs or history from transcript around 2026-11-02
}

main().catch(console.error).finally(() => prisma.$disconnect());
