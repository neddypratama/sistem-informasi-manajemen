const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING ALL NOV TRANSACTIONS FOR DEBY ===');

  // 1. In detail_transaksis
  const dts = await prisma.detailTransaksi.findMany({
    where: { kategoriId: 71 },
    include: { transaksi: true }
  });
  console.log('detailTransaksi with kategoriId = 71:', dts.length);

  // 2. In transaksis with invoice containing DBY
  const txsDby = await prisma.transaksi.findMany({
    where: { invoice: { contains: 'DBY' } }
  });
  console.log('transaksis with invoice containing DBY:', txsDby.length);
  for (const t of txsDby) {
    console.log(`- [${t.tanggal.toISOString().slice(0, 10)}] ${t.invoice} ${t.type} ${t.total} ${t.keterangan}`);
  }

  // 3. In transaksis with keterangan containing Deby or Debi
  const txsKet = await prisma.transaksi.findMany({
    where: {
      OR: [
        { keterangan: { contains: 'Deby' } },
        { keterangan: { contains: 'deby' } },
        { keterangan: { contains: 'Debi' } },
        { keterangan: { contains: 'debi' } }
      ]
    }
  });
  console.log('transaksis with keterangan mentioning Deby/Debi:', txsKet.length);
  for (const t of txsKet) {
    console.log(`- [${t.tanggal.toISOString().slice(0, 10)}] ${t.invoice} ${t.type} ${t.total} ${t.keterangan}`);
  }

  // 4. In jurnal_details with kategoriId = 71 or coaId = 71 in November 2026
  const novJd = await prisma.jurnalDetail.findMany({
    where: {
      OR: [{ kategoriId: 71 }, { coaId: 71 }],
      jurnal: { tanggal: { gte: new Date('2026-11-01 00:00:00') } }
    },
    include: {
      jurnal: { include: { transaksi: true } }
    }
  });
  console.log('jurnalDetails for Deby in Nov 2026:', novJd.length);
  for (const jd of novJd) {
    console.log(`- [${jd.jurnal.tanggal.toISOString().slice(0, 10)}] ${jd.jurnal.nomorJurnal} | D: ${jd.debit} | K: ${jd.kredit} | Ket: ${jd.jurnal.keterangan}`);
  }

  // 5. In jurnal_umums with keterangan mentioning Deby/Debi in November 2026
  const novJu = await prisma.jurnalUmum.findMany({
    where: {
      tanggal: { gte: new Date('2026-11-01 00:00:00') },
      OR: [
        { keterangan: { contains: 'Deby' } },
        { keterangan: { contains: 'deby' } },
        { keterangan: { contains: 'Debi' } },
        { keterangan: { contains: 'debi' } }
      ]
    },
    include: { details: { include: { kategori: true } } }
  });
  console.log('jurnalUmums mentioning Deby in Nov 2026:', novJu.length);
  for (const ju of novJu) {
    console.log(`- [${ju.tanggal.toISOString().slice(0, 10)}] ${ju.nomorJurnal} | Ket: ${ju.keterangan}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
