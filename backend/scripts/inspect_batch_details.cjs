const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const b15 = await prisma.stokBatch.findMany({
    where: { barangId: 15n },
    orderBy: { id: 'asc' }
  });
  console.log(`Total batches for Horen DM (15): ${b15.length}`);
  const totalMasuk = b15.reduce((a, b) => a + Number(b.qtyMasuk), 0);
  const totalSisa = b15.reduce((a, b) => a + Number(b.qtySisa), 0);
  console.log(`Total Masuk: ${totalMasuk}, Total Sisa: ${totalSisa}`);

  const b16 = await prisma.stokBatch.findMany({
    where: { barangId: 16n },
    orderBy: { id: 'asc' }
  });
  console.log(`Total batches for Horen SB (16): ${b16.length}`);
  console.log(`Total Masuk: ${b16.reduce((a, b) => a + Number(b.qtyMasuk), 0)}, Total Sisa: ${b16.reduce((a, b) => a + Number(b.qtySisa), 0)}`);

  // Let's check opname 6411 (Horen DM)
  const opn6411 = await prisma.stokOpname.findUnique({
    where: { id: 6411n }
  });
  console.log("Opn 6411:", opn6411);
}

main().finally(() => prisma.$disconnect());
