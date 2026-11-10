const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const perms = await prisma.permission.findMany({
    where: { name: { contains: 'kas' } }
  });
  console.log('Permissions containing kas:');
  console.table(perms);

  // Check roles having kas permissions
  const rolePerms = await prisma.rolePermission.findMany({
    where: { permission: { name: { contains: 'kas' } } },
    include: { role: true, permission: true }
  });
  console.log('Role permissions for kas:');
  for (const rp of rolePerms) {
    console.log(`Role: ${rp.role.name} -> Perm: ${rp.permission.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
