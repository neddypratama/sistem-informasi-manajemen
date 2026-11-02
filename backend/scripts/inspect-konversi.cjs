const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.konversiBarang.count();
  console.log('Total konversiBarang count:', count);
  const records = await prisma.konversiBarang.findMany({
    take: 10,
    orderBy: { id: 'desc' },
    include: {
      barangAwal: true,
      barangAkhir: true,
      user: true,
    },
  });
  console.log('Total returned:', records.length);
  records.forEach((r) => {
    console.log(`- ID: ${r.id} | No: ${r.nomorKonversi} | Tgl: ${r.tanggal} | Dari: ${r.barangAwal?.name} (${r.qtyAwal}) -> Ke: ${r.barangAkhir?.name} (${r.qtyAkhir}) | Total: ${r.totalNominal} | Deleted: ${r.deletedAt}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
