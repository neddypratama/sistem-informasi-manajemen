const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== PEMERIKSAAN DETAIL BARANG LAMA vs BARU ===\n');

  const oldBarangs = await prisma.$queryRawUnsafe(`
    SELECT b.id, b.name, b.jenis_id, j.name as jenis_name
    FROM bimapratama.barangs b
    LEFT JOIN bimapratama.jenis_barangs j ON b.jenis_id = j.id
    ORDER BY b.id ASC
  `);

  const newBarangs = await prisma.$queryRawUnsafe(`
    SELECT b.id, b.name, b.code, b.jenis_id, b.satuan_id, b.is_active, j.name as jenis_name
    FROM bimapratama_v2.barangs b
    LEFT JOIN bimapratama_v2.jenis_barangs j ON b.jenis_id = j.id
    ORDER BY b.id ASC
  `);

  console.log(`Jumlah barang di sistem lama (bimapratama):    ${oldBarangs.length}`);
  console.log(`Jumlah barang di sistem baru (bimapratama_v2): ${newBarangs.length}`);

  const activeNew = newBarangs.filter(b => b.is_active === 1 || b.is_active === true);
  const inactiveNew = newBarangs.filter(b => b.is_active === 0 || b.is_active === false);
  console.log(`- Barang Aktif di V2:      ${activeNew.length}`);
  console.log(`- Barang Nonaktif di V2:   ${inactiveNew.length}`);

  // Check if any old barang is missing in new DB
  const newIds = new Set(newBarangs.map(b => String(b.id)));
  const missingInNew = oldBarangs.filter(b => !newIds.has(String(b.id)));
  console.log(`- Barang lama yang hilang di V2: ${missingInNew.length}`);
  if (missingInNew.length > 0) {
    console.table(missingInNew);
  }

  // Check if any new barang is not in old DB
  const oldIds = new Set(oldBarangs.map(b => String(b.id)));
  const extraInNew = newBarangs.filter(b => !oldIds.has(String(b.id)));
  console.log(`- Barang baru yang tidak ada di DB lama: ${extraInNew.length}`);
  if (extraInNew.length > 0) {
    console.table(extraInNew);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
