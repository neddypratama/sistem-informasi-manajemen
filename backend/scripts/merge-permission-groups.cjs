const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mergeGroups() {
  const groupMappings = [
    { from: 'Komoditas Obat', to: 'Komoditas Obat-Obatan' },
    { from: 'Komoditas Pakan', to: 'Komoditas Pakan Pabrikan' },
    { from: 'Komoditas Tray', to: 'Komoditas Egg Tray' },
    { from: 'Keuangan & Kas', to: 'Keuangan Kas & Bank' },
    { from: 'Modul Laporan', to: 'Modul Laporan & Akuntansi' },
    { from: 'Kasir & Stok', to: 'Manajemen Stok & Gudang' },
    { from: 'Manajemen Pengguna', to: 'Manajemen Pengguna & RBAC' },
    { from: 'Sistem & Pengaturan', to: 'Sistem & Audit' },
  ];

  for (const m of groupMappings) {
    const res = await prisma.permission.updateMany({
      where: { group: m.from },
      data: { group: m.to },
    });
    console.log(`Updated ${res.count} permissions from '${m.from}' to '${m.to}'`);
  }
}

mergeGroups()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
