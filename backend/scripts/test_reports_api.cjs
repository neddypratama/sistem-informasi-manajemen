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

  async function callAset(label, params = '') {
    console.log(`\n======================================================`);
    console.log(`SCENARIO: ${label} (${params})`);
    console.log(`======================================================`);
    const res = await fetch(`http://localhost:4000/api/v1/reports/aset${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    const d = json.data || json;

    console.log(`Total Aset      : Rp ${Number(d.totalAset).toLocaleString('id-ID')}`);
    console.log(`Total Liabilitas: Rp ${Number(d.totalLiabilitas).toLocaleString('id-ID')}`);
    console.log(`Modal Bersih    : Rp ${Number(d.totalModal).toLocaleString('id-ID')}`);

    console.log("\nRincian Liabilitas (Hutang):");
    for (const g of d.liabilitasGroups || []) {
      console.log(`[${g.group}] Total: Rp ${Number(g.total).toLocaleString('id-ID')}`);
      for (const item of g.details) {
        if (item.saldo !== 0 || item.kategori.toLowerCase().includes('pri') || item.kategori.toLowerCase().includes('supri') || item.kategori.toLowerCase().includes('peternak')) {
          console.log(`   - ${item.kategori}: Rp ${Number(item.saldo).toLocaleString('id-ID')}`);
        }
      }
    }

    console.log("\nRincian Piutang / Aset:");
    for (const g of d.asetGroups || []) {
      if (g.group.toLowerCase().includes('piutang') || g.group.toLowerCase().includes('kas') || g.group.toLowerCase().includes('stok')) {
        console.log(`[${g.group}] Total: Rp ${Number(g.total).toLocaleString('id-ID')}`);
        for (const item of g.details) {
          if (item.saldo !== 0 || item.kategori.toLowerCase().includes('pri') || item.kategori.toLowerCase().includes('supri')) {
            console.log(`   - ${item.kategori}: Rp ${Number(item.saldo).toLocaleString('id-ID')}`);
          }
        }
      }
    }
  }

  await callAset("1. SEMUA WAKTU (Tanpa Filter)", "");
  await callAset("2. RENTANG SAMPAI HARI INI (01 Nov - 07 Nov)", "?startDate=2026-11-01&endDate=2026-11-07");
  await callAset("3. PER TGL 31 OKT (endDate: 2026-10-31)", "?endDate=2026-10-31");
  await callAset("4. RENTANG OKTOBER (01 Okt - 31 Okt)", "?startDate=2026-10-01&endDate=2026-10-31");
}

main().catch(console.error).finally(() => prisma.$disconnect());
