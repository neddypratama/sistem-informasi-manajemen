const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const start = new Date('2026-10-01 00:00:00');
  const end = new Date('2026-11-30 23:59:59');

  // 1. Total Penjualan per Kategori Penjualan Komoditas (1 s/d 10, kecuali 8 Pakan Curah) NET
  const salesResult = await prisma.$queryRaw`
    SELECT jd.kategori_id, k.name, SUM(jd.kredit - jd.debit) as total_penjualan
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.jurnal_umums ju ON ju.id = jd.jurnal_id
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    WHERE jd.kategori_id BETWEEN 1 AND 10 AND jd.kategori_id != 8
      AND ju.tanggal BETWEEN ${start} AND ${end}
    GROUP BY jd.kategori_id, k.name
  `;

  // 2. Total HPP per Kategori HPP (90 s/d 99, kecuali 96 HPP Pakan Curah) NET
  const hppResult = await prisma.$queryRaw`
    SELECT jd.kategori_id, k.name, SUM(jd.debit - jd.kredit) as total_hpp
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.jurnal_umums ju ON ju.id = jd.jurnal_id
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    WHERE jd.kategori_id BETWEEN 90 AND 99 AND jd.kategori_id != 96
      AND ju.tanggal BETWEEN ${start} AND ${end}
    GROUP BY jd.kategori_id, k.name
  `;

  // 3. Rincian Beban Operasional NET
  const bebanResult = await prisma.$queryRaw`
    SELECT jd.kategori_id, k.name, dk.name as group_name, SUM(jd.debit - jd.kredit) as total_beban
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.jurnal_umums ju ON ju.id = jd.jurnal_id
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    JOIN bimapratama_v2.detail_kategoris dk ON dk.id = k.detail_kategori_id
    WHERE ((dk.name LIKE '%Beban%' OR dk.name LIKE '%Biaya%' OR (jd.kategori_id BETWEEN 22 AND 45)) AND jd.kategori_id != 38)
      AND ju.tanggal BETWEEN ${start} AND ${end}
    GROUP BY jd.kategori_id, k.name, dk.name
    ORDER BY total_beban DESC
  `;

  // 4. Rincian Pendapatan Lain-Lain NET
  const pendapatanLainResult = await prisma.$queryRaw`
    SELECT jd.kategori_id, k.name, dk.name as group_name, SUM(jd.kredit - jd.debit) as total_pendapatan
    FROM bimapratama_v2.jurnal_details jd
    JOIN bimapratama_v2.jurnal_umums ju ON ju.id = jd.jurnal_id
    JOIN bimapratama_v2.kategoris k ON k.id = jd.kategori_id
    JOIN bimapratama_v2.detail_kategoris dk ON dk.id = k.detail_kategori_id
    WHERE jd.kategori_id BETWEEN 11 AND 21
      AND ju.tanggal BETWEEN ${start} AND ${end}
    GROUP BY jd.kategori_id, k.name, dk.name
    ORDER BY total_pendapatan DESC
  `;

  let totalPenjualan = 0;
  for (const s of salesResult) totalPenjualan += Number(s.total_penjualan || 0);

  let totalHpp = 0;
  for (const h of hppResult) totalHpp += Number(h.total_hpp || 0);

  let totalBeban = 0;
  for (const b of bebanResult) totalBeban += Number(b.total_beban || 0);

  let totalPendLain = 0;
  for (const p of pendapatanLainResult) totalPendLain += Number(p.total_pendapatan || 0);

  const labaKotor = totalPenjualan - totalHpp;
  const labaBersih = labaKotor - totalBeban + totalPendLain;

  const totalPenerimaan = totalPenjualan + totalPendLain;
  const totalPengeluaran = totalHpp + totalBeban;

  console.log('=== HASIL PERBAIKAN FORMULA LABA RUGI (NET REVERSAL) ===');
  console.log(`Penjualan Komoditas : Rp ${totalPenjualan.toLocaleString('id-ID')}`);
  console.log(`Pendapatan Lain     : Rp ${totalPendLain.toLocaleString('id-ID')}`);
  console.log(`--------------------------------------------------------`);
  console.log(`TOTAL PENERIMAAN    : Rp ${totalPenerimaan.toLocaleString('id-ID')}`);
  console.log(`(SIM Lama Target   : Rp 8.649.398.962) -> Selisih: Rp ${(totalPenerimaan - 8649398962).toLocaleString('id-ID')}\n`);

  console.log(`Total HPP           : Rp ${totalHpp.toLocaleString('id-ID')}`);
  console.log(`Total Beban         : Rp ${totalBeban.toLocaleString('id-ID')}`);
  console.log(`--------------------------------------------------------`);
  console.log(`TOTAL PENGELUARAN   : Rp ${totalPengeluaran.toLocaleString('id-ID')}`);
  console.log(`(SIM Lama Target   : Rp 8.262.768.561) -> Selisih: Rp ${(totalPengeluaran - 8262768561).toLocaleString('id-ID')}\n`);

  console.log(`LABA BERSIH USAHA   : Rp ${labaBersih.toLocaleString('id-ID')}`);
  console.log(`(SIM Lama Target   : Rp 386.630.401)   -> Selisih: Rp ${(labaBersih - 386630401).toLocaleString('id-ID')}`);

  await prisma.$disconnect();
}

run().catch(console.error);
