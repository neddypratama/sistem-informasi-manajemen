const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldTables = await prisma.$queryRawUnsafe('SHOW TABLES FROM bimapratama');
  console.log('Tables in bimapratama:', oldTables.map(t => Object.values(t)[0]));

  // Check if there is stoks or similar
  const stokTable = await prisma.$queryRawUnsafe('DESCRIBE bimapratama.stoks').catch(e => e.message);
  console.log('Describe bimapratama.stoks:', stokTable);

  const barangsTable = await prisma.$queryRawUnsafe('DESCRIBE bimapratama.barangs').catch(e => e.message);
  console.log('Describe bimapratama.barangs:', barangsTable);
}

main().catch(console.error).finally(() => prisma.$disconnect());
