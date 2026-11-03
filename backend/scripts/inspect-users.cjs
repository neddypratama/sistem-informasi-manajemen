const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.$queryRawUnsafe(`SELECT id, name, username FROM bimapratama_v2.users LIMIT 5`);
  console.table(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
