const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const batches = await prisma.$queryRawUnsafe(`
    SELECT sb.id, sb.barang_id, sb.qty_masuk, sb.qty_sisa, sb.harga_beli, sb.tanggal, sb.detail_transaksi_id,
           dt.transaksi_id, t.invoice, t.type, t.keterangan
    FROM bimapratama_v2.stok_batches sb
    LEFT JOIN bimapratama_v2.detail_transaksis dt ON sb.detail_transaksi_id = dt.id
    LEFT JOIN bimapratama_v2.transaksis t ON dt.transaksi_id = t.id
    WHERE sb.id IN (13115, 13176)
  `);
  console.log('Batches 13115 & 13176 details:', batches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
