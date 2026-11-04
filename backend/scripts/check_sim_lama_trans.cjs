const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const transTypes = await prisma.$queryRawUnsafe(`
    SELECT t.type, COUNT(*) as c
    FROM bimapratama.transaksis t
    GROUP BY t.type
  `);
  console.log("SIM Lama transaksis types:", transTypes);

  // Check detail_transaksis for Stok Tray in SIM Lama
  const trayDetails = await prisma.$queryRawUnsafe(`
    SELECT t.type, COUNT(*) as c, SUM(dt.sub_total) as total
    FROM bimapratama.detail_transaksis dt
    JOIN bimapratama.transaksis t ON t.id = dt.transaksi_id
    WHERE dt.kategori_id = 62
    GROUP BY t.type
  `);
  console.log("SIM Lama Stok Tray details:", trayDetails);
}

main().finally(() => prisma.$disconnect());
