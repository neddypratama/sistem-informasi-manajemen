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
  console.log("=== PERBANDINGAN STOK TELUR SIM LAMA VS SIM BARU ===");

  const opnames = await prisma.stokOpname.findMany({
    where: { nomorOpname: { in: TARGET_NOMOR } },
    include: { barang: { include: { satuan: true } } }
  });

  for (const op of opnames) {
    const bId = op.barangId;
    
    // Stok di SIM Lama dari bimapratama.stok_batches
    const simLamaBatches = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(qty_sisa), 0) as stok_lama_batches
      FROM bimapratama.stok_batches
      WHERE barang_id = ${bId}
    `);
    const stokLamaBatches = Number(simLamaBatches[0]?.stok_lama_batches || 0);

    // Stok di SIM Baru saat ini
    const v2Batches = await prisma.stokBatch.findMany({
      where: { barangId: bId }
    });
    const stokV2 = v2Batches.reduce((acc, b) => acc + Number(b.qtySisa), 0);

    console.log(`\nBarang: [ID ${bId}] ${op.barang.name} (${op.barang.satuan?.name}):`);
    console.log(`  - Stok SIM Lama (batches)   : ${stokLamaBatches}`);
    console.log(`  - Stok SIM Baru saat ini    : ${stokV2}`);
    console.log(`  - Stok Sistem saat opname   : ${op.stokSistem}`);
    console.log(`  - Stok Fisik diinput Kholaif: ${op.stokFisik}`);
    console.log(`  - Selisih dipotong opname   : ${Number(op.stokFisik) - Number(op.stokSistem)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
