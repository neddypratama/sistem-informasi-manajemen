const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const activeBatches = await prisma.$queryRawUnsafe(`
    SELECT 
      sb.id,
      sb.barang_id,
      b.name,
      sb.qty_masuk,
      sb.qty_sisa,
      sb.harga,
      sb.tanggal,
      sb.detail_transaksi_id
    FROM bimapratama.stok_batches sb
    JOIN bimapratama.barangs b ON sb.barang_id = b.id
    WHERE sb.qty_sisa > 0
    ORDER BY sb.barang_id, sb.tanggal ASC
  `);

  console.log(`Total active batches in bimapratama: ${activeBatches.length}`);
  console.log('Sample 20 active batches:');
  console.table(activeBatches.slice(0, 20));

  // Check how many distinct barangs have active batches
  const distinctBarangs = new Set(activeBatches.map(b => Number(b.barang_id)));
  console.log(`Total distinct barangs with stock in old DB: ${distinctBarangs.size}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
