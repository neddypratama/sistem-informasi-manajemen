const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const batches = await prisma.$queryRawUnsafe(`
    SELECT id, barang_id, detail_transaksi_id, tanggal, qty_masuk, qty_sisa, harga_beli
    FROM bimapratama_v2.stok_batches
    WHERE id IN (13, 14, 16, 20, 69, 75)
  `);
  console.table(batches);
}

run().finally(() => prisma.$disconnect());
