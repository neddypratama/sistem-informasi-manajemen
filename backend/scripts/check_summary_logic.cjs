const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Let's check inventory summary logic from inventory.service.ts
  const b = await prisma.barang.findUnique({
    where: { id: 15n },
    include: {
      stokBatches: true
    }
  });

  const batches = b.stokBatches;
  const activeBatches = batches.filter(x => Number(x.qtySisa) > 0);
  console.log({
    barang: b.name,
    allBatchesCount: batches.length,
    activeBatchesCount: activeBatches.length,
    sumQtySisa: activeBatches.reduce((a, b) => a + Number(b.qtySisa), 0),
    sumQtyMasuk: batches.reduce((a, b) => a + Number(b.qtyMasuk), 0)
  });
}

main().finally(() => prisma.$disconnect());
