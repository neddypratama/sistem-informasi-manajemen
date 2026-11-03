const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [oldDtCount] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM bimapratama.detail_transaksis');
  const [newDtCount] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM bimapratama_v2.detail_transaksis');
  console.log('Old detail_transaksis count:', oldDtCount);
  console.log('New detail_transaksis count:', newDtCount);

  // Check sample match
  const sampleMatch = await prisma.$queryRawUnsafe(`
    SELECT 
      sb.id as old_batch_id,
      sb.barang_id,
      sb.qty_sisa,
      sb.detail_transaksi_id,
      dt_new.id as new_dt_id
    FROM bimapratama.stok_batches sb
    LEFT JOIN bimapratama_v2.detail_transaksis dt_new ON sb.detail_transaksi_id = dt_new.id
    WHERE sb.qty_sisa > 0
    LIMIT 10
  `);
  console.log('Sample matching active batches:', sampleMatch);

  // Check total active batches in old
  const [activeOldBatches] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt, SUM(qty_sisa) as total_sisa FROM bimapratama.stok_batches WHERE qty_sisa > 0');
  console.log('Active batches in old (qty_sisa > 0):', activeOldBatches);

  // Check total active batches in new
  const [activeNewBatches] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt, SUM(qty_sisa) as total_sisa FROM bimapratama_v2.stok_batches WHERE qty_sisa > 0');
  console.log('Active batches in new (qty_sisa > 0):', activeNewBatches);

  // Check how many of those detail_transaksi_id exist in new
  const [matchDtCount] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt
    FROM bimapratama.stok_batches sb
    JOIN bimapratama_v2.detail_transaksis dt ON sb.detail_transaksi_id = dt.id
    WHERE sb.qty_sisa > 0
  `);
  console.log('Matched active batch detail_transaksi_id in new:', matchDtCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
