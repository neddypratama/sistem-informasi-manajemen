const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sample = await prisma.$queryRawUnsafe(`
    SELECT s.*, b.name as barang_name
    FROM bimapratama.stoks s
    JOIN bimapratama.barangs b ON b.id = s.barang_id
    ORDER BY s.id DESC
    LIMIT 10
  `);
  console.log("Sample rows in bimapratama.stoks:", sample);
}

main().finally(() => prisma.$disconnect());
