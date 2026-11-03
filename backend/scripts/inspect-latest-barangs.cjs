const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const latestOld = await prisma.$queryRawUnsafe(`
    SELECT b.id, b.name, b.jenis_id, b.created_at
    FROM bimapratama.barangs b
    ORDER BY b.id DESC
    LIMIT 10
  `);
  console.log('Latest 10 in bimapratama:');
  console.table(latestOld);

  const latestNew = await prisma.$queryRawUnsafe(`
    SELECT b.id, b.name, b.code, b.jenis_id, b.created_at
    FROM bimapratama_v2.barangs b
    ORDER BY b.id DESC
    LIMIT 10
  `);
  console.log('Latest 10 in bimapratama_v2:');
  console.table(latestNew);

  const cols = await prisma.$queryRawUnsafe(`DESCRIBE bimapratama_v2.barangs`);
  console.log('Columns of bimapratama_v2.barangs:');
  console.table(cols);
}

main().catch(console.error).finally(() => prisma.$disconnect());
