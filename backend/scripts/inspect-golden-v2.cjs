const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const v2GoldenBatches = await prisma.$queryRawUnsafe(`
    SELECT id, barang_id, qty_masuk, qty_sisa, harga_beli, tanggal
    FROM bimapratama_v2.stok_batches
    WHERE barang_id = 1 AND qty_sisa > 0
    ORDER BY tanggal ASC
  `);

  console.log(`Golden batches with qty_sisa > 0 in v2: ${v2GoldenBatches.length}`);
  console.log('Oldest 5 in v2 with sisa > 0:');
  console.table(v2GoldenBatches.slice(0, 5));
  console.log('Newest 5 in v2 with sisa > 0:');
  console.table(v2GoldenBatches.slice(-5));
}

main().catch(console.error).finally(() => prisma.$disconnect());
