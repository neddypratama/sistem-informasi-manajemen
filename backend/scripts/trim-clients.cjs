const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$executeRawUnsafe('UPDATE clients SET name = TRIM(name)');
  console.log('Trimmed clients successfully. Affected rows:', result);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
