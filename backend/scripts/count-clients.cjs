const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.client.count();
  console.log('Total clients count:', total);

  const totalBarang = await prisma.barang.count();
  console.log('Total barangs count:', totalBarang);

  // Group by type
  const byType = await prisma.client.groupBy({
    by: ['type'],
    _count: true,
  });
  console.log('Clients by type:', byType);
}

main().catch(console.error).finally(() => prisma.$disconnect());
