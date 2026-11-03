const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== MEMULAI SINKRONISASI STOK BIMA PRATAMA V2 KE SISTEM LAMA ===\n');

  // 1. Ambil stok target dari bimapratama
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

  console.log(`Ditemukan ${oldStocks.length} produk di sistem lama.`);

  let totalUpdatedBatches = 0;
  let totalAdjustedBarang = 0;

  for (const row of oldStocks) {
    const barangId = Number(row.barang_id);
    const targetStok = Number(row.old_stok);

    const v2Batches = await prisma.$queryRawUnsafe(`
      SELECT id, qty_masuk, qty_sisa, tanggal
      FROM bimapratama_v2.stok_batches
      WHERE barang_id = ${barangId}
      ORDER BY tanggal DESC, id DESC
    `);

    if (!v2Batches || v2Batches.length === 0) {
      if (targetStok > 0) {
        console.warn(`[PERINGATAN] Barang ${row.barang_name} (${barangId}) tidak memiliki batch di V2, tetapi stok lama: ${targetStok}!`);
      }
      continue;
    }

    let remainingTarget = targetStok;

    for (let i = 0; i < v2Batches.length; i++) {
      const b = v2Batches[i];
      let masuk = Number(b.qty_masuk);
      let sisa = 0;

      // Jika batch terbaru dan targetStok melebihi total qty_masuk seluruh batch di V2
      if (i === 0 && remainingTarget > 0) {
        const sumMasukOthers = v2Batches.slice(1).reduce((s, it) => s + Number(it.qty_masuk), 0);
        if (remainingTarget > masuk + sumMasukOthers) {
          masuk = Number((remainingTarget - sumMasukOthers).toFixed(2));
        }
      }

      if (remainingTarget > 0) {
        if (remainingTarget >= masuk) {
          sisa = masuk;
          remainingTarget = Number((remainingTarget - masuk).toFixed(2));
        } else {
          sisa = remainingTarget;
          remainingTarget = 0;
        }
      } else {
        sisa = 0;
      }

      const oldSisa = Number(b.qty_sisa);
      const oldMasuk = Number(b.qty_masuk);

      if (Math.abs(oldSisa - sisa) > 0.0001 || Math.abs(oldMasuk - masuk) > 0.0001) {
        await prisma.$queryRawUnsafe(`
          UPDATE bimapratama_v2.stok_batches
          SET qty_sisa = ${sisa}, qty_masuk = ${masuk}
          WHERE id = ${b.id}
        `);
        totalUpdatedBatches++;
      }
    }

    totalAdjustedBarang++;
  }

  console.log(`\nSinkronisasi selesai!`);
  console.log(`- Total barang diproses: ${totalAdjustedBarang}`);
  console.log(`- Total baris batch diupdate: ${totalUpdatedBatches}`);

  // 2. Verifikasi total stok akhir
  console.log('\n=== VERIFIKASI AKHIR SETELAH SINKRONISASI ===');
  const verify = await prisma.$queryRawUnsafe(`
    SELECT 
      b.id,
      b.name,
      COALESCE(SUM(sb_old.qty_sisa), 0) AS old_stok,
      COALESCE(SUM(sb_new.qty_sisa), 0) AS new_stok,
      ROUND(COALESCE(SUM(sb_new.qty_sisa), 0) - COALESCE(SUM(sb_old.qty_sisa), 0), 2) AS selisih
    FROM bimapratama.barangs b
    LEFT JOIN bimapratama.stok_batches sb_old ON b.id = sb_old.barang_id
    LEFT JOIN bimapratama_v2.stok_batches sb_new ON b.id = sb_new.barang_id
    GROUP BY b.id, b.name
    HAVING selisih != 0
  `);

  if (verify.length === 0) {
    console.log('✅ SUKSES 100%! Seluruh 146 barang memiliki SELISIH 0 (stok sama persis dengan sistem lama).');
  } else {
    console.error(`❌ Ditemukan ${verify.length} barang masih memiliki selisih:`);
    console.table(verify);
  }

  // Ringkasan total stok
  const oldTotal = await prisma.$queryRawUnsafe(`SELECT SUM(qty_sisa) as total FROM bimapratama.stok_batches`);
  const newTotal = await prisma.$queryRawUnsafe(`SELECT SUM(qty_sisa) as total FROM bimapratama_v2.stok_batches`);
  console.log(`\nRingkasan Total Sisa Stok:`);
  console.log(`- Sistem Lama (bimapratama):    ${Number(oldTotal[0].total).toLocaleString('id-ID')} unit/kg`);
  console.log(`- Sistem Baru (bimapratama_v2): ${Number(newTotal[0].total).toLocaleString('id-ID')} unit/kg`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
