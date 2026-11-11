const http = require('http');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { username: 'admin' },
    include: { role: true }
  });

  const token = jwt.sign(
    { sub: admin.id.toString(), username: admin.username, role: admin.role?.name || 'admin' },
    process.env.JWT_SECRET || 'secretKey',
    { expiresIn: '1h' }
  );

  const req = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/v1/reports/aset',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('HTTP Status:', res.statusCode);
      const json = JSON.parse(data);
      const body = json.data || json;
      console.log('Total Aset:', body.totalAset);
      console.log('Total Liabilitas:', body.totalLiabilitas);
      console.log('Total Modal:', body.totalModal);
      console.log('Aset Groups:', body.asetGroups?.map(g => `${g.group}: Rp ${g.total.toLocaleString('id-ID')}`));
      const hasCurah = body.asetGroups?.some(g => g.group.toLowerCase().includes('curah'));
      console.log('Has Curah in HTTP API?', hasCurah);
    });
  });

  req.on('error', console.error);
  req.end();
}

main().catch(console.error).finally(() => prisma.$disconnect());
