const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_NOMOR = [
  'OPN-20261102-TLR-EXSB',
  'OPN-20261102-TLR-T228',
  'OPN-20261102-TLR-OPMB',
  'OPN-20261102-TLR-MI7R',
  'OPN-20261102-TLR-KB75',
  'OPN-20261102-TLR-SJAT',
  'OPN-20261102-TLR-6ORE',
  'OPN-20261102-TLR-27AY',
  'OPN-20261102-TLR-6Z6B',
  'OPN-20261102-TLR-N79V'
];

async function main() {
  const opnames = await prisma.stokOpname.findMany({
    where: { nomorOpname: { in: TARGET_NOMOR } },
    include: {
      barang: true,
      jurnal: { include: { details: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Ditemukan ${opnames.length} transaksi opname telur:`);
  console.table(opnames.map(o => ({
    id: o.id.toString(),
    nomorOpname: o.nomorOpname,
    barang: o.barang.name,
    stokSistem: Number(o.stokSistem),
    stokFisik: Number(o.stokFisik),
    selisih: Number(o.stokFisik) - Number(o.stokSistem),
    totalNilai: Number(o.totalNilai),
    jurnalId: o.jurnalId ? o.jurnalId.toString() : '-'
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
