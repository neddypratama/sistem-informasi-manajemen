const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trays = await prisma.$queryRawUnsafe(`
    SELECT b.id, b.name, b.code,
      COALESCE(SUM(sb.qty_sisa), 0) as total_sisa,
      AVG(sb.harga_beli) as avg_harga_beli,
      MAX(sb.harga_beli) as max_harga_beli
    FROM bimapratama_v2.barangs b
    LEFT JOIN bimapratama_v2.stok_batches sb ON b.id = sb.barang_id
    WHERE b.jenis_id = 6
    GROUP BY b.id, b.name, b.code
    ORDER BY b.name ASC
  `);
  console.table(trays);

  const batches = await prisma.$queryRawUnsafe(`
    SELECT sb.id, sb.barang_id, b.name, sb.qty_masuk, sb.qty_sisa, sb.harga_beli, sb.tanggal
    FROM bimapratama_v2.stok_batches sb
    JOIN bimapratama_v2.barangs b ON sb.barang_id = b.id
    WHERE b.jenis_id = 6
    ORDER BY b.name, sb.id DESC
  `);
  console.log('All Tray Batches:');
  console.table(batches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
