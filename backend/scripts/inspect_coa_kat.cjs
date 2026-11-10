const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kat71 = await prisma.jurnalDetail.count({ where: { kategoriId: 71 } });
  const coa71 = await prisma.jurnalDetail.count({ where: { coaId: 71 } });
  const both71 = await prisma.jurnalDetail.count({ where: { coaId: 71, kategoriId: 71 } });
  console.log({ kat71, coa71, both71 });
}

main().catch(console.error).finally(() => prisma.$disconnect());
