const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const barangIds = [12, 15, 16, 20, 23, 152];
  for (const bid of barangIds) {
    const oldBatches = await prisma.$queryRawUnsafe(`
      SELECT id, barang_id, qty_masuk, qty_sisa, harga, tanggal
      FROM bimapratama.stok_batches
      WHERE barang_id = ${bid} AND qty_sisa > 0
      ORDER BY tanggal ASC, id ASC
    `);
    const newBatches = await prisma.stokBatch.findMany({
      where: { barangId: BigInt(bid), qtySisa: { gt: 0 } },
      orderBy: [{ tanggal: 'asc' }, { id: 'asc' }]
    });

    console.log(`\n=== BARANG ID ${bid} ===`);
    console.log(`Old active batches sum:`, oldBatches.reduce((a, b) => a + Number(b.qty_sisa), 0));
    console.log(`New active batches sum:`, newBatches.reduce((a, b) => a + Number(b.qtySisa), 0));
    console.log(`Old active count: ${oldBatches.length}, New active count: ${newBatches.length}`);
  }
}

main().finally(() => prisma.$disconnect());
