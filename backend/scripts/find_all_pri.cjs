const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allPri = await prisma.client.findMany({
    where: {
      OR: [
        { name: { contains: 'Pri' } },
        { name: { contains: 'Supri' } }
      ]
    }
  });
  console.log("Semua Client terkait Pri / Supri:", allPri);
}

main().catch(console.error).finally(() => prisma.$disconnect());
