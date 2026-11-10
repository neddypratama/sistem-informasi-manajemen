const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pakPri = await prisma.client.findFirst({
    where: { name: { contains: 'Supriyadi' } }
  });
  console.log('Pak Pri:', pakPri);

  // Let's inspect all detail_transaksis for transactions with clientId = pakPri.id
  const dts = await prisma.$queryRaw`
    SELECT 
      t.type as tx_type,
      t.payment_method,
      k.id as kat_id,
      k.name as kat_name,
      dk.name as group_name,
      dk.type as group_type,
      COUNT(dt.id) as count,
      SUM(dt.subtotal) as sum_subtotal
    FROM detail_transaksis dt
    JOIN transaksis t ON t.id = dt.transaksi_id
    JOIN kategoris k ON k.id = dt.kategori_id
    JOIN detail_kategoris dk ON dk.id = k.detail_kategori_id
    WHERE t.client_id = ${pakPri.id} AND t.status = 'SELESAI'
    GROUP BY t.type, t.payment_method, k.id, k.name, dk.name, dk.type
    ORDER BY t.type, k.id
  `;
  console.log('Detail transaksis for Pak Pri:');
  console.table(dts);

  // Also check if there are transactions without detail_transaksi or if all tx have dt
  const txWithoutDt = await prisma.$queryRaw`
    SELECT COUNT(*) as cnt FROM transaksis t
    WHERE t.client_id = ${pakPri.id} AND NOT EXISTS (
      SELECT 1 FROM detail_transaksis dt WHERE dt.transaksi_id = t.id
    )
  `;
  console.log('Pak Pri Tx without detail:', txWithoutDt);
}

main().catch(console.error).finally(() => prisma.$disconnect());
