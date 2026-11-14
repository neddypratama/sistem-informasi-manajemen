const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== MULTI-COMMODITY SINGLE NOTA TRANSACTION TEST ===');

  // 1. Find 1 Sentrat item (jenisId: 8) and 1 Curah item (jenisId: 9) with stock
  const sentratBarang = await prisma.barang.findFirst({
    where: {
      jenisId: 8n,
      isActive: true,
      stokBatches: { some: { qtySisa: { gt: 0 } } }
    },
    include: { jenis: true }
  });

  const curahBarang = await prisma.barang.findFirst({
    where: {
      jenisId: 9n,
      isActive: true,
      stokBatches: { some: { qtySisa: { gt: 0 } } }
    },
    include: { jenis: true }
  });

  console.log('Sentrat Item:', sentratBarang?.name, `(ID: ${sentratBarang?.id})`);
  console.log('Curah Item:', curahBarang?.name, `(ID: ${curahBarang?.id})`);

  if (!sentratBarang || !curahBarang) {
    throw new Error('Could not find available sentrat or curah barang with stock');
  }

  // Find a test user & client
  const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
  const client = await prisma.client.findFirst({ where: { type: 'Pedagang' } });

  const TransaksiService = require('../dist/modules/transaksi/transaksi.service').TransaksiService;
  const FifoService = require('../dist/modules/inventory/fifo.service').FifoService;
  const ReportsService = require('../dist/modules/reports/reports.service').ReportsService;

  const fifoService = new FifoService(prisma);
  const transaksiService = new TransaksiService(prisma, fifoService);
  const reportsService = new ReportsService(prisma);

  // 2. Create Multi-Commodity Penjualan
  // Item 1 (Sentrat): 2 @ 400.000 = 800.000
  // Item 2 (Curah): 10 @ 5.000 = 50.000
  // Diskon: 10.000
  // Total: 840.000
  const createPayload = {
    tanggal: new Date().toISOString().slice(0, 10),
    paymentMethod: 'TUNAI',
    paymentAccountId: 64, // Kas Tunai
    clientId: Number(client.id),
    diskon: 10000,
    keterangan: 'TEST MULTI-COMMODITY SINGLE NOTA',
    items: [
      {
        barangId: Number(sentratBarang.id),
        qty: 2,
        hargaSatuan: 400000,
      },
      {
        barangId: Number(curahBarang.id),
        qty: 10,
        hargaSatuan: 5000,
      }
    ]
  };

  console.log('\nCreating multi-commodity sale...');
  const tx = await transaksiService.createPenjualan(createPayload, Number(adminUser.id));
  console.log('Created invoice:', tx.invoice, `(ID: ${tx.id})`, 'Total:', tx.total);

  try {
    // 3. Inspect Jurnal Details
    const jurnal = await prisma.jurnalUmum.findFirst({
      where: { transaksiId: tx.id },
      include: {
        details: {
          include: { coa: true, kategori: true }
        }
      }
    });

    console.log(`\nJurnal: ${jurnal.nomorJurnal}`);
    let sumDebit = 0;
    let sumKredit = 0;
    for (const d of jurnal.details) {
      const deb = Number(d.debit);
      const kre = Number(d.kredit);
      sumDebit += deb;
      sumKredit += kre;
      console.log(`  - [COA ${d.coaId}] ${d.kategori?.name || d.coa?.name}: Debit=${deb.toLocaleString('id-ID')} | Kredit=${kre.toLocaleString('id-ID')}`);
    }

    console.log(`\nSum Debit:  Rp ${sumDebit.toLocaleString('id-ID')}`);
    console.log(`Sum Kredit: Rp ${sumKredit.toLocaleString('id-ID')}`);
    const isBalanced = Math.abs(sumDebit - sumKredit) < 0.01;
    console.log(`Jurnal is 100% Balanced? ${isBalanced}`);

    if (!isBalanced) {
      throw new Error('JURNAL UNBALANCED!');
    }

    // Verify presence of both Kategori 6 (Sentrat) and Kategori 8 (Curah)
    const hasSentratRev = jurnal.details.some(d => d.kategoriId === 6n && Number(d.kredit) > 0);
    const hasCurahRev = jurnal.details.some(d => d.kategoriId === 8n && Number(d.kredit) > 0);
    const hasSentratPersediaan = jurnal.details.some(d => d.kategoriId === 60n);
    const hasCurahPersediaan = jurnal.details.some(d => d.kategoriId === 89n);

    console.log(`\n- Contains Penjualan Pakan Sentrat (Ktg 6)? ${hasSentratRev}`);
    console.log(`- Contains Penjualan Pakan Curah (Ktg 8)?   ${hasCurahRev}`);
    console.log(`- Contains Stok Pakan Sentrat (Ktg 60)?      ${hasSentratPersediaan}`);
    console.log(`- Contains Stok Curah (Ktg 89)?             ${hasCurahPersediaan}`);

    if (!hasSentratRev || !hasCurahRev) {
      throw new Error('FAILED: Multi-COA revenue split missing!');
    }

    console.log('\nSUCCESS: Multi-COA Split Journal works flawlessly!');
  } finally {
    // Clean up test transaction
    console.log('\nCleaning up test transaction...');
    // Delete jurnal details & jurnal
    await prisma.jurnalDetail.deleteMany({ where: { jurnal: { transaksiId: tx.id } } });
    await prisma.jurnalUmum.deleteMany({ where: { transaksiId: tx.id } });
    // Delete stok keluar & detail transaksi & transaksi
    await prisma.stokKeluarBatch.deleteMany({ where: { detailTransaksi: { transaksiId: tx.id } } });
    await prisma.detailTransaksi.deleteMany({ where: { transaksiId: tx.id } });
    await prisma.transaksi.delete({ where: { id: tx.id } });
    console.log('Cleanup completed. Database is clean.');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
