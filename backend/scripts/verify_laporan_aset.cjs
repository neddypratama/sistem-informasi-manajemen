const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nonClientRows = await prisma.$queryRaw`
    SELECT 
      k.id as kategori_id,
      k.name as kategori_name,
      dk.name as group_name,
      dk.type as group_type,
      COALESCE(
        SUM(
          CASE 
            WHEN dk.type = 'Aset' THEN jd.debit - jd.kredit
            ELSE jd.kredit - jd.debit
          END
        ), 0
      ) as saldo
    FROM detail_kategoris dk
    JOIN kategoris k ON k.detail_kategori_id = dk.id
    LEFT JOIN (
      SELECT jd.kategori_id, jd.debit, jd.kredit
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      LEFT JOIN transaksis t ON t.id = ju.transaksi_id
      WHERE (t.status IS NULL OR t.status != 'BATAL')
    ) jd ON jd.kategori_id = k.id
    WHERE dk.type IN ('Aset', 'Liabilitas')
      AND k.name != 'Penyesuaian Stok'
      AND (k.name LIKE '%Tray%' OR dk.name LIKE '%Tray%' OR dk.name LIKE '%Stok%')
    GROUP BY k.id, k.name, dk.id, dk.name, dk.type
    ORDER BY dk.id, k.id
  `;

  console.log("Laporan Aset Stok & Tray Rows:");
  for (const r of nonClientRows) {
    console.log(`[${r.group_name}] ${r.kategori_name}: Rp ${Number(r.saldo).toLocaleString('id-ID')}`);
  }
}

main().finally(() => prisma.$disconnect());
