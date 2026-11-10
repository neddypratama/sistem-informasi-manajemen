const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const k76 = await prisma.kategori.findUnique({
    where: { id: 76n },
    include: { detailKategori: true }
  });
  console.log("Kategori 76 in V2:", k76);

  // Cek jurnal_details untuk kategori 76
  const jd76 = await prisma.$queryRaw`
    SELECT 
      SUM(debit) as total_debit,
      SUM(kredit) as total_kredit,
      SUM(kredit - debit) as saldo_kredit_net
    FROM jurnal_details
    WHERE kategori_id = 76
  `;
  console.log("Jurnal Details for Kategori 76 in V2:", jd76);
}

main().catch(console.error).finally(() => prisma.$disconnect());
