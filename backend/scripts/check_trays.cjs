const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const b = await prisma.stokBatch.findMany({
    where: { barangId: { in: [BigInt(13), BigInt(14), BigInt(17), BigInt(18)] } }
  });
  console.log('Batches in v2 count:', b.length);
  if (b.length > 0) {
    console.log('Batches:', b.map(x => ({
      id: x.id.toString(),
      barangId: x.barangId.toString(),
      qtyMasuk: Number(x.qtyMasuk),
      qtySisa: Number(x.qtySisa),
      hargaBeli: Number(x.hargaBeli),
      tanggal: x.tanggal
    })));
  }

  // Check in old db
  const oldBatches = await prisma.$queryRawUnsafe(`
    SELECT * FROM bimapratama.stok_batches WHERE barang_id IN (13, 14, 17, 18)
  `);
  console.log('Old batches count:', oldBatches.length);
  if (oldBatches.length > 0) {
    console.log('Old batches sample:', oldBatches.slice(0, 5));
  }
}

main().finally(() => prisma.$disconnect());
