const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bkBatches = await prisma.stokBatch.findMany({
    where: {
      barangId: 2n, // BK
      tanggal: { gte: new Date('2026-11-02'), lte: new Date('2026-11-03') }
    }
  });
  console.log("BK Batches around 02 Nov:", bkBatches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
