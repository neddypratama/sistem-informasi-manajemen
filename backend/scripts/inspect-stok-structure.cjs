const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const descOld = await prisma.$queryRawUnsafe('DESCRIBE bimapratama.stok_batches');
  console.log('bimapratama.stok_batches:', descOld);

  const descNew = await prisma.$queryRawUnsafe('DESCRIBE bimapratama_v2.stok_batches');
  console.log('bimapratama_v2.stok_batches:', descNew);

  const descOldKeluar = await prisma.$queryRawUnsafe('DESCRIBE bimapratama.stok_keluar_batches');
  console.log('bimapratama.stok_keluar_batches:', descOldKeluar);

  const descNewKeluar = await prisma.$queryRawUnsafe('DESCRIBE bimapratama_v2.stok_keluar_batches');
  console.log('bimapratama_v2.stok_keluar_batches:', descNewKeluar);

  // Check count in bimapratama.stok_keluar_batches vs bimapratama_v2.stok_keluar_batches
  const [oldKeluarCount] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt, SUM(qty) as total_qty FROM bimapratama.stok_keluar_batches');
  const [newKeluarCount] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt, SUM(qty) as total_qty FROM bimapratama_v2.stok_keluar_batches');
  console.log('oldKeluarCount:', oldKeluarCount);
  console.log('newKeluarCount:', newKeluarCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
