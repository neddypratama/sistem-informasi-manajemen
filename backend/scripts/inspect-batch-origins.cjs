const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [oldBatchCount] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt, SUM(qty_masuk) as total_masuk, SUM(qty_sisa) as total_sisa FROM bimapratama.stok_batches`);
  const [newBatchCount] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt, SUM(qty_masuk) as total_masuk, SUM(qty_sisa) as total_sisa FROM bimapratama_v2.stok_batches`);

  console.log('Old batches (bimapratama):', oldBatchCount);
  console.log('New batches (bimapratama_v2):', newBatchCount);

  // Check Horen (id 5) in old vs new
  const oldHoren = await prisma.$queryRawUnsafe(`
    SELECT id, barang_id, qty_masuk, qty_sisa, harga, tanggal 
    FROM bimapratama.stok_batches 
    WHERE barang_id = 5 
    ORDER BY tanggal DESC LIMIT 10
  `);
  console.log('Old Horen sample (10 latest):', oldHoren);

  const newHoren = await prisma.$queryRawUnsafe(`
    SELECT id, barang_id, qty_masuk, qty_sisa, harga_beli, tanggal 
    FROM bimapratama_v2.stok_batches 
    WHERE barang_id = 5 
    ORDER BY tanggal DESC LIMIT 10
  `);
  console.log('New Horen sample (10 latest):', newHoren);

  // Check how stok_batches were generated in bimapratama_v2:
  // Was there an ETL / migration script? Let's check backend/src/modules/migration
}

main().catch(console.error).finally(() => prisma.$disconnect());
