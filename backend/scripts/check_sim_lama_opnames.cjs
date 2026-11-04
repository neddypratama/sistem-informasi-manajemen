const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe('DESC bimapratama.stoks');
  console.log("Columns of bimapratama.stoks:", cols.map(c => c.Field));

  const sample = await prisma.$queryRawUnsafe('SELECT * FROM bimapratama.stoks LIMIT 5');
  console.log("Sample bimapratama.stoks:", sample);

  // find max tanggal in bimapratama.transaksis
  const maxTgl = await prisma.$queryRawUnsafe('SELECT MAX(tanggal) as max_tgl FROM bimapratama.transaksis');
  console.log("Max tanggal in bimapratama.transaksis:", maxTgl);
}

main().catch(console.error).finally(() => prisma.$disconnect());
