const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const credits = await prisma.$queryRaw`
    SELECT 
      t.type as trans_type,
      ju.keterangan as jur_ket,
      COUNT(*) as count,
      SUM(jd.kredit) as sum_kredit,
      SUM(jd.debit) as sum_debit
    FROM jurnal_details jd
    JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
    LEFT JOIN transaksis t ON t.id = ju.transaksi_id
    WHERE jd.kategori_id = 62
    GROUP BY t.type, ju.keterangan
    ORDER BY sum_kredit DESC
    LIMIT 20
  `;
  console.log("Top credit sources for Kat 62 (Stok Tray):", credits);

  // Also check all distinct trans_type
  const byTransType = await prisma.$queryRaw`
    SELECT 
      COALESCE(t.type, 'NO_TRANS') as trans_type,
      COUNT(*) as count,
      SUM(jd.debit) as total_debit,
      SUM(jd.kredit) as total_kredit
    FROM jurnal_details jd
    JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
    LEFT JOIN transaksis t ON t.id = ju.transaksi_id
    WHERE jd.kategori_id = 62
    GROUP BY t.type
  `;
  console.log("By transaction type:", byTransType);
}

main().finally(() => prisma.$disconnect());
