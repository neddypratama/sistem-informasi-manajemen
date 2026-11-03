const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const oldStocks = await prisma.$queryRawUnsafe(`
    SELECT 
      b.id as barang_id,
      b.name as barang_name,
      COALESCE(SUM(sb.qty_sisa), 0) AS old_stok
    FROM bimapratama.barangs b
    LEFT JOIN bimapratama.stok_batches sb ON b.id = sb.barang_id
    GROUP BY b.id, b.name
    ORDER BY b.id ASC
  `);

  let matched = 0;
  let totalDiff = 0;

  for (const row of oldStocks) {
    const barangId = Number(row.barang_id);
    const targetStok = Number(row.old_stok);

    const v2Batches = await prisma.$queryRawUnsafe(`
      SELECT id, qty_masuk, qty_sisa, tanggal
      FROM bimapratama_v2.stok_batches
      WHERE barang_id = ${barangId}
      ORDER BY tanggal DESC, id DESC
    `);

    let remainingTarget = targetStok;
    let newAllocatedTotal = 0;

    for (let i = 0; i < v2Batches.length; i++) {
      const b = v2Batches[i];
      let masuk = Number(b.qty_masuk);
      let sisa = 0;

      if (i === 0 && remainingTarget > 0) {
        // If it's the newest batch and remainingTarget > total masuk of all batches
        const sumMasukOthers = v2Batches.slice(1).reduce((s, it) => s + Number(it.qty_masuk), 0);
        if (remainingTarget > masuk + sumMasukOthers) {
          masuk = remainingTarget - sumMasukOthers;
        }
      }

      if (remainingTarget > 0) {
        if (remainingTarget >= masuk) {
          sisa = masuk;
          remainingTarget -= masuk;
        } else {
          sisa = remainingTarget;
          remainingTarget = 0;
        }
      } else {
        sisa = 0;
      }

      newAllocatedTotal += sisa;
    }

    const diff = Math.abs(newAllocatedTotal - targetStok);
    if (diff < 0.001) {
      matched++;
    } else {
      console.log(`Mismatch on ${row.barang_name} (${barangId}): target=${targetStok}, allocated=${newAllocatedTotal}, diff=${diff}`);
      totalDiff += diff;
    }
  }

  console.log(`Simulation Result: ${matched} / ${oldStocks.length} barangs match 100%! (Total diff: ${totalDiff})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
