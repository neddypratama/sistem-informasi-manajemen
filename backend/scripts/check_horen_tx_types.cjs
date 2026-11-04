const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const horen = await prisma.barang.findFirst({ where: { name: 'Horen' } });
  
  // Ambil transaksi Horen tgl >= 31 Okt 2026
  const txs = await prisma.detailTransaksi.findMany({
    where: {
      barangId: horen.id,
      transaksi: {
        tanggal: { gte: new Date('2026-10-31') }
      }
    },
    include: {
      transaksi: true
    },
    orderBy: {
      transaksi: { tanggal: 'asc' }
    }
  });

  console.log(`Transaksi Horen sejak 31 Okt 2026: ${txs.length}`);
  let totalBeli = 0;
  let totalJual = 0;
  for (const t of txs) {
    const type = t.transaksi.type;
    const qty = Number(t.qty);
    if (type === 'PEMBELIAN') totalBeli += qty;
    if (type === 'PENJUALAN') totalJual += qty;
    console.log(`- ${t.transaksi.tanggal.toISOString().split('T')[0]} | ${type} | ${t.transaksi.invoice} | Qty: ${qty} | Status: ${t.transaksi.status}`);
  }
  console.log(`Total Beli (>= 31 Okt): ${totalBeli} Kg, Total Jual: ${totalJual} Kg`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
