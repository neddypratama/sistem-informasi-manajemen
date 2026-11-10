const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== INSPECTING JUR-20261102-DBY-XBZU ===');
  const jur = await prisma.jurnalUmum.findFirst({
    where: { nomorJurnal: { contains: 'DBY' } },
    include: {
      details: {
        include: {
          kategori: { include: { detailKategori: true } }
        }
      },
      transaksi: true,
      client: true
    }
  });
  const replacer = (k, v) => typeof v === 'bigint' ? v.toString() : v;
  console.log('Jurnal DBY:', JSON.stringify(jur, replacer, 2));

  // Check all journals created on or after 2026-11-01 affecting Kas Deby (id 71)
  const novJournals = await prisma.jurnalDetail.findMany({
    where: {
      kategoriId: 71,
      jurnal: { tanggal: { gte: new Date('2026-11-01 00:00:00') } }
    },
    include: {
      jurnal: {
        include: { transaksi: true, details: { include: { kategori: true } } }
      }
    }
  });
  console.log('\nAll November journals affecting Kas Deby (71):', JSON.stringify(novJournals, replacer, 2));

  // Also check the specific journal JUR-20261102-DBY-XBZU
  const specificJur = await prisma.jurnalUmum.findFirst({
    where: { nomorJurnal: 'JUR-20261102-DBY-XBZU' },
    include: {
      details: { include: { kategori: true } },
      transaksi: true
    }
  });
  console.log('\nSpecific JUR-20261102-DBY-XBZU:', JSON.stringify(specificJur, replacer, 2));

  // Check all journals in November with 'deby' or 'debi' in keterangan
  const ketDebyJournals = await prisma.jurnalUmum.findMany({
    where: {
      tanggal: { gte: new Date('2026-11-01 00:00:00') },
      OR: [
        { keterangan: { contains: 'deby' } },
        { keterangan: { contains: 'debi' } },
        { nomorJurnal: { contains: 'DBY' } }
      ]
    },
    include: {
      details: {
        include: { kategori: true }
      }
    }
  });
  console.log('\nAll November journals mentioning deby:', JSON.stringify(ketDebyJournals, replacer, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
