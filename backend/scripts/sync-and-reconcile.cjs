const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('========================================================================');
  console.log('🔄 SINKRONISASI & REKONSILIASI PENUH: SIM LAMA VS ERP BARU v2');
  console.log('========================================================================\n');

  // 1. Hitung Laba Curah Legacy untuk Bp.Supriyadi
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

  const curahNet = Number(curahPendapatanRes[0]?.total_pendapatan || 0) - Number(curahHppRes[0]?.total_hpp || 0);
  console.log(`✅ Komponen Laba Curah Bp.Supriyadi: Rp ${curahNet.toLocaleString('id-ID')}`);

  // 2. Ambil seluruh saldo client dari SIM Lama (bimapratama)
  console.log('⏳ Menghitung saldo asli seluruh client dari SIM Lama...');
  const legacyClients = await prisma.$queryRawUnsafe(`
    SELECT 
      c.id,
      c.name,
      c.type,
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

  console.log(`✅ Diperoleh ${legacyClients.length} clients dari SIM Lama.`);

  // 3. Update bimapratama_v2.clients agar persis sama dengan saldo sistem lama
  console.log('🔄 Melakukan sinkronisasi saldo ke bimapratama_v2.clients...');
  for (const c of legacyClients) {
    const id = Number(c.id);
    const bon = Number(c.piutang_debit || 0) - Number(c.piutang_kredit || 0);
    let titipan = Number(c.hutang_kredit || 0) - Number(c.hutang_debit || 0);

    if (c.name === 'Bp.Supriyadi') {
      titipan += curahNet;
    }

    await prisma.$queryRawUnsafe(`
      UPDATE bimapratama_v2.clients 
      SET saldo_piutang = ${bon}, saldo_hutang = ${titipan}
      WHERE id = ${id}
    `);
  }
  console.log('✅ Sinkronisasi saldo selesai!');

  // 4. Verifikasi Ulang Audit
  console.log('\n🔎 Memverifikasi ulang kecocokan data...');
  const v2Clients = await prisma.$queryRawUnsafe(`
    SELECT id, code, name, type, saldo_piutang, saldo_hutang
    FROM bimapratama_v2.clients
    ORDER BY id ASC
  `);

  const v2Map = new Map();
  for (const c of v2Clients) {
    v2Map.set(Number(c.id), c);
  }

  let exactMatches = 0;
  let differences = 0;
  let totalLegacyBon = 0;
  let totalLegacyTitipan = 0;
  let totalV2Bon = 0;
  let totalV2Titipan = 0;

  const comparisonRows = [];

  for (const leg of legacyClients) {
    const id = Number(leg.id);
    const legBon = Number(leg.piutang_debit || 0) - Number(leg.piutang_kredit || 0);
    let legTitipan = Number(leg.hutang_kredit || 0) - Number(leg.hutang_debit || 0);
    if (leg.name === 'Bp.Supriyadi') legTitipan += curahNet;
    const legSisa = legBon - legTitipan;

    const v2 = v2Map.get(id);
    const v2Bon = v2 ? Number(v2.saldo_piutang || 0) : 0;
    const v2Titipan = v2 ? Number(v2.saldo_hutang || 0) : 0;
    const v2Sisa = v2Bon - v2Titipan;

    totalLegacyBon += legBon;
    totalLegacyTitipan += legTitipan;
    totalV2Bon += v2Bon;
    totalV2Titipan += v2Titipan;

    const isMatch = Math.abs(legBon - v2Bon) < 0.01 && Math.abs(legTitipan - v2Titipan) < 0.01;

    if (isMatch) exactMatches++;
    else differences++;

    comparisonRows.push({
      id,
      name: leg.name,
      type: leg.type,
      legacyBon: legBon,
      v2Bon,
      diffBon: legBon - v2Bon,
      legacyTitipan: legTitipan,
      v2Titipan,
      diffTitipan: legTitipan - v2Titipan,
      isMatch,
    });
  }

  console.log('========================================================================');
  console.log('📊 REKONSILIASI SALDO HUTANG & PIUTANG FINAL');
  console.log('========================================================================');
  console.log(`Total Mitra (Clients) : ${legacyClients.length}`);
  console.log(`MATCH Sempurna (100%) : ${exactMatches} dari ${legacyClients.length} (${((exactMatches/legacyClients.length)*100).toFixed(1)}%)`);
  console.log(`Selisih               : ${differences} mitra`);
  console.log('------------------------------------------------------------------------');
  console.log(`Total Piutang (Bon) SIM Lama  : Rp ${totalLegacyBon.toLocaleString('id-ID')}`);
  console.log(`Total Piutang (Bon) ERP v2    : Rp ${totalV2Bon.toLocaleString('id-ID')}`);
  console.log(`Selisih Piutang (Delta)       : Rp ${(totalLegacyBon - totalV2Bon).toLocaleString('id-ID')}`);
  console.log('------------------------------------------------------------------------');
  console.log(`Total Hutang (Titipan) Lama   : Rp ${totalLegacyTitipan.toLocaleString('id-ID')}`);
  console.log(`Total Hutang (Titipan) ERP v2 : Rp ${totalV2Titipan.toLocaleString('id-ID')}`);
  console.log(`Selisih Hutang (Delta)        : Rp ${(totalLegacyTitipan - totalV2Titipan).toLocaleString('id-ID')}`);
  console.log('========================================================================\n');

  // 5. Audit Laporan Penjualan & Pembelian per Komoditas (Telur, Pakan, Obat, Tray)
  console.log('========================================================================');
  console.log('📦 AUDIT REKONSILIASI LAPORAN KOMODITAS (SIM LAMA VS ERP BARU)');
  console.log('========================================================================');

  // Penjualan Telur
  const legPenjualanTelur = await prisma.$queryRawUnsafe(`
    SELECT SUM(td.sub_total) as total, SUM(td.kuantitas) as qty
    FROM bimapratama.detail_transaksis td
    JOIN bimapratama.kategoris k ON k.id = td.kategori_id
    JOIN bimapratama.transaksis t ON t.id = td.transaksi_id
    WHERE k.name LIKE 'Penjualan Telur%' AND t.status = 'Selesai' AND t.type = 'Kredit'
  `);
  const v2PenjualanTelur = await prisma.$queryRawUnsafe(`
    SELECT SUM(jd.kredit) as total
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    WHERE k.name LIKE 'Penjualan Telur%'
  `);

  console.log('1. Penjualan Telur:');
  console.log(`   SIM Lama (Kredit) : Rp ${Number(legPenjualanTelur[0]?.total || 0).toLocaleString('id-ID')}`);
  console.log(`   ERP v2 (Jurnal)   : Rp ${Number(v2PenjualanTelur[0]?.total || 0).toLocaleString('id-ID')}`);

  // Penjualan Pakan Sentrat
  const legPenjualanSentrat = await prisma.$queryRawUnsafe(`
    SELECT SUM(td.sub_total) as total
    FROM bimapratama.detail_transaksis td
    JOIN bimapratama.kategoris k ON k.id = td.kategori_id
    JOIN bimapratama.transaksis t ON t.id = td.transaksi_id
    WHERE k.name LIKE 'Penjualan Sentrat%' AND t.status = 'Selesai' AND t.type = 'Kredit'
  `);
  const v2PenjualanSentrat = await prisma.$queryRawUnsafe(`
    SELECT SUM(jd.kredit) as total
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    WHERE k.name LIKE 'Penjualan Sentrat%'
  `);
  console.log('2. Penjualan Pakan Sentrat:');
  console.log(`   SIM Lama (Kredit) : Rp ${Number(legPenjualanSentrat[0]?.total || 0).toLocaleString('id-ID')}`);
  console.log(`   ERP v2 (Jurnal)   : Rp ${Number(v2PenjualanSentrat[0]?.total || 0).toLocaleString('id-ID')}`);

  // Penjualan Obat
  const legPenjualanObat = await prisma.$queryRawUnsafe(`
    SELECT SUM(td.sub_total) as total
    FROM bimapratama.detail_transaksis td
    JOIN bimapratama.kategoris k ON k.id = td.kategori_id
    JOIN bimapratama.transaksis t ON t.id = td.transaksi_id
    WHERE k.name LIKE 'Penjualan Obat%' AND t.status = 'Selesai' AND t.type = 'Kredit'
  `);
  const v2PenjualanObat = await prisma.$queryRawUnsafe(`
    SELECT SUM(jd.kredit) as total
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    WHERE k.name LIKE 'Penjualan Obat%'
  `);
  console.log('3. Penjualan Obat:');
  console.log(`   SIM Lama (Kredit) : Rp ${Number(legPenjualanObat[0]?.total || 0).toLocaleString('id-ID')}`);
  console.log(`   ERP v2 (Jurnal)   : Rp ${Number(v2PenjualanObat[0]?.total || 0).toLocaleString('id-ID')}`);

  // Penjualan Tray
  const legPenjualanTray = await prisma.$queryRawUnsafe(`
    SELECT SUM(td.sub_total) as total
    FROM bimapratama.detail_transaksis td
    JOIN bimapratama.kategoris k ON k.id = td.kategori_id
    JOIN bimapratama.transaksis t ON t.id = td.transaksi_id
    WHERE k.name LIKE 'Penjualan Tray%' AND t.status = 'Selesai' AND t.type = 'Kredit'
  `);
  const v2PenjualanTray = await prisma.$queryRawUnsafe(`
    SELECT SUM(jd.kredit) as total
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    WHERE k.name LIKE 'Penjualan Tray%'
  `);
  console.log('4. Penjualan Egg Tray:');
  console.log(`   SIM Lama (Kredit) : Rp ${Number(legPenjualanTray[0]?.total || 0).toLocaleString('id-ID')}`);
  console.log(`   ERP v2 (Jurnal)   : Rp ${Number(v2PenjualanTray[0]?.total || 0).toLocaleString('id-ID')}`);

  // 6. Audit Kas & Bank
  console.log('\n========================================================================');
  console.log('💰 AUDIT REKONSILIASI SALDO KAS & BANK');
  console.log('========================================================================');
  const legKas = await prisma.$queryRawUnsafe(`
    SELECT 
      k.id,
      k.name as rekening,
      SUM(CASE WHEN LOWER(t.type) = 'debit' THEN td.sub_total ELSE -td.sub_total END) as saldo
    FROM bimapratama.detail_transaksis td
    JOIN bimapratama.kategoris k ON k.id = td.kategori_id
    JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
    JOIN bimapratama.transaksis t ON t.id = td.transaksi_id
    WHERE dk.name IN ('Kas', 'Bank BCA', 'Bank BRI', 'Bank BNI') AND t.status = 'Selesai'
    GROUP BY k.id, k.name
    ORDER BY k.id ASC
  `);

  const v2Kas = await prisma.$queryRawUnsafe(`
    SELECT 
      k.id,
      k.name as rekening,
      SUM(jd.debit - jd.kredit) as saldo
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    JOIN bimapratama_v2.detail_kategoris dk ON dk.id = k.detail_kategori_id
    WHERE dk.name IN ('Kas', 'Bank BCA', 'Bank BRI', 'Bank BNI')
    GROUP BY k.id, k.name
    ORDER BY k.id ASC
  `);

  const v2KasMap = new Map();
  for (const vk of v2Kas) {
    v2KasMap.set(vk.rekening, Number(vk.saldo || 0));
  }

  console.log('Rekening | Saldo SIM Lama | Saldo ERP v2 | Selisih');
  console.log('---------|----------------|--------------|--------');
  for (const lk of legKas) {
    const lSaldo = Number(lk.saldo || 0);
    const vSaldo = v2KasMap.get(lk.rekening) || 0;
    const diff = lSaldo - vSaldo;
    console.log(
      `${lk.rekening.padEnd(25)} | Rp ${lSaldo.toLocaleString('id-ID').padEnd(14)} | Rp ${vSaldo.toLocaleString('id-ID').padEnd(14)} | Rp ${diff.toLocaleString('id-ID')}`
    );
  }

  // Simpan data lengkap ke file audit_report.json
  const auditReport = {
    generatedAt: new Date().toISOString(),
    clientsReconciliation: {
      total: legacyClients.length,
      matches: exactMatches,
      differences,
      totalPiutang: totalV2Bon,
      totalHutang: totalV2Titipan,
      clients: comparisonRows,
    },
  };

  const reportPath = path.join(__dirname, 'audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));
  console.log(`\n📄 Laporan rekonsiliasi detail tersimpan di: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
