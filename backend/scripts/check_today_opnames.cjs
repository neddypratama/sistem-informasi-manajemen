const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const opnames = await prisma.stokOpname.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-11-03T00:00:00.000Z')
      }
    },
    include: {
      barang: true
    },
    orderBy: { id: 'asc' }
  });

  console.log("Opnames created today (count = " + opnames.length + "):");
  for (const o of opnames) {
    console.log(`ID: ${o.id} | No: ${o.nomorOpname} | Barang: ${o.barang.name} (${o.barangId}) | Jenis: ${o.jenisOpname} | Sis: ${o.stokSistem} -> Fis: ${o.stokFisik} (Selisih: ${o.selisih}) | HPP: ${o.hpp} | TotalNilai: ${o.totalNilai} | Ket: ${o.keterangan}`);
  }
}

main().finally(() => prisma.$disconnect());
