const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dbs = await prisma.$queryRawUnsafe('SHOW DATABASES');
  console.log('Databases:', dbs);

  // Check tables in current db
  const tables = await prisma.$queryRawUnsafe('SHOW TABLES');
  console.log('Tables in current DB:', tables.map(t => Object.values(t)[0]));
}

main().catch(console.error).finally(() => prisma.$disconnect());
