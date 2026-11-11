const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function testExclusion(startDate, endDate) {
  const sStr = startDate && startDate.trim().length > 0 ? startDate.trim() : null;
  const eStr = endDate && endDate.trim().length > 0 ? endDate.trim() : null;

  let asOfDate = null;
  if (sStr && eStr) {
    const dStart = new Date(`${sStr} 23:59:59`);
    const dEnd = new Date(`${eStr} 23:59:59`);
    asOfDate = dEnd >= dStart ? dEnd : dStart;
  } else if (eStr) {
    asOfDate = new Date(`${eStr} 23:59:59`);
  } else if (sStr) {
    asOfDate = new Date(`${sStr} 23:59:59`);
  }

  const now = new Date();
  const isHistorical = asOfDate !== null && asOfDate < now;

  const dateCondition = asOfDate
    ? Prisma.sql`AND ju.tanggal <= ${asOfDate}`
    : Prisma.empty;

  // 1. Ambil saldo akun non-piutang/non-hutang (Kas, Bank, Stok, dsb.) dari jurnal_details
  // Mengikuti logika SIM Lama: akun 'Penyesuaian Stok' dan 'Stok Curah' dikecualikan
  const nonClientRows = await prisma.$queryRaw`
    SELECT 
      k.id as kategori_id,
      k.name as kategori_name,
      k.code as kategori_code,
      dk.id as detail_kategori_id,
      dk.name as group_name,
      dk.type as group_type,
      COALESCE(
        SUM(
          CASE 
            WHEN dk.type = 'Aset' THEN jd.debit - jd.kredit
            ELSE jd.kredit - jd.debit
          END
        ), 0
      ) as saldo
    FROM detail_kategoris dk
    JOIN kategoris k ON k.detail_kategori_id = dk.id
    LEFT JOIN (
      SELECT jd.kategori_id, jd.debit, jd.kredit
      FROM jurnal_details jd
      JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
      LEFT JOIN transaksis t ON t.id = ju.transaksi_id
      WHERE (t.status IS NULL OR t.status != 'BATAL')
        ${dateCondition}
    ) jd ON jd.kategori_id = k.id
    WHERE dk.type IN ('Aset', 'Liabilitas')
      AND k.name != 'Penyesuaian Stok'
      AND dk.name != 'Stok Curah'
      AND k.name != 'Stok Curah'
      AND k.id != 89
    GROUP BY k.id, k.name, k.code, dk.id, dk.name, dk.type
    ORDER BY dk.id, k.id
  `;

  const flatAset = {};
  const flatLiabilitas = {};

  for (const r of nonClientRows) {
    if (r.group_type === 'Aset') {
      flatAset[r.kategori_name] = Number(r.saldo || 0);
    } else {
      flatLiabilitas[r.kategori_name] = Number(r.saldo || 0);
    }
  }

  // 3. Susun kelompok laporan (detail_kategoris)
  const mapping = await prisma.$queryRaw`
    SELECT dk.id as dk_id, dk.name as group_name, dk.type as group_type, k.id as kat_id, k.code as kat_code, k.name as kat_name
    FROM detail_kategoris dk
    LEFT JOIN kategoris k ON k.detail_kategori_id = dk.id
    WHERE dk.type IN ('Aset', 'Liabilitas')
      AND dk.name != 'Stok Curah'
      AND (k.id IS NULL OR (k.id != 89 AND k.name != 'Stok Curah'))
    ORDER BY dk.id, k.id
  `;

  const asetMap = new Map();
  const liabilitasMap = new Map();

  for (const row of mapping) {
    const isAset = row.group_type === 'Aset';
    const targetMap = isAset ? asetMap : liabilitasMap;
    const flatSource = isAset ? flatAset : flatLiabilitas;

    if (!targetMap.has(row.group_name)) {
      targetMap.set(row.group_name, {
        group: row.group_name,
        detailKategoriId: Number(row.dk_id),
        total: 0,
        details: [],
      });
    }

    const grp = targetMap.get(row.group_name);
    const saldo = Number(flatSource[row.kat_name] || 0);
    grp.total += saldo;
    grp.details.push({
      kategoriId: Number(row.kat_id),
      kategori: row.kat_name,
      code: row.kat_code,
      saldo,
    });
  }

  const asetGroups = Array.from(asetMap.values());
  const liabilitasGroups = Array.from(liabilitasMap.values());

  const totalAset = asetGroups.reduce((acc, curr) => acc + curr.total, 0);
  const totalLiabilitas = liabilitasGroups.reduce((acc, curr) => acc + curr.total, 0);
  const totalModal = totalAset - totalLiabilitas;

  return { totalAset, totalLiabilitas, totalModal, asetGroups, liabilitasGroups };
}

async function main() {
  console.log('=== TEST LIVE (SEMUA WAKTU) ===');
  const live = await testExclusion();
  console.log('Total Aset (Non-Curah):', live.totalAset);
  console.log('Total Liabilitas:', live.totalLiabilitas);
  console.log('Total Modal:', live.totalModal);
  console.log('Aset Groups:', live.asetGroups.map(g => `${g.group}: ${g.total.toLocaleString('id-ID')}`));

  const hasCurahLive = live.asetGroups.some(g => g.group.toLowerCase().includes('curah'));
  console.log('Has Curah in Live?', hasCurahLive);

  console.log('\n=== TEST AS OF 31 OKT 2026 ===');
  const oct31 = await testExclusion('2026-10-31', '2026-10-31');
  console.log('Total Aset (Non-Curah):', oct31.totalAset);
  console.log('Total Liabilitas:', oct31.totalLiabilitas);
  console.log('Total Modal:', oct31.totalModal);
  console.log('Aset Groups:', oct31.asetGroups.map(g => `${g.group}: ${g.total.toLocaleString('id-ID')}`));

  const hasCurahOct = oct31.asetGroups.some(g => g.group.toLowerCase().includes('curah'));
  console.log('Has Curah in Oct 31?', hasCurahOct);
}

main().catch(console.error).finally(() => prisma.$disconnect());
