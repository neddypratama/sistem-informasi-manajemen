const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(`SHOW TABLES FROM bimapratama`);
  console.table(tables);
}

main().catch(console.error).finally(() => prisma.$disconnect());
