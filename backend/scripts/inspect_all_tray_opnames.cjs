const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const opnames = await prisma.stokOpname.findMany({
    where: { jenisOpname: 'TRAY' },
    include: { barang: true },
    orderBy: { id: 'desc' }
  });

  console.log("Total Tray Opnames in v2:", opnames.length);
  console.log(opnames.map(o => ({
    id: o.id.toString(),
    nomor: o.nomorOpname,
    barang: o.barang.name,
    tanggal: o.tanggal,
    createdAt: o.createdAt,
    stokSistem: Number(o.stokSistem),
    stokFisik: Number(o.stokFisik),
    selisih: Number(o.selisih),
    hpp: Number(o.hpp),
    totalNilai: Number(o.totalNilai),
    keterangan: o.keterangan
  })));
}

main().finally(() => prisma.$disconnect());
