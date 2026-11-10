const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Cek transaksi Bp.Supriyadi di bimapratama (SIM Lama)
  const oldTxs = await prisma.$queryRawUnsafe(`
    SELECT t.id, t.invoice, t.tanggal, t.name, t.type, t.total, t.status
    FROM bimapratama.transaksis t
    WHERE t.client_id = 241
    ORDER BY t.tanggal DESC
    LIMIT 20
  `);
  console.log("SIM Lama Transaksis for client 241 (Bp.Supriyadi):", oldTxs);

  // Cek detail_transaksis di SIM Lama untuk client 241
  const oldDts = await prisma.$queryRawUnsafe(`
    SELECT dt.id, dt.transaksi_id, dt.kategori_id, k.name as kategori_name, dt.sub_total
    FROM bimapratama.detail_transaksis dt
    JOIN bimapratama.transaksis t ON t.id = dt.transaksi_id
    JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
    WHERE t.client_id = 241
    LIMIT 10
  `);
  console.log("SIM Lama Detail Transaksis for Bp.Supriyadi:", oldDts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
