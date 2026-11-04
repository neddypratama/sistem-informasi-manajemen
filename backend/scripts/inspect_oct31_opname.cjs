const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jur = await prisma.jurnalUmum.findFirst({
    where: { keterangan: { contains: 'Stok Opname Horen DM - penyesuan stok oct 31' } },
    include: {
      details: {
        include: {
          kategori: true
        }
      }
    }
  });

  console.log("Jurnal:", {
    id: jur?.id?.toString(),
    nomor: jur?.nomorJurnal,
    tanggal: jur?.tanggal,
    keterangan: jur?.keterangan,
    details: jur?.details.map(d => ({
      katId: d.kategoriId?.toString(),
      katName: d.kategori?.name,
      debit: Number(d.debit),
      kredit: Number(d.kredit)
    }))
  });

  // Let's check stok_opnames table
  const opnames = await prisma.stokOpname.findMany({
    where: { keterangan: { contains: 'oct 31' } }
  });
  console.log("Stok Opname row:", opnames);
}

main().finally(() => prisma.$disconnect());
