const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jdAfter = await prisma.$queryRaw`
    SELECT 
      SUM(jd.debit) as d,
      SUM(jd.kredit) as k,
      SUM(jd.kredit - jd.debit) as net_change
    FROM jurnal_details jd
    JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
    WHERE jd.kategori_id = 76 AND ju.tanggal > '2026-10-31 23:59:59'
  `;
  console.log('Jurnal details for Saldo Bp.Supriyadi (id: 76) after 31 Oct:', jdAfter);

  const jdBefore = await prisma.$queryRaw`
    SELECT 
      SUM(jd.debit) as d,
      SUM(jd.kredit) as k,
      SUM(jd.kredit - jd.debit) as net_balance
    FROM jurnal_details jd
    JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
    WHERE jd.kategori_id = 76 AND ju.tanggal <= '2026-10-31 23:59:59'
  `;
  console.log('Jurnal details for Saldo Bp.Supriyadi (id: 76) up to 31 Oct:', jdBefore);

  const jdAll = await prisma.$queryRaw`
    SELECT 
      SUM(jd.debit) as d,
      SUM(jd.kredit) as k,
      SUM(jd.kredit - jd.debit) as net_balance
    FROM jurnal_details jd
    JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
    WHERE jd.kategori_id = 76
  `;
  console.log('Jurnal details for Saldo Bp.Supriyadi (id: 76) all time:', jdAll);
}

main().catch(console.error).finally(() => prisma.$disconnect());
