const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== DETAIL PENGURANGAN BATCH OLEH OPN-20261102-TLR-OPMB (HOREN) ===");
  
  // Cari stok keluar batch yang terhubung ke opname ini
  // atau cek stok_keluar_batches
  const keluarBatches = await prisma.stokKeluarBatch.findMany({
    where: {
      referensiType: 'OPNAME',
      referensiId: 92873n // wait, let's find the opname id first
    }
  });
  
  const opHoren = await prisma.stokOpname.findFirst({
    where: { nomorOpname: 'OPN-20261102-TLR-OPMB' }
  });
  console.log("Opname Horen:", opHoren);

  if (opHoren) {
    const keluars = await prisma.stokKeluarBatch.findMany({
      where: {
        referensiType: 'OPNAME',
        referensiId: opHoren.id
      },
      include: {
        stokBatch: true
      }
    });
    console.log(`Jumlah baris stokKeluarBatch: ${keluars.length}`);
    let totalQtyKeluar = 0;
    const batchGroup = {};
    for (const k of keluars) {
      totalQtyKeluar += Number(k.qty);
      const date = k.stokBatch.tanggal.toISOString().split('T')[0];
      batchGroup[date] = (batchGroup[date] || 0) + Number(k.qty);
    }
    console.log(`Total Qty Keluar dari batches: ${totalQtyKeluar} Kg`);
    console.log("Rincian Qty yang dipotong berdasarkan tanggal batch asalnya:");
    console.log(batchGroup);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
