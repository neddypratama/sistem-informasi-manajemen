const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sampleKredit = await prisma.$queryRawUnsafe(`
    SELECT t.id, t.type, t.name, dt.sub_total, dt.kuantitas, b.name as barang_name
    FROM bimapratama.detail_transaksis dt
    JOIN bimapratama.transaksis t ON t.id = dt.transaksi_id
    LEFT JOIN bimapratama.barangs b ON b.id = dt.barang_id
    WHERE dt.kategori_id = 62 AND t.type = 'Kredit'
    LIMIT 10
  `);
  console.log("Sample Kredit Stok Tray in SIM Lama:", sampleKredit);

  const sampleDebit = await prisma.$queryRawUnsafe(`
    SELECT t.id, t.type, t.name, dt.sub_total, dt.kuantitas, b.name as barang_name
    FROM bimapratama.detail_transaksis dt
    JOIN bimapratama.transaksis t ON t.id = dt.transaksi_id
    LEFT JOIN bimapratama.barangs b ON b.id = dt.barang_id
    WHERE dt.kategori_id = 62 AND t.type = 'Debit'
    LIMIT 10
  `);
  console.log("Sample Debit Stok Tray in SIM Lama:", sampleDebit);
}

main().finally(() => prisma.$disconnect());
