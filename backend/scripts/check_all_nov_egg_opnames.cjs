const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const opnamesNov = await prisma.stokOpname.findMany({
    where: {
      tanggal: { gte: new Date('2026-11-01') },
      jenisOpname: 'TELUR'
    },
    include: {
      barang: true,
      jurnal: { include: { details: true } }
    },
    orderBy: { tanggal: 'desc' }
  });

  console.log(`Total Stok Opname Telur sejak 01 Nov 2026: ${opnamesNov.length}`);
  for (const o of opnamesNov) {
    console.log(`- ${o.nomorOpname} | ${o.barang.name} | Tgl: ${o.tanggal.toISOString().split('T')[0]} | Fisik: ${o.stokFisik} | Sistem: ${o.stokSistem} | TotalNilai: Rp ${Number(o.totalNilai).toLocaleString('id-ID')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
