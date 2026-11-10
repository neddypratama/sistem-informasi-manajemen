const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const jdAccounts = await prisma.$queryRaw`
    SELECT 
      k.id, k.name, dk.name as group_name, dk.type,
      SUM(jd.debit) as total_debit,
      SUM(jd.kredit) as total_kredit,
      SUM(CASE WHEN dk.type = 'Aset' THEN jd.debit - jd.kredit ELSE jd.kredit - jd.debit END) as saldo_jurnal
    FROM detail_kategoris dk
    JOIN kategoris k ON k.detail_kategori_id = dk.id
    LEFT JOIN jurnal_details jd ON jd.kategori_id = k.id
    WHERE dk.name LIKE '%Piutang%' OR dk.name LIKE '%Hutang%'
    GROUP BY k.id, k.name, dk.name, dk.type
    ORDER BY dk.id, k.id
  `;
  console.log("Jurnal Details for Piutang and Hutang categories:");
  console.table(jdAccounts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
