const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const query = `
    SELECT 
      b.id,
      b.name,
      j.name as jenis,
      (SELECT COALESCE(SUM(sb_old.qty_sisa), 0) FROM bimapratama.stok_batches sb_old WHERE sb_old.barang_id = b.id) AS old_stok,
      (SELECT COALESCE(SUM(sb_new.qty_sisa), 0) FROM bimapratama_v2.stok_batches sb_new WHERE sb_new.barang_id = b.id) AS current_v2_stok
    FROM bimapratama.barangs b
    LEFT JOIN bimapratama.jenis_barangs j ON b.jenis_id = j.id
    WHERE b.name LIKE '%BOLT%' 
       OR b.name LIKE '%CHOIZE%' 
       OR b.name LIKE '%EXCEL%' 
       OR b.name LIKE '%Crumble%' 
       OR b.name LIKE '%SLC%' 
       OR b.name LIKE '%BP 104%' 
       OR b.name LIKE '%Puyuh%' 
       OR b.name LIKE '%Horen%' 
       OR b.name LIKE '%Golden%' 
       OR b.name LIKE '%Asin%'
       OR b.name LIKE '%Arab%'
       OR b.name LIKE '%Jagung OC%'
       OR b.name LIKE '%Kebi%'
    ORDER BY j.name, b.name
  `;
  const rows = await prisma.$queryRawUnsafe(query);
  console.table(rows.map(r => ({
    Barang: r.name,
    Jenis: r.jenis,
    'Sistem Lama (Target)': Number(r.old_stok),
    'Sistem Baru (Sekarang)': Number(r.current_v2_stok),
    'Kelebihan di V2': Number(r.current_v2_stok) - Number(r.old_stok)
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
