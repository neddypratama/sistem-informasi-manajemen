const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.$queryRaw`
    SELECT 
      t.type,
      t.status,
      COUNT(*) as count,
      SUM(dt.subtotal) as total_subtotal
    FROM detail_transaksis dt
    JOIN transaksis t ON t.id = dt.transaksi_id
    WHERE dt.kategori_id = 62
    GROUP BY t.type, t.status
  `;
  console.log("Transaksi dengan kategori_id 62 (Stok Tray):", res);

  // Check detail_transaksis for Tray barangs
  const res2 = await prisma.$queryRaw`
    SELECT 
      dt.kategori_id,
      k.name as kategori_name,
      t.type,
      COUNT(*) as count,
      SUM(dt.subtotal) as total_subtotal
    FROM detail_transaksis dt
    JOIN transaksis t ON t.id = dt.transaksi_id
    JOIN barangs b ON b.id = dt.barang_id
    LEFT JOIN kategoris k ON k.id = dt.kategori_id
    WHERE b.jenis_id = 4
    GROUP BY dt.kategori_id, k.name, t.type
  `;
  console.log("Detail transaksi untuk barang berjenis Tray (jenis_id=4):", res2);

  // Check jurnal_details for kategori 62
  const res3 = await prisma.$queryRaw`
    SELECT 
      SUM(jd.debit) as total_debit,
      SUM(jd.kredit) as total_kredit,
      SUM(jd.debit - jd.kredit) as net_debit
    FROM jurnal_details jd
    WHERE jd.kategori_id = 62
  `;
  console.log("Jurnal details untuk kategori 62 (Stok Tray):", res3);
}

main().finally(() => prisma.$disconnect());
