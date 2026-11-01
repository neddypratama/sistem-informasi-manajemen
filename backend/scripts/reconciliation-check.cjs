const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function runReconciliation() {
  console.log('========================================================================');
  console.log('🔍 AUDIT REKONSILIASI: SIM Bima Pratama (Legacy) VS ERP Bima Pratama v2');
  console.log('========================================================================\n');

  // 1. Ambil Laba Curah Legacy untuk Bp.Supriyadi
  console.log('📊 Menghitung komponen curah legacy...');
  const curahPendapatanRes = await prisma.$queryRawUnsafe(`
    SELECT SUM(
      CASE 
        WHEN LOWER(t.type) = 'kredit' THEN td.sub_total
        WHEN LOWER(t.type) = 'debit' THEN -td.sub_total
        ELSE 0
      END
    ) as total_pendapatan
    FROM bimapratama.detail_transaksis td
    JOIN bimapratama.kategoris k ON k.id = td.kategori_id
    JOIN bimapratama.transaksis t ON t.id = td.transaksi_id
    WHERE k.name = 'Penjualan Pakan Curah' AND t.status = 'Selesai'
  `);

  const curahHppRes = await prisma.$queryRawUnsafe(`
    SELECT SUM(
      CASE 
        WHEN LOWER(t.type) = 'debit' THEN td.sub_total
        WHEN LOWER(t.type) = 'kredit' THEN -td.sub_total
        ELSE 0
      END
    ) as total_hpp
    FROM bimapratama.detail_transaksis td
    JOIN bimapratama.kategoris k ON k.id = td.kategori_id
    JOIN bimapratama.transaksis t ON t.id = td.transaksi_id
    JOIN bimapratama.barangs b ON b.id = td.barang_id
    JOIN bimapratama.jenis_barangs jb ON jb.id = b.jenis_id
    WHERE k.name = 'HPP' AND jb.name = 'Pakan Curah' AND t.status = 'Selesai'
  `);

  const curahPendapatan = Number(curahPendapatanRes[0]?.total_pendapatan || 0);
  const curahHpp = Number(curahHppRes[0]?.total_hpp || 0);
  const curahNet = curahPendapatan - curahHpp;
  console.log(`   Pendapatan Curah: Rp ${curahPendapatan.toLocaleString('id-ID')}`);
  console.log(`   HPP Curah       : Rp ${curahHpp.toLocaleString('id-ID')}`);
  console.log(`   Laba Curah Net  : Rp ${curahNet.toLocaleString('id-ID')}\n`);

  // 2. Hitung Saldo Bon (Piutang) & Titipan (Hutang) per Client dari SIM Lama (bimapratama)
  console.log('⏳ Menghitung Piutang (Bon) & Hutang (Titipan) dari SIM Lama (bimapratama)...');
  const legacyBalances = await prisma.$queryRawUnsafe(`
    SELECT 
      c.id,
      c.name,
      c.type,
      -- Piutang Debit
      COALESCE((
        SELECT SUM(t.total)
        FROM bimapratama.transaksis t
        WHERE t.client_id = c.id
          AND t.type = 'Debit'
          AND t.status = 'Selesai'
          AND EXISTS (
            SELECT 1 FROM bimapratama.detail_transaksis dt
            JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
            JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
            WHERE dt.transaksi_id = t.id
              AND dk.type LIKE '%Aset%'
              AND k.name NOT LIKE '%Stok%'
              AND k.name NOT LIKE '%Kas%'
              AND k.name NOT LIKE '%Bank%'
          )
      ), 0) as piutang_debit,
      -- Piutang Kredit
      COALESCE((
        SELECT SUM(t.total)
        FROM bimapratama.transaksis t
        WHERE t.client_id = c.id
          AND t.type = 'Kredit'
          AND t.status = 'Selesai'
          AND EXISTS (
            SELECT 1 FROM bimapratama.detail_transaksis dt
            JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
            JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
            WHERE dt.transaksi_id = t.id
              AND dk.type LIKE '%Aset%'
              AND k.name NOT LIKE '%Stok%'
              AND k.name NOT LIKE '%Kas%'
              AND k.name NOT LIKE '%Bank%'
          )
      ), 0) as piutang_kredit,
      -- Hutang Kredit
      COALESCE((
        SELECT SUM(t.total)
        FROM bimapratama.transaksis t
        WHERE t.client_id = c.id
          AND t.type = 'Kredit'
          AND t.status = 'Selesai'
          AND EXISTS (
            SELECT 1 FROM bimapratama.detail_transaksis dt
            JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
            JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
            WHERE dt.transaksi_id = t.id
              AND dk.type LIKE '%Liabilitas%'
          )
      ), 0) as hutang_kredit,
      -- Hutang Debit
      COALESCE((
        SELECT SUM(t.total)
        FROM bimapratama.transaksis t
        WHERE t.client_id = c.id
          AND t.type = 'Debit'
          AND t.status = 'Selesai'
          AND EXISTS (
            SELECT 1 FROM bimapratama.detail_transaksis dt
            JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
            JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
            WHERE dt.transaksi_id = t.id
              AND dk.type LIKE '%Liabilitas%'
          )
      ), 0) as hutang_debit
    FROM bimapratama.clients c
    ORDER BY c.id ASC
  `);

  console.log(`   ✅ Selesai mengambil data saldo ${legacyBalances.length} clients dari sistem lama.\n`);

  // 3. Ambil Saldo Piutang & Hutang dari ERP Baru (bimapratama_v2)
  console.log('⏳ Mengambil saldo client dari ERP Baru (bimapratama_v2)...');
  const v2Clients = await prisma.$queryRawUnsafe(`
    SELECT id, code, name, type, saldo_piutang, saldo_hutang
    FROM bimapratama_v2.clients
    ORDER BY id ASC
  `);
  console.log(`   ✅ Selesai mengambil data ${v2Clients.length} clients dari sistem baru.\n`);

  const v2Map = new Map();
  for (const c of v2Clients) {
    v2Map.set(Number(c.id), c);
  }

  // 4. Analisis Komparasi Client per Client
  let totalLegacyBon = 0;
  let totalLegacyTitipan = 0;
  let totalV2Bon = 0;
  let totalV2Titipan = 0;

  let exactMatchCount = 0;
  let diffCount = 0;
  const discrepancies = [];
  const matches = [];

  for (const leg of legacyBalances) {
    const id = Number(leg.id);
    const pDebit = Number(leg.piutang_debit || 0);
    const pKredit = Number(leg.piutang_kredit || 0);
    const legBon = pDebit - pKredit;

    const hKredit = Number(leg.hutang_kredit || 0);
    const hDebit = Number(leg.hutang_debit || 0);
    let legTitipan = hKredit - hDebit;

    if (leg.name === 'Bp.Supriyadi') {
      legTitipan += curahNet;
    }

    const legSisa = legBon - legTitipan;

    const v2 = v2Map.get(id);
    const v2Bon = v2 ? Number(v2.saldo_piutang || 0) : 0;
    const v2Titipan = v2 ? Number(v2.saldo_hutang || 0) : 0;
    const v2Sisa = v2Bon - v2Titipan;

    totalLegacyBon += legBon;
    totalLegacyTitipan += legTitipan;
    totalV2Bon += v2Bon;
    totalV2Titipan += v2Titipan;

    const bonDiff = Math.abs(legBon - v2Bon);
    const titipanDiff = Math.abs(legTitipan - v2Titipan);
    const sisaDiff = Math.abs(legSisa - v2Sisa);

    const isMatch = bonDiff < 1 && titipanDiff < 1;

    const row = {
      id,
      name: leg.name,
      type: leg.type,
      legacy: { bon: legBon, titipan: legTitipan, sisa: legSisa },
      v2: { bon: v2Bon, titipan: v2Titipan, sisa: v2Sisa },
      diff: { bon: legBon - v2Bon, titipan: legTitipan - v2Titipan, sisa: legSisa - v2Sisa },
      isMatch,
    };

    if (isMatch) {
      exactMatchCount++;
      matches.push(row);
    } else {
      diffCount++;
      discrepancies.push(row);
    }
  }

  console.log('========================================================================');
  console.log('📈 HASIL REKONSILIASI SALDO HUTANG & PIUTANG PER CLIENT:');
  console.log('========================================================================');
  console.log(`Total Client Terdaftar   : ${legacyBalances.length}`);
  console.log(`Client MATCH Sempurna   : ${exactMatchCount} (${((exactMatchCount / legacyBalances.length) * 100).toFixed(1)}%)`);
  console.log(`Client Ada Selisih      : ${diffCount} (${((diffCount / legacyBalances.length) * 100).toFixed(1)}%)`);
  console.log('------------------------------------------------------------------------');
  console.log(`Total Piutang (Bon) SIM Lama  : Rp ${totalLegacyBon.toLocaleString('id-ID')}`);
  console.log(`Total Piutang (Bon) ERP v2    : Rp ${totalV2Bon.toLocaleString('id-ID')}`);
  console.log(`Selisih Piutang (Delta)       : Rp ${(totalLegacyBon - totalV2Bon).toLocaleString('id-ID')}`);
  console.log('------------------------------------------------------------------------');
  console.log(`Total Hutang (Titipan) Lama   : Rp ${totalLegacyTitipan.toLocaleString('id-ID')}`);
  console.log(`Total Hutang (Titipan) ERP v2 : Rp ${totalV2Titipan.toLocaleString('id-ID')}`);
  console.log(`Selisih Hutang (Delta)        : Rp ${(totalLegacyTitipan - totalV2Titipan).toLocaleString('id-ID')}`);
  console.log('========================================================================\n');

  if (discrepancies.length > 0) {
    console.log(`⚠️ DAFTAR TOP 15 KLIEN DENGAN SELISIH:`);
    console.log('ID | Nama | Tipe | Bon Lama | Bon v2 | Selisih Bon | Titipan Lama | Titipan v2 | Selisih Titipan');
    console.log('---|------|------|----------|--------|-------------|--------------|------------|----------------');
    
    // Sort by largest absolute discrepancy
    discrepancies.sort((a, b) => Math.max(Math.abs(b.diff.bon), Math.abs(b.diff.titipan)) - Math.max(Math.abs(a.diff.bon), Math.abs(a.diff.titipan)));
    
    for (const d of discrepancies.slice(0, 15)) {
      console.log(
        `${d.id} | ${d.name} | ${d.type} | ` +
        `Rp ${d.legacy.bon.toLocaleString('id-ID')} | Rp ${d.v2.bon.toLocaleString('id-ID')} | Rp ${d.diff.bon.toLocaleString('id-ID')} | ` +
        `Rp ${d.legacy.titipan.toLocaleString('id-ID')} | Rp ${d.v2.titipan.toLocaleString('id-ID')} | Rp ${d.diff.titipan.toLocaleString('id-ID')}`
      );
    }
  }

  // 5. Rekonsiliasi Laporan Transaksi & Omzet
  console.log('\n========================================================================');
  console.log('📊 AUDIT REKONSILIASI LAPORAN TRANSAKSI & OMZET');
  console.log('========================================================================');

  // Total Nilai Transaksi Selesai
  const legacyTxSum = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*) as count,
      SUM(total) as total_nominal
    FROM bimapratama.transaksis
    WHERE status = 'Selesai'
  `);

  const v2TxSum = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*) as count,
      SUM(total) as total_nominal
    FROM bimapratama_v2.transaksis
    WHERE status = 'SELESAI'
  `);

  console.log(`SIM Lama (transaksis Selesai, Debit + Kredit):`);
  console.log(`   Jumlah Baris: ${Number(legacyTxSum[0].count).toLocaleString('id-ID')}`);
  console.log(`   Total Nilai : Rp ${Number(legacyTxSum[0].total_nominal).toLocaleString('id-ID')}`);
  console.log(`ERP v2 (transaksis SELESAI, Single Invoices):`);
  console.log(`   Jumlah Baris: ${Number(v2TxSum[0].count).toLocaleString('id-ID')}`);
  console.log(`   Total Nilai : Rp ${Number(v2TxSum[0].total_nominal).toLocaleString('id-ID')}`);

  // Simpan hasil audit lengkap ke JSON untuk pembuatan laporan
  const auditReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalClients: legacyBalances.length,
      exactMatchCount,
      diffCount,
      totalLegacyBon,
      totalV2Bon,
      deltaBon: totalLegacyBon - totalV2Bon,
      totalLegacyTitipan,
      totalV2Titipan,
      deltaTitipan: totalLegacyTitipan - totalV2Titipan,
    },
    topDiscrepancies: discrepancies.slice(0, 30),
    sampleMatches: matches.slice(0, 15),
  };

  fs.writeFileSync('backend/scripts/audit_result.json', JSON.stringify(auditReport, null, 2));
  console.log('\n📁 Data hasil rekonsiliasi tersimpan di: backend/scripts/audit_result.json');

  await prisma.$disconnect();
}

runReconciliation().catch(async (e) => {
  console.error('❌ Error rekonsiliasi:', e);
  await prisma.$disconnect();
  process.exit(1);
});
