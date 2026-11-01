const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const startDate = '2026-10-01';
  const endDate = '2026-11-30';
  const start = '2026-10-01 00:00:00';
  const end = '2026-11-30 23:59:59';

  console.log(`🔍 AUDIT LABA RUGI: ${startDate} s/d ${endDate}\n`);

  // ==========================================
  // 1. QUERY PERSIS SIM LAMA (bimapratama)
  // ==========================================
  console.log('--- [A] HASIL QUERY PERSIS LOGIKA SIM LAMA (bimapratama) ---');

  // HPP SIM LAMA
  const hppLegacy = await prisma.$queryRawUnsafe(`
    SELECT 
      jb.name as jenis_name,
      SUM(CASE WHEN LOWER(t.type) = 'debit' THEN td.sub_total WHEN LOWER(t.type) = 'kredit' THEN -td.sub_total ELSE 0 END) AS total_hpp
    FROM bimapratama.detail_transaksis td
    JOIN bimapratama.kategoris k ON k.id = td.kategori_id
    JOIN bimapratama.barangs b ON b.id = td.barang_id
    JOIN bimapratama.jenis_barangs jb ON jb.id = b.jenis_id
    JOIN bimapratama.transaksis t ON t.id = td.transaksi_id
    WHERE k.name = 'HPP'
      AND t.status = 'Selesai'
      AND t.tanggal BETWEEN '${start}' AND '${end}'
    GROUP BY jb.name
    ORDER BY jb.name
  `);
  console.log('HPP SIM Lama per Jenis:');
  let sumHppLegacy = 0;
  for (const h of hppLegacy) {
    const val = Number(h.total_hpp);
    sumHppLegacy += val;
    console.log(`  - ${h.jenis_name.padEnd(25)}: Rp ${val.toLocaleString('id-ID')}`);
  }
  console.log(`  TOTAL HPP SIM Lama: Rp ${sumHppLegacy.toLocaleString('id-ID')}\n`);

  // PENDAPATAN & PENGELUARAN LAIN SIM LAMA
  const nonHppLegacy = await prisma.$queryRawUnsafe(`
    SELECT 
      dk.name as laporan,
      dk.type,
      k.name as kategori,
      SUM(
        CASE
          WHEN dk.type = 'Pendapatan' THEN
            CASE WHEN LOWER(t.type) = 'kredit' THEN dt.sub_total WHEN LOWER(t.type) = 'debit' THEN -dt.sub_total ELSE 0 END
          WHEN dk.type = 'Pengeluaran' THEN
            CASE WHEN LOWER(t.type) = 'debit' THEN dt.sub_total WHEN LOWER(t.type) = 'kredit' THEN -dt.sub_total ELSE 0 END
          ELSE 0
        END
      ) as total
    FROM bimapratama.detail_transaksis dt
    JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
    JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
    JOIN bimapratama.transaksis t ON t.id = dt.transaksi_id
    WHERE t.tanggal BETWEEN '${start}' AND '${end}'
      AND k.name NOT LIKE '% Pakan Curah'
      AND t.status = 'Selesai'
    GROUP BY dk.name, dk.type, k.name
    ORDER BY dk.type, dk.name, k.name
  `);

  let sumPendapatanLegacy = 0;
  let sumPengeluaranNonHppLegacy = 0;
  console.log('Pendapatan & Pengeluaran Lain SIM Lama:');
  for (const r of nonHppLegacy) {
    const val = Number(r.total);
    if (r.type === 'Pendapatan') {
      sumPendapatanLegacy += val;
      console.log(`  [Pendapatan] ${r.laporan} -> ${r.kategori}: Rp ${val.toLocaleString('id-ID')}`);
    } else if (r.type === 'Pengeluaran' && !r.kategori.startsWith('HPP')) {
      sumPengeluaranNonHppLegacy += val;
      console.log(`  [Pengeluaran] ${r.laporan} -> ${r.kategori}: Rp ${val.toLocaleString('id-ID')}`);
    }
  }

  const totalPengeluaranLegacy = sumHppLegacy + sumPengeluaranNonHppLegacy;
  const labaBersihLegacy = sumPendapatanLegacy - totalPengeluaranLegacy;
  console.log('\n=== REKAP SIM LAMA ===');
  console.log(`Total Pendapatan : Rp ${sumPendapatanLegacy.toLocaleString('id-ID')}`);
  console.log(`Total Pengeluaran: Rp ${totalPengeluaranLegacy.toLocaleString('id-ID')} (HPP: ${sumHppLegacy.toLocaleString('id-ID')} + Beban: ${sumPengeluaranNonHppLegacy.toLocaleString('id-ID')})`);
  console.log(`Total Laba/Rugi  : Rp ${labaBersihLegacy.toLocaleString('id-ID')}\n`);

  // ==========================================
  // 2. QUERY ERP V2 (bimapratama_v2)
  // ==========================================
  console.log('--- [B] HASIL QUERY ERP V2 (bimapratama_v2) ---');

  // Penjualan komoditas dari jurnal_details
  const salesV2 = await prisma.$queryRawUnsafe(`
    SELECT jd.kategori_id, k.name, SUM(jd.kredit) as total_penjualan
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.jurnal_umums ju ON ju.id = jd.jurnal_id
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    WHERE jd.kategori_id BETWEEN 1 AND 10 AND jd.kategori_id != 8
      AND ju.tanggal BETWEEN '${start}' AND '${end}'
    GROUP BY jd.kategori_id, k.name
  `);
  console.log('Penjualan Komoditas V2:');
  let sumPenjualanV2 = 0;
  for (const s of salesV2) {
    const val = Number(s.total_penjualan);
    sumPenjualanV2 += val;
    console.log(`  - [Kat ${s.kategori_id}] ${s.name}: Rp ${val.toLocaleString('id-ID')}`);
  }
  console.log(`  TOTAL Penjualan Komoditas: Rp ${sumPenjualanV2.toLocaleString('id-ID')}\n`);

  // HPP V2 dari jurnal_details
  const hppV2 = await prisma.$queryRawUnsafe(`
    SELECT jd.kategori_id, k.name, SUM(jd.debit) as total_hpp
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.jurnal_umums ju ON ju.id = jd.jurnal_id
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    WHERE jd.kategori_id BETWEEN 90 AND 99 AND jd.kategori_id != 96
      AND ju.tanggal BETWEEN '${start}' AND '${end}'
    GROUP BY jd.kategori_id, k.name
  `);
  console.log('HPP V2:');
  let sumHppV2 = 0;
  for (const h of hppV2) {
    const val = Number(h.total_hpp);
    sumHppV2 += val;
    console.log(`  - [Kat ${h.kategori_id}] ${h.name}: Rp ${val.toLocaleString('id-ID')}`);
  }
  console.log(`  TOTAL HPP V2: Rp ${sumHppV2.toLocaleString('id-ID')}\n`);

  // Beban V2
  const bebanV2 = await prisma.$queryRawUnsafe(`
    SELECT jd.kategori_id, k.name, dk.name as group_name, SUM(jd.debit) as total_beban
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.jurnal_umums ju ON ju.id = jd.jurnal_id
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    JOIN bimapratama_v2.detail_kategoris dk ON dk.id = k.detail_kategori_id
    WHERE ((dk.name LIKE '%Beban%' OR dk.name LIKE '%Biaya%' OR (jd.kategori_id BETWEEN 22 AND 45)) AND jd.kategori_id != 38)
      AND ju.tanggal BETWEEN '${start}' AND '${end}'
    GROUP BY jd.kategori_id, k.name, dk.name
  `);
  let sumBebanV2 = 0;
  for (const b of bebanV2) {
    sumBebanV2 += Number(b.total_beban);
  }
  console.log(`TOTAL Beban V2: Rp ${sumBebanV2.toLocaleString('id-ID')}`);

  // Pendapatan Lain V2
  const pendLainV2 = await prisma.$queryRawUnsafe(`
    SELECT jd.kategori_id, k.name, dk.name as group_name, SUM(jd.kredit) as total_pendapatan
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.jurnal_umums ju ON ju.id = jd.jurnal_id
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    JOIN bimapratama_v2.detail_kategoris dk ON dk.id = k.detail_kategori_id
    WHERE jd.kategori_id BETWEEN 11 AND 21
      AND ju.tanggal BETWEEN '${start}' AND '${end}'
    GROUP BY jd.kategori_id, k.name, dk.name
  `);
  let sumPendLainV2 = 0;
  for (const p of pendLainV2) {
    sumPendLainV2 += Number(p.total_pendapatan);
  }
  console.log(`TOTAL Pendapatan Lain V2: Rp ${sumPendLainV2.toLocaleString('id-ID')}`);

  await prisma.$disconnect();
}

run().catch(console.error);
