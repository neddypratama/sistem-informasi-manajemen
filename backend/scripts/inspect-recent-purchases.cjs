const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, username: true } });
  console.log('Users in v2:', users);

  // Check what purchases were entered with id > 90137
  const recentPurchases = await prisma.$queryRawUnsafe(`
    SELECT t.id, t.invoice, t.tanggal, t.type, t.total, t.keterangan, t.created_at,
           b.id as barang_id, b.name as barang_name, dt.qty, dt.harga_satuan, dt.subtotal
    FROM bimapratama_v2.transaksis t
    JOIN bimapratama_v2.detail_transaksis dt ON t.id = dt.transaksi_id
    JOIN bimapratama_v2.barangs b ON dt.barang_id = b.id
    WHERE t.id > 90137 AND t.type = 'PEMBELIAN'
  `);
  console.log(`Recent purchases (id > 90137): ${recentPurchases.length}`);
  console.table(recentPurchases);
}

main().catch(console.error).finally(() => prisma.$disconnect());
