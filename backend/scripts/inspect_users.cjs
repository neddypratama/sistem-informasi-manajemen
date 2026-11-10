const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: { select: { name: true } } }
  });
  console.log('Users in v2:');
  console.table(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
