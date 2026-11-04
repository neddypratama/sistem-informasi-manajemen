const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    DESCRIBE bimapratama.transaksis
  `);
  console.log("Cols in bimapratama.transaksis:", cols.map(c => c.Field));
}

main().finally(() => prisma.$disconnect());
