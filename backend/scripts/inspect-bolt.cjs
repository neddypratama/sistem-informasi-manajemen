const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldBatches = await prisma.$queryRawUnsafe(`
    SELECT id, barang_id, qty_masuk, qty_sisa, harga, tanggal
    FROM bimapratama.stok_batches
    WHERE barang_id = 127
  `);
  console.log('Old batches for BOLT KUNING (127):', oldBatches);

  const newBatches = await prisma.$queryRawUnsafe(`
    SELECT id, barang_id, qty_masuk, qty_sisa, harga_beli, tanggal
    FROM bimapratama_v2.stok_batches
    WHERE barang_id = 127
  `);
  console.log('New batches for BOLT KUNING (127):', newBatches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
