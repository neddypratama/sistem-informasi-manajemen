const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== VERIFIKASI CEPAT STOK V2 vs SISTEM LAMA ===\n');

  const rows = await prisma.$queryRawUnsafe(`
    SELECT 
      b.id,
      b.name,
      (SELECT COALESCE(SUM(sb_old.qty_sisa), 0) FROM bimapratama.stok_batches sb_old WHERE sb_old.barang_id = b.id) AS old_stok,
      (SELECT COALESCE(SUM(sb_new.qty_sisa), 0) FROM bimapratama_v2.stok_batches sb_new WHERE sb_new.barang_id = b.id) AS new_stok
    FROM bimapratama.barangs b
    ORDER BY b.id ASC
  `);

  let matched = 0;
  let mismatched = [];

  for (const r of rows) {
    const oldS = Number(r.old_stok);
    const newS = Number(r.new_stok);
    const diff = Number((newS - oldS).toFixed(2));
    if (Math.abs(diff) < 0.001) {
      matched++;
    } else {
      mismatched.push({
        id: r.id,
        name: r.name,
        old_stok: oldS,
        new_stok: newS,
        selisih: diff,
      });
    }
  }

  console.log(`Hasil Verifikasi:`);
  console.log(`- Total Barang Cocok 100%: ${matched} / ${rows.length}`);
  if (mismatched.length > 0) {
    console.error(`- Total Barang Selisih: ${mismatched.length}`);
    console.table(mismatched);
  } else {
    console.log(`✅ SEMPURNA! Seluruh ${rows.length} barang cocok 100% dengan sistem lama tanpa selisih.`);
  }

  const [oldTot] = await prisma.$queryRawUnsafe(`SELECT SUM(qty_sisa) as total FROM bimapratama.stok_batches`);
  const [newTot] = await prisma.$queryRawUnsafe(`SELECT SUM(qty_sisa) as total FROM bimapratama_v2.stok_batches`);
  console.log(`\nTotal Sisa Stok Keseluruhan:`);
  console.log(`- Sistem Lama: ${Number(oldTot.total).toLocaleString('id-ID')} unit/kg`);
  console.log(`- Sistem Baru: ${Number(newTot.total).toLocaleString('id-ID')} unit/kg`);
  console.log(`- Selisih Total: ${Number(newTot.total) - Number(oldTot.total)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
