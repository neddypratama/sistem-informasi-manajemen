/**
 * Rekonsiliasi Saldo Bp. Supriyadi (Pak Pri - Client ID 241)
 * Rumus Konsinyasi Pakan Curah:
 *   Saldo Akhir = Saldo Awal (Cutoff) + Penjualan Curah Netto (Lunas & Bon) + Pemasukan - Pengeluaran & Pembayaran pakai duit BP
 *
 * Penggunaan:
 *   Preview (Dry-Run): node backend/scripts/reconcile_saldo_pak_pri.cjs
 *   Eksekusi Update  : node backend/scripts/reconcile_saldo_pak_pri.cjs --apply
 *   Kustom Patokan   : node backend/scripts/reconcile_saldo_pak_pri.cjs --cutoff=2026-10-31 --base=1260384005 --apply
 */

const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  let apply = false;
  let cutoff = '2026-10-31';
  let baseSaldo = 1260384005;

  for (const arg of args) {
    if (arg === '--apply') apply = true;
    else if (arg.startsWith('--cutoff=')) cutoff = arg.split('=')[1];
    else if (arg.startsWith('--base=')) baseSaldo = Number(arg.split('=')[1]);
  }
  return { apply, cutoff, baseSaldo };
}

async function calcMutationsAfter(pakPriId, cutoffStr, endStr = null) {
  const startDate = new Date(`${cutoffStr} 23:59:59`);
  const endDate = endStr ? new Date(`${endStr} 23:59:59`) : null;

  const whereTx = {
    status: 'SELESAI',
    tanggal: endDate ? { gt: startDate, lte: endDate } : { gt: startDate },
  };

  const txs = await prisma.transaksi.findMany({
    where: whereTx,
    select: {
      id: true,
      type: true,
      clientId: true,
      subtotal: true,
      diskon: true,
      total: true,
      details: {
        select: {
          subtotal: true,
          kategoriId: true,
          barang: {
            select: {
              jenisId: true,
              name: true,
              jenis: { select: { name: true } },
            },
          },
          kategori: {
            select: {
              id: true,
              name: true,
              detailKategori: { select: { name: true, type: true } },
            },
          },
        },
      },
    },
  });

  let penjualanCurahNet = 0;
  let returPenjualanCurahNet = 0;
  let pemasukanPri = 0;
  let pengeluaranPri = 0;
  let countJual = 0;
  let countRetur = 0;
  let countMasuk = 0;
  let countKeluar = 0;

  for (const t of txs) {
    const txSub = Number(t.subtotal || 0);
    const txDisc = Number(t.diskon || 0);

    let curahNet = 0;
    for (const d of t.details) {
      const kId = d.kategoriId ? Number(d.kategoriId) : 0;
      const jId = d.barang?.jenisId ? Number(d.barang.jenisId) : 0;
      const jName = (d.barang?.jenis?.name || '').toLowerCase();
      const bName = (d.barang?.name || '').toLowerCase();
      const isCurah =
        kId === 8 || kId === 89 || jId === 9 || jName.includes('curah') || bName.includes('curah');
      if (isCurah) {
        const sub = Number(d.subtotal || 0);
        const itemDisc = txSub > 0 ? (sub / txSub) * txDisc : 0;
        curahNet += Math.max(0, sub - itemDisc);
      }
    }

    if (t.type === 'PENJUALAN' && curahNet > 0) {
      penjualanCurahNet += curahNet;
      countJual++;
    } else if (t.type === 'RETUR_PENJUALAN' && curahNet > 0) {
      returPenjualanCurahNet += curahNet;
      countRetur++;
    } else if (t.clientId && t.clientId === pakPriId) {
      if (t.type === 'KAS_MASUK') {
        for (const d of t.details) {
          const dType = d.kategori?.detailKategori?.type;
          const sub = Number(d.subtotal || 0);
          if (
            dType === 'Liabilitas' ||
            d.kategori?.name?.includes('Hutang') ||
            d.kategori?.name?.includes('Saldo')
          ) {
            pemasukanPri += sub;
            countMasuk++;
          }
        }
      } else if (t.type === 'KAS_KELUAR') {
        for (const d of t.details) {
          const dType = d.kategori?.detailKategori?.type;
          const sub = Number(d.subtotal || 0);
          if (
            dType === 'Liabilitas' ||
            d.kategori?.name?.includes('Hutang') ||
            d.kategori?.name?.includes('Saldo') ||
            !dType
          ) {
            pengeluaranPri += sub;
            countKeluar++;
          }
        }
      }
    }
  }

  return {
    penjualanCurahNet,
    returPenjualanCurahNet,
    pemasukanPri,
    pengeluaranPri,
    countJual,
    countRetur,
    countMasuk,
    countKeluar,
  };
}

async function main() {
  const { apply, cutoff, baseSaldo } = parseArgs();

  const pakPri = await prisma.client.findFirst({
    where: {
      OR: [{ id: 241n }, { name: { contains: 'Supriyadi' } }],
    },
  });

  if (!pakPri) {
    throw new Error('Client Bp. Supriyadi tidak ditemukan di database.');
  }

  const fmt = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

  console.log('====================================================================');
  console.log(`REKONSILIASI SALDO PAK PRI (${pakPri.name} / ID ${pakPri.id})`);
  console.log(`Mode          : ${apply ? 'APPLY (UPDATE DATABASE)' : 'DRY-RUN (PREVIEW ONLY)'}`);
  console.log(`Patokan Cutoff: ${cutoff} 23:59:59`);
  console.log(`Saldo Awal    : ${fmt(baseSaldo)}`);
  console.log('====================================================================');
  console.log(`Saldo DB Saat Ini -> saldoHutang: ${fmt(Number(pakPri.saldoHutang))}, saldoPiutang: ${fmt(Number(pakPri.saldoPiutang))}\n`);

  // Checkpoints (31 Okt, 15 Nov, Live)
  for (const [label, endStr] of [
    ['Per 31 Okt 2026', '2026-10-31'],
    ['Per 15 Nov 2026', '2026-11-15'],
    ['Live (Sampai Hari Ini)', null],
  ]) {
    const m = await calcMutationsAfter(pakPri.id, cutoff, endStr);
    const saldo = baseSaldo + m.penjualanCurahNet - m.returPenjualanCurahNet + m.pemasukanPri - m.pengeluaranPri;
    console.log(`--- ${label} ---`);
    console.log(`  + Penjualan Curah Netto : ${fmt(m.penjualanCurahNet)} (${m.countJual} nota)`);
    if (m.returPenjualanCurahNet > 0) {
      console.log(`  - Retur Penjualan Curah : ${fmt(m.returPenjualanCurahNet)} (${m.countRetur} nota)`);
    }
    console.log(`  + Pemasukan (KAS_MASUK) : ${fmt(m.pemasukanPri)} (${m.countMasuk} tx)`);
    console.log(`  - Pengeluaran (KELUAR)  : ${fmt(m.pengeluaranPri)} (${m.countKeluar} tx)`);
    console.log(`  => SALDO AKHIR          : ${fmt(saldo)}\n`);

    if (endStr === null && apply) {
      await prisma.client.update({
        where: { id: pakPri.id },
        data: {
          saldoHutang: saldo,
          saldoPiutang: 0,
        },
      });
      console.log(`✅ Database updated: clients(id=${pakPri.id}).saldo_hutang = ${saldo}, saldo_piutang = 0`);
    }
  }

  if (!apply) {
    console.log('ℹ️ Ini masih DRY-RUN. Jalankan dengan flag --apply untuk menyimpan ke database.');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
