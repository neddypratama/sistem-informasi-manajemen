const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Stock in old system (bimapratama.stok_batches)
  const oldStocks = await prisma.$queryRawUnsafe(`
    SELECT 
      b.id,
      b.name,
      b.jenis_id,
      COALESCE(SUM(sb.qty_sisa), 0) AS total_sisa_old,
      COALESCE(SUM(sb.qty_masuk), 0) AS total_masuk_old
    FROM bimapratama.barangs b
    LEFT JOIN bimapratama.stok_batches sb ON b.id = sb.barang_id
    GROUP BY b.id, b.name, b.jenis_id
    ORDER BY b.jenis_id, b.name
  `);

  // 2. Stock in new system (bimapratama_v2.stok_batches)
  const newStocks = await prisma.$queryRawUnsafe(`
    SELECT 
      b.id,
      b.name,
      b.jenis_id,
      COALESCE(SUM(sb.qty_sisa), 0) AS total_sisa_new,
      COALESCE(SUM(sb.qty_masuk), 0) AS total_masuk_new
    FROM bimapratama_v2.barangs b
    LEFT JOIN bimapratama_v2.stok_batches sb ON b.id = sb.barang_id
    GROUP BY b.id, b.name, b.jenis_id
    ORDER BY b.jenis_id, b.name
  `);

  const oldMap = new Map();
  oldStocks.forEach(r => oldMap.set(Number(r.id), r));

  const newMap = new Map();
  newStocks.forEach(r => newMap.set(Number(r.id), r));

  console.log('=== PERBANDINGAN STOK LAMA (bimapratama) VS BARU (bimapratama_v2) ===');
  const diffs = [];

  for (const [id, oldRow] of oldMap.entries()) {
    const newRow = newMap.get(id);
    const oldSisa = Number(oldRow.total_sisa_old);
    const newSisa = newRow ? Number(newRow.total_sisa_new) : 0;
    const diff = newSisa - oldSisa;

    if (Math.abs(diff) > 0.001 || oldSisa > 0 || newSisa > 0) {
      diffs.push({
        id,
        name: oldRow.name,
        jenisId: Number(oldRow.jenis_id),
        oldSisa,
        newSisa,
        diff,
      });
    }
  }

  // Filter only items with differences
  const realDiffs = diffs.filter(d => Math.abs(d.diff) > 0.001);
  console.log(`Ditemukan ${realDiffs.length} barang dengan perbedaan stok:`);
  console.table(realDiffs.slice(0, 50));

  // Check specific commodities mentioned by user:
  // "stok pakan sentrat dan kucing. Sama telur ternyata juga banyak yang kelebihan"
  console.log('\n--- Khusus Pakan Kucing & Sentrat ---');
  const pakanDiffs = diffs.filter(d => d.name.toLowerCase().includes('kucing') || d.name.toLowerCase().includes('sentrat') || d.name.toLowerCase().includes('511'));
  console.table(pakanDiffs);

  console.log('\n--- Khusus Telur ---');
  const telurDiffs = diffs.filter(d => d.jenisId === 8 || d.name.toLowerCase().includes('telur'));
  console.table(telurDiffs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
