const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const curahTransfer = await prisma.transaksi.findMany({
    where: {
      details: { some: { barang: { jenisId: 9 } } },
      paymentMethod: 'TRANSFER',
    },
    take: 5,
  });
  console.log('Curah transfer txs count:', curahTransfer.length);

  // Check what payment methods exist for curah sales and purchases
  const curahMethods = await prisma.transaksi.groupBy({
    by: ['type', 'paymentMethod'],
    where: {
      details: { some: { barang: { jenisId: 9 } } },
    },
    _count: { id: true },
  });
  console.log('Curah transactions by type and method:', curahMethods);
}

main().catch(console.error).finally(() => prisma.$disconnect());
