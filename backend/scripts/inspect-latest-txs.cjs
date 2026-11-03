const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check latest transactions in bimapratama_v2
  const latestTxs = await prisma.transaksi.findMany({
    orderBy: { id: 'desc' },
    take: 10,
    select: {
      id: true,
      invoice: true,
      tanggal: true,
      type: true,
      total: true,
      createdAt: true,
    }
  });
  console.log('Latest transactions in bimapratama_v2:', latestTxs);

  // Check latest transaction date in bimapratama (old DB)
  const [oldLatest] = await prisma.$queryRawUnsafe('SELECT id, invoice, tanggal, created_at FROM bimapratama.transaksis ORDER BY id DESC LIMIT 5');
  console.log('Latest transactions in bimapratama (old DB):', oldLatest);
}

main().catch(console.error).finally(() => prisma.$disconnect());
