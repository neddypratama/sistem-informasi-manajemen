const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const ids = [17, 18, 21, 25, 105, 111];
  for (const id of ids) {
    const oldB = await prisma.$queryRawUnsafe(`SELECT id, qty_masuk, qty_sisa, tanggal FROM bimapratama.stok_batches WHERE barang_id = ${id} AND qty_sisa > 0`);
    const newB = await prisma.$queryRawUnsafe(`SELECT id, qty_masuk, qty_sisa, tanggal FROM bimapratama_v2.stok_batches WHERE barang_id = ${id}`);
    const bName = await prisma.$queryRawUnsafe(`SELECT name FROM bimapratama.barangs WHERE id = ${id}`);
    console.log(`=== ${bName[0].name} (ID ${id}) ===`);
    console.log('Old batches with sisa > 0:', oldB);
    console.log('New batches in v2:', newB);
  }
}

run().finally(() => prisma.$disconnect());
