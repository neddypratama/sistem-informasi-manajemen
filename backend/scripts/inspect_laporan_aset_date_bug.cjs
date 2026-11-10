const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPEKSI LAPORAN ASET DENGAN & TANPA FILTER TANGGAL ===\n");

  // 1. Cek Client Pak Pri (Bp. Supriyadi)
  const pakPri = await prisma.client.findFirst({
    where: {
      OR: [
        { name: { contains: 'Supriyadi' } },
        { name: { contains: 'Pri' } }
      ]
    }
  });
  console.log("Data Client Pak Pri di tabel clients:", pakPri);

  if (pakPri) {
    // Cek semua transaksi Pak Pri
    const txs = await prisma.transaksi.findMany({
      where: { clientId: pakPri.id },
      select: {
        id: true,
        nomorTransaksi: true,
        invoice: true,
        tanggal: true,
        type: true,
        total: true,
        paymentMethod: true,
        status: true,
      },
      orderBy: { tanggal: 'asc' }
    });
    console.log(`\nTotal transaksi Pak Pri: ${txs.length}`);
    let sumPembelianKredit = 0;
    let sumPenjualanKredit = 0;
    let sumKasKeluar = 0;
    let sumKasMasuk = 0;

    for (const t of txs) {
      const tot = Number(t.total);
      if (t.type === 'PEMBELIAN') sumPembelianKredit += tot;
      if (t.type === 'PENJUALAN') sumPenjualanKredit += tot;
      if (t.type === 'KAS_KELUAR') sumKasKeluar += tot;
      if (t.type === 'KAS_MASUK') sumKasMasuk += tot;
    }

    console.log(`- Sum PEMBELIAN (KREDIT): Rp ${sumPembelianKredit.toLocaleString('id-ID')}`);
    console.log(`- Sum PENJUALAN (KREDIT): Rp ${sumPenjualanKredit.toLocaleString('id-ID')}`);
    console.log(`- Sum KAS KELUAR (Pelunasan Hutang): Rp ${sumKasKeluar.toLocaleString('id-ID')}`);
    console.log(`- Sum KAS MASUK: Rp ${sumKasMasuk.toLocaleString('id-ID')}`);
    console.log(`- Saldo Hutang di tabel clients: Rp ${Number(pakPri.saldoHutang).toLocaleString('id-ID')}`);
    console.log(`- Saldo Piutang di tabel clients: Rp ${Number(pakPri.saldoPiutang).toLocaleString('id-ID')}`);

    // Cek jika tgl <= 31 Okt 2026
    const txsOct31 = txs.filter(t => new Date(t.tanggal) <= new Date('2026-10-31 23:59:59'));
    console.log(`\nTransaksi Pak Pri s/d 31 Okt 2026: ${txsOct31.length}`);
    let sumBeliOct31 = 0;
    for (const t of txsOct31) {
      if (t.type === 'PEMBELIAN') sumBeliOct31 += Number(t.total);
    }
    console.log(`- Sum PEMBELIAN Pak Pri s/d 31 Okt: Rp ${sumBeliOct31.toLocaleString('id-ID')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
