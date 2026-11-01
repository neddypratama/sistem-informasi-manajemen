const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const newPerms = [
    { name: 'dashboard:read', group: 'Dashboard & Analitik', description: 'Mengakses dashboard analitik eksekutif dan grafik omzet' },
    { name: 'obat:retur', group: 'Komoditas Obat', description: 'Membuat transaksi retur jual/beli obat-obatan & vitamin' },
    { name: 'tray:retur', group: 'Komoditas Tray', description: 'Membuat transaksi retur egg tray' },
    { name: 'logs:read', group: 'Sistem & Audit', description: 'Melihat riwayat log aktivitas pengguna (audit trail)' },
    { name: 'jurnal:read', group: 'Modul Laporan', description: 'Melihat buku jurnal umum dan detail jurnal akuntansi' },
    { name: 'stok:opname', group: 'Kasir & Stok', description: 'Melakukan stok opname dan penyesuaian fisik gudang' },
    { name: 'kas:manage', group: 'Keuangan & Kas', description: 'Mencatat transaksi mutasi kas & bank baru' },
    { name: 'bon_titipan:manage', group: 'Keuangan & Kas', description: 'Mencatat transaksi penambahan atau pemotongan bon dan titipan mitra' },
  ];

  for (const np of newPerms) {
    const existing = await prisma.permission.findUnique({ where: { name: np.name } });
    if (!existing) {
      const created = await prisma.permission.create({ data: np });
      console.log('Created permission:', Number(created.id), created.name);
    } else {
      console.log('Permission already exists:', Number(existing.id), existing.name);
    }
  }

  // Ambil semua permissions sekarang
  const allPerms = await prisma.permission.findMany();
  console.log('Total permissions now:', allPerms.length);

  // Berikan permissions baru ke role Admin (1) & Super Admin (8) & Manager (2)
  const targetRoles = [1, 2, 8];
  for (const rId of targetRoles) {
    for (const p of allPerms) {
      try {
        await prisma.rolePermission.upsert({
          where: {
            idx_role_permission_unique: {
              roleId: BigInt(rId),
              permissionId: BigInt(p.id)
            }
          },
          update: {},
          create: {
            roleId: BigInt(rId),
            permissionId: BigInt(p.id)
          }
        });
      } catch (err) {
        // ignore
      }
    }
  }

  // Tambahkan izin khusus ke role spesifik yang relevan:
  // Role 4: Pakan & Obat -> beri obat:retur & tray:retur
  const obatRetur = allPerms.find(p => p.name === 'obat:retur');
  const trayRetur = allPerms.find(p => p.name === 'tray:retur');
  if (obatRetur) {
    await prisma.rolePermission.upsert({
      where: { idx_role_permission_unique: { roleId: BigInt(4), permissionId: BigInt(obatRetur.id) } },
      update: {},
      create: { roleId: BigInt(4), permissionId: BigInt(obatRetur.id) }
    });
  }
  if (trayRetur) {
    await prisma.rolePermission.upsert({
      where: { idx_role_permission_unique: { roleId: BigInt(4), permissionId: BigInt(trayRetur.id) } },
      update: {},
      create: { roleId: BigInt(4), permissionId: BigInt(trayRetur.id) }
    });
  }

  // Role 5: Kas Tunai & Role 6: Kas Transfer -> beri kas:manage & bon_titipan:manage
  const kasManage = allPerms.find(p => p.name === 'kas:manage');
  const bonManage = allPerms.find(p => p.name === 'bon_titipan:manage');
  for (const rId of [5, 6]) {
    if (kasManage) {
      await prisma.rolePermission.upsert({
        where: { idx_role_permission_unique: { roleId: BigInt(rId), permissionId: BigInt(kasManage.id) } },
        update: {},
        create: { roleId: BigInt(rId), permissionId: BigInt(kasManage.id) }
      });
    }
    if (bonManage) {
      await prisma.rolePermission.upsert({
        where: { idx_role_permission_unique: { roleId: BigInt(rId), permissionId: BigInt(bonManage.id) } },
        update: {},
        create: { roleId: BigInt(rId), permissionId: BigInt(bonManage.id) }
      });
    }
  }

  // Role 7: Akuntansi dan Rekap -> beri jurnal:read
  const jurnalRead = allPerms.find(p => p.name === 'jurnal:read');
  if (jurnalRead) {
    await prisma.rolePermission.upsert({
      where: { idx_role_permission_unique: { roleId: BigInt(7), permissionId: BigInt(jurnalRead.id) } },
      update: {},
      create: { roleId: BigInt(7), permissionId: BigInt(jurnalRead.id) }
    });
  }

  console.log('Perms setup completed successfully!');
  await prisma.$disconnect();
}

run().catch(console.error);
