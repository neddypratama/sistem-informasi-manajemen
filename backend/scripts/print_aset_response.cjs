const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function main() {
  const user = await prisma.user.findFirst({ where: { username: 'admin' }, include: { role: true } });
  const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-bima-pratama-erp-modernization-2026';
  const token = jwt.sign({
    sub: Number(user.id),
    username: user.username,
    roleId: Number(user.roleId),
    role: user.role.name,
  }, secret, { expiresIn: '1h' });

  const res = await fetch(`http://localhost:4000/api/v1/reports/aset`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const d = await res.json();
  console.log("Keys of response:", Object.keys(d));
  console.log("Sample response:", JSON.stringify(d).slice(0, 300));
}

main().catch(console.error).finally(() => prisma.$disconnect());
