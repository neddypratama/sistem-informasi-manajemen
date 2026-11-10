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

  async function checkKas(label, params) {
    console.log(`\n======================================================`);
    console.log(`TEST: ${label} (${params})`);
    console.log(`======================================================`);
    const res = await fetch(`http://localhost:4000/api/v1/reports/laporan-kas${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    const d = json.data || json;

    const debyRekap = (d.rekapAkun || []).find(a => a.id === 71);
    console.log('Rekap Akun Kas Deby:', debyRekap);

    console.log(`Total Mutasi Rinci count: ${(d.mutasiRinci || []).length}`);
    if (d.mutasiRinci && d.mutasiRinci.length > 0) {
      console.log('Sample mutasi rinci:');
      console.log(d.mutasiRinci.slice(0, 2));
      if (params.includes('71')) {
        console.log('Last mutasi rinci:');
        console.log(d.mutasiRinci.slice(-2));
      }
    }
  }

  // 1. Default (Semua / filter tanggal default)
  await checkKas("1. Default Laporan Kas", "");
  // 2. Bulan November 2026
  await checkKas("2. Bulan November 2026", "?startDate=2026-11-01&endDate=2026-11-30");
  // 3. Filter Kas Deby saja
  await checkKas("3. Filter Kas Deby (id: 71)", "?kasAccountId=71");
  // 4. Filter Kas Deby di Bulan November
  await checkKas("4. Filter Kas Deby Bulan November", "?kasAccountId=71&startDate=2026-11-01&endDate=2026-11-30");
}

main().catch(console.error).finally(() => prisma.$disconnect());
