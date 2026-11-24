const { PrismaClient } = require('../node_modules/@prisma/client');
const { TransaksiService } = require('../dist/modules/transaksi/transaksi.service.js');

const prisma = new PrismaClient();
const service = new TransaksiService(prisma);

async function runReturPembelianTests() {
  console.log('====================================================');
  console.log('AUDIT & VERIFIKASI RETUR PEMBELIAN SEMUA KOMODITAS');
  console.log('====================================================\n');

  const user = await prisma.user.findFirst();
  const userId = Number(user.id);
  const peternak = await prisma.client.findFirst({ where: { type: 'Peternak' } });

  // 1. Buat pembelian awal dengan 4 komoditas (Telur, Pakan, Obat, Tray)
  console.log('1. Membuat transaksi pembelian awal (Telur, Sentrat, Obat, Tray)...');
  const tx = await service.createPembelian({
    tanggal: '2026-11-24',
    clientId: Number(peternak.id),
    paymentAccountId: 72,
    paymentMethod: 'KREDIT_BON',
    keterangan: 'Pembelian awal untuk test retur',
    diskon: 0,
    items: [
      { barangId: 5, qty: 10, hargaSatuan: 22000 },  // Horen (Telur)
      { barangId: 74, qty: 10, hargaSatuan: 400000 }, // 144 (Sentrat)
      { barangId: 26, qty: 10, hargaSatuan: 48000 },  // NEOBRO (Obat)
      { barangId: 12, qty: 100, hargaSatuan: 1800 },  // Puyuh DM (Tray)
    ],
  }, userId);

  const fullTx = await prisma.transaksi.findUnique({
    where: { id: tx.id },
    include: { details: true },
  });

  console.log(`   -> Created: ${tx.invoice}, Total: ${tx.total}`);

  // 2. Retur masing-masing barang sebagian
  console.log('2. Membuat transaksi Retur Pembelian...');
  const returTx = await service.createReturPembelian({
    tanggal: '2026-11-24',
    clientId: Number(peternak.id),
    paymentAccountId: 72,
    paymentMethod: 'KREDIT_BON',
    keterangan: `Retur pembelian dari ${tx.invoice}`,
    diskon: 0,
    items: [
      { originalDetailId: Number(fullTx.details[0].id), barangId: 5, qty: 2, hargaSatuan: 22000 },
      { originalDetailId: Number(fullTx.details[1].id), barangId: 74, qty: 1, hargaSatuan: 400000 },
      { originalDetailId: Number(fullTx.details[2].id), barangId: 26, qty: 3, hargaSatuan: 48000 },
      { originalDetailId: Number(fullTx.details[3].id), barangId: 12, qty: 20, hargaSatuan: 1800 },
    ],
  }, userId);

  console.log(`   -> Retur Created: ${returTx.invoice}, Total: ${returTx.total}`);

  // 3. Verifikasi rincian retur & jurnal
  const verifiedRetur = await prisma.transaksi.findUnique({
    where: { id: returTx.id },
    include: {
      details: { include: { barang: true, kategori: true } },
      jurnalUmums: { include: { details: { include: { kategori: true } } } },
    },
  });

  console.log('3. Verifikasi rincian barang retur:');
  for (const d of verifiedRetur.details) {
    console.log(`   - Barang: ${d.barang?.name}, Kategori: ${d.kategori?.name} (id: ${d.kategoriId}), Qty: ${d.qty}`);
    if (!d.kategori) throw new Error(`Retur detail ${d.id} has invalid kategoriId ${d.kategoriId}`);
  }

  const jurnal = verifiedRetur.jurnalUmums[0];
  let sumDebit = 0;
  let sumKredit = 0;
  for (const jd of jurnal.details) {
    sumDebit += Number(jd.debit || 0);
    sumKredit += Number(jd.kredit || 0);
  }
  console.log(`4. Verifikasi jurnal retur: ${jurnal.nomorJurnal} Debit=${sumDebit}, Kredit=${sumKredit}`);
  if (Math.abs(sumDebit - sumKredit) > 0.01) {
    throw new Error('Jurnal retur tidak seimbang!');
  }

  // 4. Cleanup retur first, then original tx
  await service.remove(Number(returTx.id));
  await service.remove(Number(tx.id));
  console.log('5. Cleanup: Transaksi retur dan pembelian berhasil dibersihkan.\n');
  console.log('SEMUA TEST RETUR PEMBELIAN BERHASIL 100%!');
}

runReturPembelianTests()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
