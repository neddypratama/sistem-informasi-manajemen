const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldItem = await prisma.$queryRawUnsafe(`
    SELECT * FROM bimapratama.barangs WHERE id = 158
  `);
  console.log('Old Barang 158:', oldItem);

  const oldBatches = await prisma.$queryRawUnsafe(`
    SELECT * FROM bimapratama.stok_batches WHERE barang_id = 158
  `);
  console.log('Old Batches for 158:', oldBatches);

  const oldTxDetails = await prisma.$queryRawUnsafe(`
    SELECT * FROM bimapratama.detail_transaksis WHERE barang_id = 158
  `);
  console.log('Old Tx Details for 158 count:', oldTxDetails.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
