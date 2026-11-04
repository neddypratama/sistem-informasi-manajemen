const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_NOMOR = [
  'OPN-20261102-TLR-EXSB',
  'OPN-20261102-TLR-T228',
  'OPN-20261102-TLR-OPMB',
  'OPN-20261102-TLR-MI7R',
  'OPN-20261102-TLR-KB75',
  'OPN-20261102-TLR-SJAT',
  'OPN-20261102-TLR-6ORE',
  'OPN-20261102-TLR-27AY',
  'OPN-20261102-TLR-6Z6B',
  'OPN-20261102-TLR-N79V'
];

async function main() {
  console.log("=== CEK KEAMANAN DOWNSTREAM TRANSACTION UNTUK 10 OPNAME TELUR ===\n");

  const opnames = await prisma.stokOpname.findMany({
    where: { nomorOpname: { in: TARGET_NOMOR } },
    include: { barang: true }
  });

  const barangIds = opnames.map(o => o.barangId);

  // Cek apakah ada transaksi penjualan / konversi setelah 02 Nov 2026 untuk barang-barang ini
  const txsAfter = await prisma.detailTransaksi.findMany({
    where: {
      barangId: { in: barangIds },
      transaksi: {
        createdAt: { gt: new Date('2026-11-02T12:00:00') }
      }
    },
    include: {
      transaksi: true,
      barang: true
    }
  });

  console.log(`Transaksi setelah opname 02 Nov 2026: ${txsAfter.length}`);
  for (const t of txsAfter) {
    console.log(`- [${t.transaksi.type}] ${t.transaksi.invoice} | ${t.barang.name} | Qty: ${t.qty} | CreatedAt: ${t.transaksi.createdAt.toISOString()}`);
  }

  // Cek konversi barang
  const konversis = await prisma.konversiBarang.findMany({
    where: {
      OR: [
        { barangAwalId: { in: barangIds } },
        { barangAkhirId: { in: barangIds } }
      ],
      createdAt: { gt: new Date('2026-11-02T12:00:00') }
    }
  });
  console.log(`Konversi setelah 02 Nov 2026: ${konversis.length}`);

  // Cek sisa stok barang-barang ini saat ini di bimapratama_v2
  console.log('\n=== TOTAL SISA STOK SAAT INI (BIMAPRATAMA_V2) VS TARGET FISIK OPNAME ===');
  for (const op of opnames) {
    const batches = await prisma.stokBatch.findMany({
      where: { barangId: op.barangId }
    });
    const currentStok = batches.reduce((sum, b) => sum + Number(b.qtySisa), 0);
    console.log(`- ${op.barang.name}: Saat Ini = ${currentStok} | Fisik Opname = ${op.stokFisik} | Selisih Opname Lalu = ${Number(op.stokFisik) - Number(op.stokSistem)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
