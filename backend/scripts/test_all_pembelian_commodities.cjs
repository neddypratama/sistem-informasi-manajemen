const { PrismaClient } = require('../node_modules/@prisma/client');
const { TransaksiService } = require('../dist/modules/transaksi/transaksi.service.js');

const prisma = new PrismaClient();
const service = new TransaksiService(prisma);

async function runComprehensivePembelianTests() {
  console.log('====================================================');
  console.log('AUDIT & VERIFIKASI SEMUA PEMBELIAN KOMODITAS');
  console.log('====================================================\n');

  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user found in database');
  const userId = Number(user.id);

  // Get suppliers for tests
  const peternak = await prisma.client.findFirst({ where: { type: 'Peternak' } });
  const supplierSentrat = await prisma.client.findFirst({ where: { name: { contains: 'Sentrat SK' } } }) || peternak;
  const supplierPakPri = await prisma.client.findUnique({ where: { id: 241n } }) || peternak;
  const supplierObat = await prisma.client.findFirst({ where: { name: { contains: 'Obat' } } }) || peternak;
  const supplierTray = await prisma.client.findFirst({ where: { name: { contains: 'Tray' } } }) || peternak;

  const testCases = [
    // 1. TELUR
    {
      group: 'TELUR',
      title: 'Pembelian Telur Horn via Tunai (Kas 64)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(peternak.id),
        paymentAccountId: 64, // Kas Tunai
        paymentMethod: 'TUNAI',
        keterangan: 'Audit Test Pembelian Telur Horn Tunai',
        diskon: 0,
        items: [{ barangId: 5, qty: 100, hargaSatuan: 22000 }], // Horen
      },
      expectedKategoriStok: 59n, // Stok Telur
    },
    {
      group: 'TELUR',
      title: 'Pembelian Telur Bebek via Transfer (Bank BCA 66)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(peternak.id),
        paymentAccountId: 66, // Bank BCA Masduki
        paymentMethod: 'TRANSFER',
        keterangan: 'Audit Test Pembelian Telur Bebek Transfer',
        diskon: 0,
        items: [{ barangId: 1, qty: 50, hargaSatuan: 25000 }], // Golden (Bebek)
      },
      expectedKategoriStok: 59n, // Stok Telur
    },
    {
      group: 'TELUR',
      title: 'Pembelian Multi-Telur (Horn, Bebek, Puyuh, Arab, Asin) via Hutang Peternak (72)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(peternak.id),
        paymentAccountId: 72, // Hutang Peternak
        paymentMethod: 'KREDIT_BON',
        keterangan: 'Audit Test Pembelian Multi Telur Hutang',
        diskon: 50000,
        items: [
          { barangId: 5, qty: 80, hargaSatuan: 22000 },  // Horen
          { barangId: 1, qty: 30, hargaSatuan: 25000 },  // Golden (Bebek)
          { barangId: 7, qty: 200, hargaSatuan: 350 },   // Puyuh Bj
          { barangId: 10, qty: 40, hargaSatuan: 23000 }, // Arab Mrh
          { barangId: 3, qty: 20, hargaSatuan: 26000 },  // Asin Pth
        ],
      },
      expectedKategoriStok: 59n, // Stok Telur
    },

    // 2. PAKAN
    {
      group: 'PAKAN',
      title: 'Pembelian Pakan Sentrat Pabrikan via Hutang Sentrat SK (83)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(supplierSentrat.id),
        paymentAccountId: 83, // Hutang Sentrat SK
        paymentMethod: 'KREDIT_BON',
        keterangan: 'Audit Test Pembelian Pakan Sentrat',
        diskon: 25000,
        items: [{ barangId: 74, qty: 20, hargaSatuan: 410000 }], // 144
      },
      expectedKategoriStok: 60n, // Stok Pakan
    },
    {
      group: 'PAKAN',
      title: 'Pembelian Pakan Kucing via Kas Tunai (64)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(supplierSentrat.id),
        paymentAccountId: 64, // Kas Tunai
        paymentMethod: 'TUNAI',
        keterangan: 'Audit Test Pembelian Pakan Kucing Tunai',
        diskon: 0,
        items: [{ barangId: 112, qty: 15, hargaSatuan: 22500 }], // CAT CHOIZE OREN
      },
      expectedKategoriStok: 60n, // Stok Pakan
    },
    {
      group: 'PAKAN',
      title: 'Pembelian Pakan Curah via Saldo Bp. Supriyadi (76)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(supplierPakPri.id),
        paymentAccountId: 76, // Saldo Bp. Supriyadi
        paymentMethod: 'KREDIT_BON',
        keterangan: 'Audit Test Pembelian Pakan Curah Pak Pri',
        diskon: 0,
        items: [{ barangId: 98, qty: 1500, hargaSatuan: 5200 }], // Jagung OC
      },
      expectedKategoriStok: 89n, // Stok Curah
    },
    {
      group: 'PAKAN',
      title: 'Pembelian Gabungan Sentrat + Pakan Kucing + Pakan Curah 1 Nota',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(supplierSentrat.id),
        paymentAccountId: 83, // Hutang Sentrat SK
        paymentMethod: 'KREDIT_BON',
        keterangan: 'Audit Test Pembelian Gabungan Sentrat + Kucing + Curah',
        diskon: 100000,
        items: [
          { barangId: 74, qty: 10, hargaSatuan: 410000 }, // Sentrat 144
          { barangId: 112, qty: 20, hargaSatuan: 22500 }, // Kucing Cat Choize
          { barangId: 98, qty: 500, hargaSatuan: 5200 },  // Curah Jagung OC
        ],
      },
      multiStokExpected: [60n, 89n],
    },

    // 3. OBAT-OBATAN
    {
      group: 'OBAT',
      title: 'Pembelian Obat via Kas Tunai (64)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(supplierObat.id),
        paymentAccountId: 64, // Kas Tunai
        paymentMethod: 'TUNAI',
        keterangan: 'Audit Test Pembelian Obat Tunai',
        diskon: 0,
        items: [{ barangId: 26, qty: 10, hargaSatuan: 48000 }], // NEOBRO 250gr
      },
      expectedKategoriStok: 61n, // Stok Obat-Obatan
    },
    {
      group: 'OBAT',
      title: 'Pembelian Obat via Hutang Obat SK (80)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(supplierObat.id),
        paymentAccountId: 80, // Hutang Obat SK
        paymentMethod: 'KREDIT_BON',
        keterangan: 'Audit Test Pembelian Obat Hutang',
        diskon: 15000,
        items: [{ barangId: 26, qty: 25, hargaSatuan: 48000 }], // NEOBRO 250gr
      },
      expectedKategoriStok: 61n, // Stok Obat-Obatan
    },

    // 4. TRAY
    {
      group: 'TRAY',
      title: 'Pembelian Egg Tray via Transfer Bank (66)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(supplierTray.id),
        paymentAccountId: 66, // Bank BCA Masduki
        paymentMethod: 'TRANSFER',
        keterangan: 'Audit Test Pembelian Tray Transfer',
        diskon: 0,
        items: [{ barangId: 12, qty: 300, hargaSatuan: 1800 }], // Puyuh DM
      },
      expectedKategoriStok: 62n, // Stok Tray
    },
    {
      group: 'TRAY',
      title: 'Pembelian Egg Tray via Hutang Tray Diamond (77)',
      dto: {
        tanggal: '2026-11-24',
        clientId: Number(supplierTray.id),
        paymentAccountId: 77, // Hutang Tray Diamond /DM
        paymentMethod: 'KREDIT_BON',
        keterangan: 'Audit Test Pembelian Tray Hutang',
        diskon: 10000,
        items: [{ barangId: 12, qty: 500, hargaSatuan: 1800 }], // Puyuh DM
      },
      expectedKategoriStok: 62n, // Stok Tray
    },
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (let idx = 0; idx < testCases.length; idx++) {
    const tc = testCases[idx];
    console.log(`[TEST ${idx + 1}/${testCases.length}] [${tc.group}] ${tc.title}`);

    try {
      // 1. Execute createPembelian
      const tx = await service.createPembelian(tc.dto, userId);

      // 2. Fetch full transaction with details, stokBatches, and jurnal
      const fullTx = await prisma.transaksi.findUnique({
        where: { id: tx.id },
        include: {
          details: {
            include: { barang: { include: { jenis: true } }, kategori: true, stokBatches: true },
          },
          jurnalUmums: {
            include: { details: { include: { kategori: true } } },
          },
        },
      });

      if (!fullTx) throw new Error('Transaction record not found after creation');

      // 3. Assert invoice and totals
      if (!fullTx.invoice || Number(fullTx.total) <= 0) {
        throw new Error(`Invalid invoice ${fullTx.invoice} or total ${fullTx.total}`);
      }

      // 4. Assert details and kategoriId
      for (const d of fullTx.details) {
        if (!d.kategoriId) throw new Error(`Detail ${d.id} has null kategoriId`);
        if (!d.kategori) throw new Error(`Detail ${d.id} kategoriId ${d.kategoriId} does not exist in kategoris table!`);

        if (tc.expectedKategoriStok && d.kategoriId !== tc.expectedKategoriStok) {
          throw new Error(`Expected kategoriId ${tc.expectedKategoriStok} but got ${d.kategoriId} (${d.kategori.name})`);
        }
        if (tc.multiStokExpected && !tc.multiStokExpected.includes(d.kategoriId)) {
          throw new Error(`Kategori ${d.kategoriId} (${d.kategori.name}) not in expected multi-stok list`);
        }

        // Assert stokBatch created
        if (!d.stokBatches || d.stokBatches.length === 0) {
          throw new Error(`No stokBatch created for detail ${d.id} (barang: ${d.barang?.name})`);
        }
        const b = d.stokBatches[0];
        if (Number(b.qtyMasuk) !== Number(d.qty) || Number(b.qtySisa) !== Number(d.qty)) {
          throw new Error(`Mismatch in stokBatch qty: masuk=${b.qtyMasuk}, sisa=${b.qtySisa}, item=${d.qty}`);
        }
      }

      // 5. Assert Jurnal Umum & Double-entry balance
      if (!fullTx.jurnalUmums || fullTx.jurnalUmums.length === 0) {
        throw new Error('No Jurnal Umum generated for transaction');
      }
      const jurnal = fullTx.jurnalUmums[0];
      let sumDebit = 0;
      let sumKredit = 0;
      for (const jd of jurnal.details) {
        if (!jd.kategori) {
          throw new Error(`Jurnal detail has invalid kategoriId ${jd.kategoriId}`);
        }
        sumDebit += Number(jd.debit || 0);
        sumKredit += Number(jd.kredit || 0);
      }

      const diff = Math.abs(sumDebit - sumKredit);
      if (diff > 0.01) {
        throw new Error(`Jurnal ${jurnal.nomorJurnal} is NOT BALANCED! Debit=${sumDebit}, Kredit=${sumKredit}`);
      }

      console.log(`   -> OK: Invoice ${fullTx.invoice}, Total Rp ${Number(fullTx.total).toLocaleString('id-ID')}`);
      console.log(`   -> Jurnal: ${jurnal.nomorJurnal} [Debit = Kredit = Rp ${sumDebit.toLocaleString('id-ID')}] (BALANCED)`);

      // 6. Rollback / Cleanup test transaction
      await service.remove(Number(fullTx.id));
      console.log(`   -> Cleanup: Successfully rolled back test transaction.\n`);

      passedCount++;
    } catch (err) {
      console.error(`   -> FAILED:`, err.message || err);
      console.log('');
      failedCount++;
    }
  }

  console.log('====================================================');
  console.log(`HASIL AUDIT PEMBELIAN:`);
  console.log(`PASSED : ${passedCount}/${testCases.length}`);
  console.log(`FAILED : ${failedCount}/${testCases.length}`);
  console.log('====================================================');

  if (failedCount > 0) {
    throw new Error(`${failedCount} test cases failed!`);
  }
}

runComprehensivePembelianTests()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
