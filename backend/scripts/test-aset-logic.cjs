const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getLaporanAsetSimulated(startDate, endDate) {
  let dateConditionDt = '';
  let dateConditionTx = '';
  if (startDate && endDate) {
    dateConditionDt = `AND t.tanggal BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
    dateConditionTx = `AND tanggal BETWEEN '${startDate} 00:00:00' AND '${endDate} 23:59:59'`;
  }

  // 1. Ambil transaksi Kas, Bank, Stok dari DB
  const asetFlatRows = await prisma.$queryRawUnsafe(`
    SELECT 
      k.name as kategori,
      dk.name as group_name,
      SUM(CASE WHEN LOWER(t.type) = 'debit' THEN dt.sub_total ELSE -dt.sub_total END) as total
    FROM bimapratama.detail_transaksis dt
    JOIN bimapratama.transaksis t ON t.id = dt.transaksi_id
    JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
    JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
    WHERE t.status = 'Selesai'
      AND dk.type = 'Aset'
      AND k.name != 'Penyesuaian Stok'
      ${dateConditionDt}
    GROUP BY k.name, dk.name
  `);

  const liabilitasFlatRows = await prisma.$queryRawUnsafe(`
    SELECT 
      k.name as kategori,
      dk.name as group_name,
      SUM(CASE WHEN LOWER(t.type) = 'kredit' THEN dt.sub_total ELSE -dt.sub_total END) as total
    FROM bimapratama.detail_transaksis dt
    JOIN bimapratama.transaksis t ON t.id = dt.transaksi_id
    JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
    JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
    WHERE t.status = 'Selesai'
      AND dk.type = 'Liabilitas'
      ${dateConditionDt}
    GROUP BY k.name, dk.name
  `);

  const asetFlat = {};
  for (const r of asetFlatRows) asetFlat[r.kategori] = Number(r.total || 0);

  const liabilitasFlat = {};
  for (const r of liabilitasFlatRows) liabilitasFlat[r.kategori] = Number(r.total || 0);

  // 2. Hitung Laba Curah jika ada Bp.Supriyadi
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
    WHERE k.name = 'Penjualan Pakan Curah' AND t.status = 'Selesai' ${dateConditionDt}
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
    WHERE k.name = 'HPP' AND jb.name = 'Pakan Curah' AND t.status = 'Selesai' ${dateConditionDt}
  `);

  const curahNet = Number(curahPendapatanRes[0]?.total_pendapatan || 0) - Number(curahHppRes[0]?.total_hpp || 0);

  // 3. Ambil saldo tiap client dan NETTING per client
  // Jika tidak ada date filter, langsung dari saldo_piutang dan saldo_hutang
  let clientRows;
  if (!startDate && !endDate) {
    clientRows = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id, c.name, c.type,
        c.saldo_piutang, c.saldo_hutang
      FROM bimapratama_v2.clients c
    `);
  } else {
    clientRows = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id, c.name, c.type,
        COALESCE((
          SELECT SUM(t.total) FROM bimapratama.transaksis t
          WHERE t.client_id = c.id AND t.type = 'Debit' AND t.status = 'Selesai'
            ${dateConditionTx}
            AND EXISTS (
              SELECT 1 FROM bimapratama.detail_transaksis dt
              JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
              JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
              WHERE dt.transaksi_id = t.id AND dk.type LIKE '%Aset%' AND k.name NOT LIKE '%Stok%' AND k.name NOT LIKE '%Kas%' AND k.name NOT LIKE '%Bank%'
            )
        ), 0) -
        COALESCE((
          SELECT SUM(t.total) FROM bimapratama.transaksis t
          WHERE t.client_id = c.id AND t.type = 'Kredit' AND t.status = 'Selesai'
            ${dateConditionTx}
            AND EXISTS (
              SELECT 1 FROM bimapratama.detail_transaksis dt
              JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
              JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
              WHERE dt.transaksi_id = t.id AND dk.type LIKE '%Aset%' AND k.name NOT LIKE '%Stok%' AND k.name NOT LIKE '%Kas%' AND k.name NOT LIKE '%Bank%'
            )
        ), 0) as saldo_piutang,
        COALESCE((
          SELECT SUM(t.total) FROM bimapratama.transaksis t
          WHERE t.client_id = c.id AND t.type = 'Kredit' AND t.status = 'Selesai'
            ${dateConditionTx}
            AND EXISTS (
              SELECT 1 FROM bimapratama.detail_transaksis dt
              JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
              JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
              WHERE dt.transaksi_id = t.id AND dk.type LIKE '%Liabilitas%'
            )
        ), 0) -
        COALESCE((
          SELECT SUM(t.total) FROM bimapratama.transaksis t
          WHERE t.client_id = c.id AND t.type = 'Debit' AND t.status = 'Selesai'
            ${dateConditionTx}
            AND EXISTS (
              SELECT 1 FROM bimapratama.detail_transaksis dt
              JOIN bimapratama.kategoris k ON k.id = dt.kategori_id
              JOIN bimapratama.detail_kategoris dk ON dk.id = k.detail_kategori_id
              WHERE dt.transaksi_id = t.id AND dk.type LIKE '%Liabilitas%'
            )
        ), 0) as saldo_hutang
      FROM bimapratama.clients c
    `);
  }

  const piutang = {
    'Piutang Peternak': 0,
    'Piutang Karyawan': 0,
    'Piutang Pedagang': 0,
    'Supplier Bp.Supriyadi': 0,
    'Piutang Tray Diamond /DM': 0,
    'Piutang Tray Super Buah /SB': 0,
    'Piutang Tray Random': 0,
    'Piutang Obat SK': 0,
    'Piutang Obat Ponggok': 0,
    'Piutang Obat Random': 0,
    'Piutang Sentrat SK': 0,
    'Piutang Sentrat Ponggok': 0,
    'Piutang Sentrat Random': 0,
  };

  const hutang = {
    'Hutang Peternak': 0,
    'Hutang Karyawan': 0,
    'Hutang Pedagang': 0,
    'Saldo Bp.Supriyadi': 0,
    'Hutang Tray Diamond /DM': 0,
    'Hutang Tray Super Buah /SB': 0,
    'Hutang Tray Random': 0,
    'Hutang Obat SK': 0,
    'Hutang Obat Ponggok': 0,
    'Hutang Obat Random': 0,
    'Hutang Sentrat SK': 0,
    'Hutang Sentrat Ponggok': 0,
    'Hutang Sentrat Random': 0,
  };

  for (const c of clientRows) {
    const p = Number(c.saldo_piutang || 0);
    let h = Number(c.saldo_hutang || 0);

    // Saldo bersih client
    let saldo = p - h;

    if (saldo === 0) continue;

    if (saldo > 0) {
      if (c.type === 'Peternak') piutang['Piutang Peternak'] += saldo;
      else if (c.type === 'Pedagang') piutang['Piutang Pedagang'] += saldo;
      else if (c.type === 'Karyawan') piutang['Piutang Karyawan'] += saldo;
      else if (c.type === 'Supplier') {
        for (const k in piutang) {
          if (k.includes(c.name)) piutang[k] += saldo;
        }
      }
    } else {
      let nilai = Math.abs(saldo);
      if (c.type === 'Peternak') hutang['Hutang Peternak'] += nilai;
      else if (c.type === 'Pedagang') hutang['Hutang Pedagang'] += nilai;
      else if (c.type === 'Karyawan') hutang['Hutang Karyawan'] += nilai;
      else if (c.type === 'Supplier') {
        for (const k in hutang) {
          if (k.includes(c.name)) hutang[k] += nilai;
        }
      }
    }
  }

  // Jika date filter ada, curahNet ditambahkan ke Saldo Bp.Supriyadi
  // Jika all-time, saldo_hutang Bp.Supriyadi sudah termasuk curahNet
  if (startDate && endDate) {
    hutang['Saldo Bp.Supriyadi'] += curahNet;
  }

  // 4. Timpa akun piutang & hutang di asetFlat & liabilitasFlat dengan hasil netting
  for (const k in piutang) asetFlat[k] = piutang[k];
  for (const k in hutang) liabilitasFlat[k] = hutang[k];

  // 5. Bangun struktur asetGroups & liabilitasGroups
  const mapping = await prisma.$queryRawUnsafe(`
    SELECT dk.id as dk_id, dk.name as group_name, dk.type as group_type, k.id as kat_id, k.code as kat_code, k.name as kat_name
    FROM bimapratama_v2.detail_kategoris dk
    LEFT JOIN bimapratama_v2.kategoris k ON k.detail_kategori_id = dk.id
    WHERE dk.type IN ('Aset', 'Liabilitas')
    ORDER BY dk.id, k.id
  `);

  const asetGroupsMap = new Map();
  const liabilitasGroupsMap = new Map();

  for (const row of mapping) {
    const grpName = row.group_name;
    const isAset = row.group_type === 'Aset';
    const targetMap = isAset ? asetGroupsMap : liabilitasGroupsMap;
    const flatSource = isAset ? asetFlat : liabilitasFlat;

    if (!targetMap.has(grpName)) {
      targetMap.set(grpName, {
        group: grpName,
        detailKategoriId: Number(row.dk_id),
        total: 0,
        details: [],
      });
    }

    const grpObj = targetMap.get(grpName);
    const saldo = Number(flatSource[row.kat_name] || 0);
    grpObj.total += saldo;
    grpObj.details.push({
      kategoriId: Number(row.kat_id),
      kategori: row.kat_name,
      code: row.kat_code,
      saldo,
    });
  }

  const asetGroups = Array.from(asetGroupsMap.values());
  const liabilitasGroups = Array.from(liabilitasGroupsMap.values());

  const totalAset = asetGroups.reduce((acc, curr) => acc + curr.total, 0);
  const totalLiabilitas = liabilitasGroups.reduce((acc, curr) => acc + curr.total, 0);
  const totalModal = totalAset - totalLiabilitas;

  console.log(`TOTAL ASET       : Rp ${totalAset.toLocaleString('id-ID')}`);
  console.log(`TOTAL LIABILITAS : Rp ${totalLiabilitas.toLocaleString('id-ID')}`);
  console.log(`TOTAL MODAL      : Rp ${totalModal.toLocaleString('id-ID')}`);

  return { totalAset, totalLiabilitas, totalModal, asetGroups, liabilitasGroups };
}

async function main() {
  await getLaporanAsetSimulated(null, null);
  await prisma.$disconnect();
}

main().catch(console.error);
