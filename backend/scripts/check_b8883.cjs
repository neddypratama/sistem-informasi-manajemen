const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const b = await prisma.stokBatch.findMany({
    where: { barangId: 15n },
    orderBy: { id: 'desc' },
    take: 3
  });
  console.log("Last 3 batches for Horen DM (15):", b);

  // Check opname 6411
  const op = await prisma.stokOpname.findUnique({
    where: { id: 6411n },
    include: { jurnal: { include: { details: true } } }
  });
  console.log("Opname 6411 jurnal:", op.jurnal);
}

main().finally(() => prisma.$disconnect());
