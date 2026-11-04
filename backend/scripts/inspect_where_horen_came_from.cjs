const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const horen = await prisma.barang.findFirst({ where: { name: 'Horen' } });
  
  // Ambil semua batches Horen yang dibuat sebelum atau pada 02 Nov 2026
  // Kita ingin tahu batch-batch mana yang dipotong oleh opname Horen OPN-20261102-TLR-OPMB
  // Saat opname berjalan, berkurang 39.055,61 Kg
  // Mari kita cek sisa stok sebelum 31 Okt vs setelah 31 Okt
  
  // Cek perbandingan stok Horen di SIM Lama per 30 Okt 2026
  const simLamaStokHoren = await prisma.$queryRawUnsafe(`
    SELECT 
      SUM(CASE WHEN status = 'Selesai' THEN tambah - kurang - kotor - bentes - ceplok - jumbo - rusak ELSE 0 END) as stok_lama
    FROM bimapratama.stoks
    WHERE barang_id = 5
  `);
  console.log("Stok Horen di SIM Lama (bimapratama.stoks):", simLamaStokHoren);

  // Cek saldo transaksi di SIM Lama untuk barang Horen
  const simLamaTxHoren = await prisma.$queryRawUnsafe(`
    SELECT 
      SUM(CASE WHEN LOWER(t.type) = 'debit' THEN dt.jumlah ELSE -dt.jumlah END) as net_qty
    FROM bimapratama.detail_transaksis dt
    JOIN bimapratama.transaksis t ON t.id = dt.transaksi_id
    WHERE dt.barang_id = 5 AND t.status = 'Selesai'
  `);
  console.log("Net Qty Transaksi Horen di SIM Lama (detail_transaksis):", simLamaTxHoren);
}

main().catch(console.error).finally(() => prisma.$disconnect());
