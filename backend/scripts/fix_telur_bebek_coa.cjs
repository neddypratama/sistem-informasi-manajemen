/**
 * Perbaikan Klasifikasi COA & Multi-COA Split Jurnal untuk Penjualan Telur Bebek (Golden, BK, AB Pth)
 * serta nota penjualan telur multi-komoditas (misal Puyuh + Horn / Arab + Horn / Asin + Horn)
 * agar Rincian Laba Kotor Per Komoditas di Laporan Laba Rugi 100% klop antara total komoditas & rincian barang.
 *
 * Penggunaan:
 *   Preview (Dry-Run): node backend/scripts/fix_telur_bebek_coa.cjs
 *   Eksekusi Update  : node backend/scripts/fix_telur_bebek_coa.cjs --apply
 */

const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient();

function getCoaMapping(barang) {
  const jenisId = barang?.jenisId ? Number(barang.jenisId) : 0;
  const jenisName = (barang?.jenis?.name || '').toLowerCase();
  const barangName = (barang?.name || '').toLowerCase();

  if (jenisId === 9 || jenisName.includes('curah') || barangName.includes('curah')) {
    return { pId: 8n, hId: 96n, sId: 89n };
  }
  if (jenisId === 10 || jenisName.includes('kucing') || barangName.includes('kucing')) {
    return { pId: 7n, hId: 97n, sId: 60n };
  }
  if (jenisId === 8 || jenisName.includes('pakan') || jenisName.includes('sentrat')) {
    return { pId: 6n, hId: 95n, sId: 60n };
  }
  if (jenisId === 7 || jenisName.includes('obat')) {
    return { pId: 9n, hId: 98n, sId: 61n };
  }
  if (jenisId === 6 || jenisName.includes('tray')) {
    return { pId: 10n, hId: 99n, sId: 62n };
  }
  if (jenisId === 1 || jenisName.includes('bebek') || barangName.includes('bebek')) {
    return { pId: 2n, hId: 91n, sId: 59n };
  }
  if (jenisId === 3 || jenisName.includes('puyuh') || barangName.includes('puyuh')) {
    return { pId: 3n, hId: 92n, sId: 59n };
  }
  if (jenisId === 4 || jenisName.includes('arab') || barangName.includes('arab')) {
    return { pId: 4n, hId: 93n, sId: 59n };
  }
  if (jenisId === 5 || jenisName.includes('asin') || barangName.includes('asin')) {
    return { pId: 5n, hId: 94n, sId: 59n };
  }
  return { pId: 1n, hId: 90n, sId: 59n };
}

function isRevHppInvCoa(coaId) {
  const c = Number(coaId);
  return (c >= 1 && c <= 10) || (c >= 90 && c <= 99) || [59, 60, 61, 62, 89].includes(c);
}

async function main() {
  const apply = process.argv.includes('--apply');

  // 1. Ambil transaksi PENJUALAN / RETUR_PENJUALAN mulai 31 Okt 2026 (cutover v2) + semua Telur Bebek salah kategori
  const candidateTxs = await prisma.transaksi.findMany({
    where: {
      type: { in: ['PENJUALAN', 'RETUR_PENJUALAN'] },
      status: 'SELESAI',
      OR: [
        {
          details: {
            some: {
              barang: { jenisId: 1n },
              kategoriId: { not: 2n },
            },
          },
        },
        {
          tanggal: { gte: new Date('2026-10-31T00:00:00Z') },
          details: { some: { barangId: { not: null } } },
        },
      ],
    },
    include: {
      details: {
        include: { barang: { include: { jenis: true } } },
      },
      jurnalUmums: {
        include: { details: true },
      },
    },
    orderBy: { tanggal: 'asc' },
  });

  // Filter hanya transaksi yang benar-benar butuh perbaikan detail.kategoriId ATAU split jurnal Multi-COA
  const affectedTxs = [];
  for (const tx of candidateTxs) {
    const hasWrongDetailKat = tx.details.some(
      (d) => d.barang && getCoaMapping(d.barang).pId !== BigInt(d.kategoriId || 0),
    );

    let hasWrongJurnalCoa = false;
    const jurnal = tx.jurnalUmums[0];
    if (jurnal && tx.details.every((d) => d.barang)) {
      const txSub = Number(tx.subtotal || 0);
      const txDisc = Number(tx.diskon || 0);
      const txTotal = Number(tx.total || 0);
      const expectedRev = new Map();
      for (const d of tx.details) {
        const map = getCoaMapping(d.barang);
        const sub = Number(d.subtotal || 0);
        const disc = txSub > 0 ? (sub / txSub) * txDisc : 0;
        const netRev = Math.max(0, sub - disc);
        expectedRev.set(Number(map.pId), (expectedRev.get(Number(map.pId)) || 0) + netRev);
      }
      // Compare with actual revenue COAs in jurnal
      const actualRev = new Map();
      for (const jd of jurnal.details) {
        const c = Number(jd.coaId);
        if (c >= 1 && c <= 10) {
          const amt = tx.type === 'RETUR_PENJUALAN' ? Number(jd.debit) : Number(jd.kredit);
          actualRev.set(c, (actualRev.get(c) || 0) + amt);
        }
      }
      const allKeys = new Set([...expectedRev.keys(), ...actualRev.keys()]);
      for (const k of allKeys) {
        if (Math.abs((expectedRev.get(k) || 0) - (actualRev.get(k) || 0)) > 2) {
          hasWrongJurnalCoa = true;
          break;
        }
      }
      // Avoid touching legacy/abnormal transactions where preserved non-rev/hpp/inv line != txTotal
      const preservedLines = jurnal.details.filter((jd) => !isRevHppInvCoa(jd.coaId));
      const preservedSum = preservedLines.reduce(
        (s, l) => s + (tx.type === 'RETUR_PENJUALAN' ? Number(l.kredit) : Number(l.debit)),
        0,
      );
      if (Math.abs(preservedSum - txTotal) > 2) {
        hasWrongJurnalCoa = false;
      }
    }

    if (hasWrongDetailKat || hasWrongJurnalCoa) {
      affectedTxs.push({ tx, hasWrongDetailKat, hasWrongJurnalCoa });
    }
  }

  console.log('====================================================================');
  console.log('FIX COA TELUR BEBEK & MULTI-COA SPLIT JURNAL PENJUALAN');
  console.log(`Mode             : ${apply ? 'APPLY (UPDATE DATABASE)' : 'DRY-RUN (PREVIEW ONLY)'}`);
  console.log(`Transaksi Terkena: ${affectedTxs.length} nota`);
  console.log('====================================================================\n');

  let fixedCount = 0;

  for (const { tx, hasWrongDetailKat, hasWrongJurnalCoa } of affectedTxs) {
    const txSub = Number(tx.subtotal || 0);
    const txDisc = Number(tx.diskon || 0);
    const txTotal = Number(tx.total || 0);
    const isRetur = tx.type === 'RETUR_PENJUALAN';

    console.log(
      `${tx.tanggal.toISOString().slice(0, 10)} | ${tx.invoice.padEnd(23)} | total: Rp ${Math.round(txTotal).toLocaleString('id-ID').padStart(12)} | fixDetail=${hasWrongDetailKat} fixJurnal=${hasWrongJurnalCoa} | items: ${tx.details.map((d) => `${d.barang?.name}[j=${d.barang?.jenisId}]`).join(', ')}`,
    );

    if (!apply) continue;

    await prisma.$transaction(async (trx) => {
      // 1. Update detail_transaksis.kategoriId sesuai barang
      if (hasWrongDetailKat) {
        for (const d of tx.details) {
          if (!d.barang) continue;
          const expectedKat = getCoaMapping(d.barang).pId;
          if (BigInt(d.kategoriId || 0) !== expectedKat) {
            await trx.detailTransaksi.update({
              where: { id: d.id },
              data: { kategoriId: expectedKat },
            });
          }
        }
      }

      // 2. Rebuild Jurnal Umum Multi-COA (preserve Kas/Bank/Piutang, rebuild Pendapatan/HPP/Persediaan)
      const jurnal = tx.jurnalUmums[0];
      if (jurnal && hasWrongJurnalCoa) {
        const preservedLines = jurnal.details.filter((jd) => !isRevHppInvCoa(jd.coaId));

        const pendapatanMap = new Map();
        const hppMap = new Map();
        const persediaanMap = new Map();

        for (const d of tx.details) {
          const map = getCoaMapping(d.barang);
          const sub = Number(d.subtotal || 0);
          const hpp = Number(d.totalHpp || 0);
          const disc = txSub > 0 ? (sub / txSub) * txDisc : 0;
          const netRev = Math.max(0, sub - disc);

          pendapatanMap.set(map.pId, (pendapatanMap.get(map.pId) || 0) + netRev);
          hppMap.set(map.hId, (hppMap.get(map.hId) || 0) + hpp);
          persediaanMap.set(map.sId, (persediaanMap.get(map.sId) || 0) + hpp);
        }

        let sumRev = 0;
        for (const v of pendapatanMap.values()) sumRev += v;
        const revDiff = txTotal - sumRev;
        if (Math.abs(revDiff) > 0.0001 && pendapatanMap.size > 0) {
          let maxK = Array.from(pendapatanMap.keys())[0];
          let maxV = -1;
          for (const [k, v] of pendapatanMap.entries()) {
            if (v > maxV) { maxV = v; maxK = k; }
          }
          pendapatanMap.set(maxK, (pendapatanMap.get(maxK) || 0) + revDiff);
        }

        const newLines = [];
        for (const pl of preservedLines) {
          newLines.push({
            jurnalId: jurnal.id,
            coaId: pl.coaId,
            kategoriId: pl.kategoriId,
            debit: Number(pl.debit),
            kredit: Number(pl.kredit),
          });
        }

        for (const [pId, amt] of pendapatanMap.entries()) {
          if (amt > 0 || pendapatanMap.size === 1) {
            newLines.push({
              jurnalId: jurnal.id,
              coaId: pId,
              kategoriId: pId,
              debit: isRetur ? amt : 0,
              kredit: isRetur ? 0 : amt,
            });
          }
        }
        for (const [hId, amt] of hppMap.entries()) {
          if (amt > 0) {
            newLines.push({
              jurnalId: jurnal.id,
              coaId: hId,
              kategoriId: hId,
              debit: isRetur ? 0 : amt,
              kredit: isRetur ? amt : 0,
            });
          }
        }
        for (const [sId, amt] of persediaanMap.entries()) {
          if (amt > 0) {
            newLines.push({
              jurnalId: jurnal.id,
              coaId: sId,
              kategoriId: sId,
              debit: isRetur ? amt : 0,
              kredit: isRetur ? 0 : amt,
            });
          }
        }

        const sumD = newLines.reduce((s, l) => s + Number(l.debit), 0);
        const sumK = newLines.reduce((s, l) => s + Number(l.kredit), 0);
        if (Math.abs(sumD - sumK) > 1) {
          throw new Error(`Jurnal ${jurnal.nomorJurnal} tidak seimbang (D=${sumD}, K=${sumK}) — dibatalkan!`);
        }

        await trx.jurnalDetail.deleteMany({ where: { jurnalId: jurnal.id } });
        await trx.jurnalDetail.createMany({ data: newLines });
      }
    });

    fixedCount++;
  }

  console.log('\n--------------------------------------------------------------------');
  if (apply) {
    console.log(`✅ Berhasil memperbaiki ${fixedCount} transaksi & jurnal!`);
  } else {
    console.log('ℹ️ Ini masih DRY-RUN. Jalankan dengan flag --apply untuk menerapkan ke database.');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
