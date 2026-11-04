const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const b = await prisma.stokBatch.findUnique({
    where: { id: 8883n }
  });
  console.log("Batch 8883 in v2:", b);

  // Check all batches where updatedAt is today
  const touchedToday = await prisma.stokBatch.findMany({
    where: {
      updatedAt: { gte: new Date('2026-11-03T05:00:00.000Z') }
    }
  });
  console.log("Batches touched today count:", touchedToday.length);
  console.log("Sample touched today:", touchedToday.slice(0, 10).map(x => ({
    id: x.id.toString(),
    barangId: x.barangId.toString(),
    qtyMasuk: Number(x.qtyMasuk),
    qtySisa: Number(x.qtySisa),
    updatedAt: x.updatedAt
  })));
}

main().finally(() => prisma.$disconnect());
