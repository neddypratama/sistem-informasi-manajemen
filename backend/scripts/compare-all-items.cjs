const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldStocks = await prisma.$queryRawUnsafe(`
    SELECT 
      b.id,
      b.name,
      jb.name as jenis_name,
      COALESCE(SUM(sb.qty_sisa), 0) AS old_stok,
      COALESCE(SUM(sb.qty_masuk), 0) AS old_masuk
    FROM bimapratama.barangs b
    JOIN bimapratama.jenis_barangs jb ON b.jenis_id = jb.id
    LEFT JOIN bimapratama.stok_batches sb ON b.id = sb.barang_id
    GROUP BY b.id, b.name, jb.name
    ORDER BY jb.name, b.name
  `);

  const newStocks = await prisma.$queryRawUnsafe(`
    SELECT 
      b.id,
      b.name,
      COALESCE(SUM(sb.qty_sisa), 0) AS new_stok,
      COALESCE(SUM(sb.qty_masuk), 0) AS new_masuk
    FROM bimapratama_v2.barangs b
    LEFT JOIN bimapratama_v2.stok_batches sb ON b.id = sb.barang_id
    GROUP BY b.id, b.name
  `);

  const newMap = new Map();
  newStocks.forEach(r => newMap.set(Number(r.id), Number(r.new_stok)));

  console.log('=== DAFTAR BARANG DENGAN PERBEDAAN STOK ===');
  const discrepancies = [];
  for (const r of oldStocks) {
    const id = Number(r.id);
    const oldStok = Number(r.old_stok);
    const newStok = newMap.get(id) || 0;
    if (Math.abs(oldStok - newStok) > 0.001) {
      discrepancies.push({
        id,
        jenis: r.jenis_name,
        name: r.name,
        oldStok,
        newStok,
        selisih: newStok - oldStok
      });
    }
  }

  console.log(`Total barang berbeda: ${discrepancies.length} dari ${oldStocks.length}`);
  console.table(discrepancies);
}

main().catch(console.error).finally(() => prisma.$disconnect());
