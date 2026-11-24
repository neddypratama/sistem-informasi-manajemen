const { PrismaClient } = require('../node_modules/@prisma/client');
const { TransaksiService } = require('../dist/modules/transaksi/transaksi.service.js');

const prisma = new PrismaClient();
const transaksiService = new TransaksiService(prisma);

async function testPembelianSentratDanKucing() {
  console.log('Testing createPembelian containing Sentrat & Pakan Kucing...');

  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found');

  const dto = {
    tanggal: '2026-11-23',
    clientId: 238, // Sentrat SK
    paymentAccountId: 83, // Hutang Sentrat SK
    paymentMethod: 'KREDIT_BON',
    keterangan: 'TEST Pembelian sentrat dan pakan kucing',
    diskon: 0,
    items: [
      { barangId: 78, qty: 200, hargaSatuan: 411500 }, // BP 104
      { barangId: 86, qty: 5, hargaSatuan: 452000 },   // Grower
      { barangId: 116, qty: 80, hargaSatuan: 10606.25 }, // EXCEL UNGU IKAN 500gr
      { barangId: 118, qty: 40, hargaSatuan: 10606.25 }, // EXCEL HIJAU DONAT 500gr
      { barangId: 79, qty: 5, hargaSatuan: 536250 },   // 511
      { barangId: 139, qty: 2, hargaSatuan: 411500 },  // T781-2
    ],
  };

  try {
    const result = await transaksiService.createPembelian(dto, Number(user.id));
    console.log('SUCCESS! Created Pembelian:', result.invoice, 'Total:', result.total);

    const txWithDetails = await prisma.transaksi.findUnique({
      where: { id: result.id },
      include: { details: { include: { barang: true, kategori: true } }, jurnalUmums: { include: { details: true } } },
    });

    console.log('Details created:');
    txWithDetails?.details.forEach((d) => {
      console.log(`- Barang: ${d.barang?.name}, Kategori: ${d.kategori?.name} (id: ${d.kategoriId}), Qty: ${d.qty}, Subtotal: ${d.subtotal}`);
    });

    console.log('Jurnal Umum:');
    txWithDetails?.jurnalUmums.forEach((j) => {
      console.log(`- ${j.nomorJurnal}:`);
      j.details.forEach((jd) => {
        console.log(`  * COA/Kategori: ${jd.kategoriId}, Debit: ${jd.debit}, Kredit: ${jd.kredit}`);
      });
    });

    // Cleanup the test transaction
    console.log('Cleaning up test transaction...');
    await transaksiService.remove(Number(result.id));
    console.log('Cleaned up successfully! Test completed.');
  } catch (err) {
    console.error('FAILED TO CREATE PEMBELIAN:', err);
    throw err;
  }
}

testPembelianSentratDanKucing()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    prisma.$disconnect();
    process.exit(1);
  });
