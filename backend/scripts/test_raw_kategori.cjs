const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.$queryRaw`
    SELECT 
      k.id as kategori_id,
      k.name as kategori_name,
      dk.id as detail_kategori_id,
      dk.name as group_name
    FROM detail_kategoris dk
    JOIN kategoris k ON k.detail_kategori_id = dk.id
    LIMIT 5
  `;
  console.log("Raw query test:", r);
}

main().catch(console.error).finally(() => prisma.$disconnect());
