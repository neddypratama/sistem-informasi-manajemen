const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [oldTxDate] = await prisma.$queryRawUnsafe(`
    SELECT MIN(tanggal) as min_tgl, MAX(tanggal) as max_tgl, MAX(created_at) as max_created
    FROM bimapratama.transaksis
  `);
  console.log('Old transaksis date range:', oldTxDate);

  const [oldBatchDate] = await prisma.$queryRawUnsafe(`
    SELECT MIN(tanggal) as min_tgl, MAX(tanggal) as max_tgl, MAX(created_at) as max_created
    FROM bimapratama.stok_batches
  `);
  console.log('Old stok_batches date range:', oldBatchDate);

  // Check sales on Nov 2 in bimapratama_v2
  const recentSales = await prisma.$queryRawUnsafe(`
    SELECT t.id, t.invoice, t.tanggal, t.type, t.total, t.keterangan, t.created_at,
           b.id as barang_id, b.name as barang_name, dt.qty, dt.harga_satuan, dt.subtotal
    FROM bimapratama_v2.transaksis t
    JOIN bimapratama_v2.detail_transaksis dt ON t.id = dt.transaksi_id
    JOIN bimapratama_v2.barangs b ON dt.barang_id = b.id
    WHERE t.id > 90137 AND t.type = 'PENJUALAN'
  `);
  console.log(`Recent sales in v2 (id > 90137): ${recentSales.length}`);
  console.table(recentSales);
}

main().catch(console.error).finally(() => prisma.$disconnect());
