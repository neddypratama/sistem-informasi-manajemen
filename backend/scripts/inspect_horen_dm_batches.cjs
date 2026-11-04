const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Let's check bimapratama.stok_batches for Horen DM (15)
  const oldBatches = await prisma.$queryRawUnsafe(`
    SELECT id, barang_id, qty_masuk, qty_sisa, harga, tanggal
    FROM bimapratama.stok_batches
    WHERE barang_id = 15
    ORDER BY id ASC
  `);
  console.log("All old batches for Horen DM (15):", oldBatches);

  // Let's check v2 stok_batches for Horen DM (15)
  const v2Batches = await prisma.stokBatch.findMany({
    where: { barangId: 15n },
    orderBy: { id: 'asc' }
  });
  console.log("All v2 batches for Horen DM (15):", v2Batches.map(b => ({
    id: b.id.toString(),
    qtyMasuk: Number(b.qtyMasuk),
    qtySisa: Number(b.qtySisa),
    hargaBeli: Number(b.hargaBeli),
    tanggal: b.tanggal
  })));
}

main().finally(() => prisma.$disconnect());
