const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const txTypes = await prisma.transaksi.groupBy({
    by: ['type'],
    _count: { id: true }
  });
  console.log('Transaksi types:', txTypes);

  // Check Pak Pri (id = 241 or search by name)
  const pakPri = await prisma.client.findFirst({
    where: { name: { contains: 'Supriyadi' } }
  });
  console.log('Pak Pri client record:', pakPri);

  // Check transactions for Pak Pri
  const pakPriTx = await prisma.transaksi.groupBy({
    by: ['type', 'paymentMethod'],
    where: { clientId: pakPri.id },
    _count: { id: true },
    _sum: { total: true }
  });
  console.log('Pak Pri transactions:', pakPriTx);

  // Check journals for Pak Pri or account 'Saldo Bp.Supriyadi'
  const katSupri = await prisma.kategori.findFirst({
    where: { name: { contains: 'Supriyadi' } }
  });
  console.log('Kategori Supriyadi:', katSupri);

  if (katSupri) {
    const jdSums = await prisma.$queryRaw`
      SELECT 
        SUM(jd.debit) as total_debit,
        SUM(jd.kredit) as total_kredit,
        SUM(jd.kredit - jd.debit) as net_kredit_minus_debit,
        SUM(jd.debit - jd.kredit) as net_debit_minus_kredit
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      WHERE jd.kategori_id = ${katSupri.id}
    `;
    console.log('Jurnal Details for Kategori Supriyadi:', jdSums);

    const jdSumsOct31 = await prisma.$queryRaw`
      SELECT 
        SUM(jd.debit) as total_debit,
        SUM(jd.kredit) as total_kredit,
        SUM(jd.kredit - jd.debit) as net_kredit_minus_debit
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      WHERE jd.kategori_id = ${katSupri.id}
        AND ju.tanggal <= '2026-10-31 23:59:59'
    `;
    console.log('Jurnal Details for Kategori Supriyadi as of 31 Oct:', jdSumsOct31);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
