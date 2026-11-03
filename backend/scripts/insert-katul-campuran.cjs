const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.$queryRawUnsafe(`SELECT id FROM bimapratama_v2.barangs WHERE id = 158`);
  if (existing.length === 0) {
    await prisma.$queryRawUnsafe(`
      INSERT INTO bimapratama_v2.barangs (id, code, name, jenis_id, satuan_id, stok_minimum, is_active, created_at, updated_at)
      VALUES (158, 'BRG-0158', 'Katul Campuran', 9, 1, 0.00, 1, '2026-11-02 13:54:46', NOW())
    `);
    console.log('Berhasil menambahkan Katul Campuran (ID 158) ke bimapratama_v2.barangs.');
  } else {
    console.log('Katul Campuran (ID 158) sudah ada di bimapratama_v2.barangs.');
  }

  // Cek apakah ada batch
  const batch = await prisma.$queryRawUnsafe(`SELECT id FROM bimapratama_v2.stok_batches WHERE barang_id = 158`);
  if (batch.length === 0) {
    await prisma.$queryRawUnsafe(`
      INSERT INTO bimapratama_v2.stok_batches (barang_id, user_id, tanggal, qty_masuk, qty_sisa, harga_beli, created_at, updated_at)
      VALUES (158, 1, '2026-11-02 13:54:46', 0, 0, 0, NOW(), NOW())
    `);
    console.log('Berhasil membuat batch awal (qty=0) untuk Katul Campuran.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
