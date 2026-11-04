const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trayOpnameIds = [6403n, 6404n, 6409n, 6411n, 6415n, 6416n];
  const opnames = await prisma.stokOpname.findMany({
    where: { id: { in: trayOpnameIds } },
    include: {
      barang: true,
      jurnal: {
        include: { details: true }
      }
    }
  });

  console.log("Details of the 6 Tray Opnames to rollback:");
  for (const o of opnames) {
    console.log({
      id: o.id.toString(),
      nomor: o.nomorOpname,
      barang: o.barang.name,
      barangId: o.barangId.toString(),
      selisih: Number(o.selisih),
      selisihStok: Number(o.selisihStok),
      stokSistem: Number(o.stokSistem),
      stokFisik: Number(o.stokFisik),
      hpp: Number(o.hpp),
      jurnalId: o.jurnalId?.toString(),
      jurnalDetailsCount: o.jurnal?.details?.length
    });
  }

  // Check what batches belong to these barangIds and if any subsequent transactions touched them
  for (const o of opnames) {
    const batches = await prisma.stokBatch.findMany({
      where: { barangId: o.barangId },
      orderBy: { id: 'desc' },
      take: 5
    });
    console.log(`Recent batches for barang ${o.barang.name} (${o.barangId}):`, batches.map(b => ({
      id: b.id.toString(),
      qtyMasuk: Number(b.qtyMasuk),
      qtySisa: Number(b.qtySisa),
      hargaBeli: Number(b.hargaBeli),
      tanggal: b.tanggal
    })));
  }

  // Check if any transaksi (penjualan/pembelian) occurred on or after 2026-11-03 for these 6 barangs
  const recentDetails = await prisma.detailTransaksi.findMany({
    where: {
      barangId: { in: opnames.map(o => o.barangId) },
      transaksi: {
        createdAt: { gte: new Date('2026-11-03T05:00:00.000Z') }
      }
    },
    include: {
      transaksi: true,
      barang: true
    }
  });
  console.log("Any transactions created after 05:00 today for these 6 barangs:", recentDetails.length);
  for (const rd of recentDetails) {
    console.log({
      transId: rd.transaksiId.toString(),
      invoice: rd.transaksi.invoice,
      type: rd.transaksi.type,
      barang: rd.barang.name,
      qty: Number(rd.kuantitas)
    });
  }
}

main().finally(() => prisma.$disconnect());
