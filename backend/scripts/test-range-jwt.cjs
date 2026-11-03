const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const http = require('http');

async function main() {
  const user = await prisma.user.findFirst({ where: { username: 'admin' }, include: { role: true } });
  const secret = process.env.JWT_SECRET || 'secretKey';
  const token = jwt.sign({
    sub: Number(user.id),
    username: user.username,
    roleId: Number(user.roleId),
    role: user.role.name,
  }, secret, { expiresIn: '1h' });

  http.get('http://localhost:4000/api/v1/transaksi?type=PENJUALAN&startDate=2026-10-01&endDate=2026-11-03&limit=2000&status=SELESAI', {
    headers: { 'Authorization': `Bearer ${token}` }
  }, res => {
    let b = '';
    res.on('data', d => b += d);
    res.on('end', () => {
      const parsed = JSON.parse(b);
      const items = parsed.data?.items || parsed.items || parsed.data || [];
      console.log('Returned items with limit=2000:', items.length);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
