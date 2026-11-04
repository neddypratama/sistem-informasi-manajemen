const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPEKSI HISTORI BARANG HOREN ===");
  
  const horen = await prisma.barang.findFirst({
    where: { name: 'Horen' },
    include: { jenis: true }
  });
  console.log("Barang Horen:", horen);

  if (!horen) return;

  // Batches
  const batches = await prisma.stokBatch.findMany({
    where: { barangId: horen.id },
    orderBy: { tanggal: 'asc' }
  });
  console.log(`\nTotal batches Horen: ${batches.length}`);
  let totalMasuk = 0;
  let totalSisa = 0;
  for (const b of batches) {
    totalMasuk += Number(b.qtyAwal);
    totalSisa += Number(b.qtySisa);
    console.log(`- Batch #${b.id} (${b.nomorBatch}) Tgl: ${b.tanggal.toISOString().split('T')[0]}: Masuk=${b.qtyAwal}, Sisa=${b.qtySisa}, HPP=${b.hpp}, Ref=${b.referensiType} #${b.referensiId}`);
  }
  console.log(`Total Masuk Batches: ${totalMasuk}, Total Sisa Batches: ${totalSisa}`);

  // Transaksi Penjualan & Pembelian Horen
  const txDetails = await prisma.detailTransaksi.findMany({
    where: { barangId: horen.id },
    include: {
      transaksi: true
    },
    orderBy: { createdAt: 'desc' },
    take: 15
  });
  console.log(`\n15 Transaksi Terakhir Horen:`);
  for (const td of txDetails) {
    console.log(`- Tx #${td.transaksi.id} (${td.transaksi.nomorTransaksi}) Tgl: ${td.transaksi.tanggal.toISOString().split('T')[0]} | Type: ${td.transaksi.type} | Qty: ${td.jumlah} | Status: ${td.transaksi.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
