const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const simLamaAset = await prisma.$queryRawUnsafe(`
    SELECT 
      k.name as kategori,
      SUM(
        CASE
          WHEN LOWER(t.type) = 'debit' THEN dt.sub_total
          ELSE -dt.sub_total
        END
      ) as total
    FROM bimapratama.detail_transaksis dt
    JOIN bimapratama.transaksis t ON t.id = dt.transaksi_id
    JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
    JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
    WHERE t.status = 'Selesai'
      AND dk.type = 'Aset'
      AND k.name != 'Penyesuaian Stok'
    GROUP BY k.name
  `);
  console.log("SIM Lama Laporan Aset (from detail_transaksis):", simLamaAset);
}

main().finally(() => prisma.$disconnect());
