const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const katul = await prisma.$queryRawUnsafe(`
    SELECT id, code, name, jenis_id, satuan_id FROM bimapratama_v2.barangs WHERE name LIKE '%Katul%'
  `);
  console.table(katul);
}

main().catch(console.error).finally(() => prisma.$disconnect());
