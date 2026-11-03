const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Get exact old stock per barang from bimapratama
  const oldStocks = await prisma.$queryRawUnsafe(`
    SELECT 
      b.id as barang_id,
      b.name as barang_name,
      COALESCE(SUM(sb.qty_sisa), 0) AS old_stok
    FROM bimapratama.barangs b
    LEFT JOIN bimapratama.stok_batches sb ON b.id = sb.barang_id
    GROUP BY b.id, b.name
  `);

  console.log(`Read ${oldStocks.length} barangs from bimapratama.`);

  // 2. For each barang, simulate distributing old_stok to bimapratama_v2 batches
  let totalBatchesToUpdate = 0;
  let simulatedMatchCount = 0;

  for (const row of oldStocks) {
    const barangId = Number(row.barang_id);
    let targetStok = Number(row.old_stok);

    const v2Batches = await prisma.$queryRawUnsafe(`
      SELECT id, qty_masuk, qty_sisa, tanggal
      FROM bimapratama_v2.stok_batches
      WHERE barang_id = ${barangId}
      ORDER BY tanggal DESC, id DESC
    `);

    let allocatedStok = 0;
    for (const b of v2Batches) {
      const masuk = Number(b.qty_masuk);
      let newSisa = 0;
      if (targetStok > 0) {
        if (targetStok >= masuk) {
          newSisa = masuk;
          targetStok -= masuk;
        } else {
          newSisa = targetStok;
          targetStok = 0;
        }
      }
      allocatedStok += newSisa;
    }

    // If targetStok still > 0 (meaning all v2 batches together had less qty_masuk than targetStok)
    if (targetStok > 0) {
      console.log(`Notice: Barang ${row.barang_name} (${barangId}) targetStok remains ${targetStok}.`);
    }

    if (Math.abs(allocatedStok - Number(row.old_stok)) < 0.001) {
      simulatedMatchCount++;
    }
  }

  console.log(`Simulation complete: ${simulatedMatchCount} / ${oldStocks.length} barangs would match 100% perfectly.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
