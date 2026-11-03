const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.$queryRawUnsafe(`
    SELECT * FROM bimapratama_v2.transaksis WHERE invoice IN ('INV-20261030-TLR-WS90', 'INV-20261031-TLR-IX1R')
  `);
  console.log('Txs in bimapratama_v2:', txs);

  // Check how many transactions in bimapratama_v2 have ID > 90137 (the max id in bimapratama)
  const [extraTxCount] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt, MIN(id) as min_id, MAX(id) as max_id FROM bimapratama_v2.transaksis WHERE id > 90137
  `);
  console.log('Extra txs in v2 (id > 90137):', extraTxCount);

  const extraSamples = await prisma.$queryRawUnsafe(`
    SELECT id, invoice, tanggal, type, total, keterangan, created_at FROM bimapratama_v2.transaksis WHERE id > 90137 LIMIT 10
  `);
  console.log('Extra txs samples:', extraSamples);
}

main().catch(console.error).finally(() => prisma.$disconnect());
