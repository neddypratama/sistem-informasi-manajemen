const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kats = await prisma.kategori.findMany({
    where: { name: { contains: 'Supriyadi' } },
    include: { detailKategori: true }
  });
  console.log('Kategori Supriyadi:', kats);

  const katsSaldo = await prisma.kategori.findMany({
    where: { name: { contains: 'Saldo' } },
    include: { detailKategori: true }
  });
  console.log('Kategori Saldo:', katsSaldo);

  for (const k of kats) {
    const jd = await prisma.$queryRaw`
      SELECT 
        SUM(jd.debit) as d, 
        SUM(jd.kredit) as k
      FROM jurnal_details jd
      WHERE jd.kategori_id = ${k.id}
    `;
    console.log(`Jurnal for ${k.name} (id: ${k.id}):`, jd);
  }

  for (const k of katsSaldo) {
    const jd = await prisma.$queryRaw`
      SELECT 
        SUM(jd.debit) as d, 
        SUM(jd.kredit) as k
      FROM jurnal_details jd
      WHERE jd.kategori_id = ${k.id}
    `;
    console.log(`Jurnal for ${k.name} (id: ${k.id}):`, jd);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
