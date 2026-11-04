const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    DESCRIBE bimapratama.detail_transaksis
  `);
  console.log("Cols in bimapratama.detail_transaksis:", cols.map(c => c.Field));
}

main().finally(() => prisma.$disconnect());
