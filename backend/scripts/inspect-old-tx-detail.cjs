const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldTx = await prisma.$queryRawUnsafe(`
    SELECT t.id, t.invoice, t.name, t.type, t.tanggal, d.id as dt_id, d.barang_id, d.kategori_id, d.kuantitas, d.value, d.sub_total
    FROM bimapratama.transaksis t
    JOIN bimapratama.detail_transaksis d ON t.id = d.transaksi_id
    WHERE t.id IN (90162, 90271)
  `);
  console.log('Old transactions 90162 & 90271 in bimapratama:', oldTx);

  // Check if there are stok_batches in bimapratama for these dt_id
  const oldBatches = await prisma.$queryRawUnsafe(`
    SELECT * FROM bimapratama.stok_batches WHERE detail_transaksi_id IN (132407, 132534)
  `);
  console.log('Stok batches in bimapratama for these dt_id:', oldBatches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
