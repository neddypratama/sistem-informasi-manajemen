const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function run() {
  const roles = await p.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  for (const r of roles) {
    console.log(`Role: ${r.name} (ID: ${r.id})`);
    console.log(`  Permissions count: ${r.permissions.length}`);
    console.log(`  Permissions: ${r.permissions.map(rp => rp.permission.name).join(', ')}`);
  }
}

run().catch(console.error).finally(() => p.$disconnect());
