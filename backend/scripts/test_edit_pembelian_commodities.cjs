const { PrismaClient } = require('../node_modules/@prisma/client');
const { TransaksiService } = require('../dist/modules/transaksi/transaksi.service.js');

const prisma = new PrismaClient();
const service = new TransaksiService(prisma);

async function runEditPembelianTests() {
  console.log('====================================================');
  console.log('AUDIT & VERIFIKASI EDIT PEMBELIAN SEMUA KOMODITAS');
  console.log('====================================================\n');

  const user = await prisma.user.findFirst();
  const userId = Number(user.id);
  const peternak = await prisma.client.findFirst({ where: { type: 'Peternak' } });
  const supplierSentrat = await prisma.client.findFirst({ where: { name: { contains: 'Sentrat SK' } } }) || peternak;

  // 1. Create a Pembelian Sentrat + Kucing
  console.log('1. Membuat transaksi pembelian Sentrat + Kucing awal...');
  const tx = await service.createPembelian({
    tanggal: '2026-11-24',
    clientId: Number(supplierSentrat.id),
    paymentAccountId: 83,
    paymentMethod: 'KREDIT_BON',
    keterangan: 'Pembelian awal untuk test edit',
    diskon: 0,
    items: [
      { barangId: 74, qty: 10, hargaSatuan: 400000 },  // Sentrat 144
      { barangId: 112, qty: 5, hargaSatuan: 20000 },   // Kucing Cat Choize
    ],
  }, userId);

  console.log(`   -> Created: ${tx.invoice}, Total: ${tx.total}`);

  // Fetch full details
  let fullTx = await prisma.transaksi.findUnique({
    where: { id: tx.id },
    include: { details: true },
  });

  // 2. Edit the Pembelian: Change quantities, add another item (Puyuh DM Tray)
  console.log('2. Mengubah pembelian: update qty dan tambah item Tray...');
  const updateDto = {
    tanggal: '2026-11-24',
    clientId: Number(supplierSentrat.id),
    keterangan: 'Pembelian telah diedit',
    diskon: 10000,
    items: [
      {
        detailId: Number(fullTx.details[0].id),
        barangId: 74,
        qty: 15, // Ubah dari 10 jadi 15
        hargaSatuan: 400000,
      },
      {
        detailId: Number(fullTx.details[1].id),
        barangId: 112,
        qty: 8, // Ubah dari 5 jadi 8
        hargaSatuan: 20000,
      },
      {
        // Item baru
        barangId: 12, // Puyuh DM Tray
        qty: 50,
        hargaSatuan: 2000,
      },
    ],
  };

  const updatedTx = await service.update(Number(tx.id), updateDto, userId);
  console.log(`   -> Update Success: Total baru Rp ${Number(updatedTx.total).toLocaleString('id-ID')}`);

  // 3. Verify updated details and journal
  const verifiedTx = await prisma.transaksi.findUnique({
    where: { id: tx.id },
    include: {
      details: { include: { barang: true, kategori: true } },
      jurnalUmums: { include: { details: true } },
    },
  });

  console.log('3. Verifikasi rincian barang setelah edit:');
  for (const d of verifiedTx.details) {
    console.log(`   - Barang: ${d.barang?.name}, Kategori: ${d.kategori?.name} (id: ${d.kategoriId}), Qty: ${d.qty}`);
    if (!d.kategori) throw new Error(`Detail ${d.id} has invalid kategoriId ${d.kategoriId}`);
  }

  const jurnal = verifiedTx.jurnalUmums[0];
  let sumDebit = 0;
  let sumKredit = 0;
  for (const jd of jurnal.details) {
    sumDebit += Number(jd.debit || 0);
    sumKredit += Number(jd.kredit || 0);
  }
  console.log(`4. Verifikasi jurnal: ${jurnal.nomorJurnal} Debit=${sumDebit}, Kredit=${sumKredit}`);
  if (Math.abs(sumDebit - sumKredit) > 0.01) {
    throw new Error('Jurnal setelah edit tidak seimbang!');
  }

  // 4. Cleanup
  await service.remove(Number(tx.id));
  console.log('5. Cleanup: Test transaction berhasil dihapus.\n');
  console.log('SEMUA TEST EDIT PEMBELIAN BERHASIL 100%!');
}

runEditPembelianTests()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
