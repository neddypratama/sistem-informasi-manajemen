const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateLaporanAset(cutoffDateStr) {
  const asOfDate = cutoffDateStr ? new Date(`${cutoffDateStr} 23:59:59`) : null;
  const isHistorical = asOfDate && asOfDate < new Date();

  // 1. Non-client accounts from jurnal_details
  const dateCond = asOfDate
    ? prisma.$queryRaw`
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
            AND ju.tanggal <= ${asOfDate}
        ) jd ON jd.kategori_id = k.id
        WHERE dk.type IN ('Aset', 'Liabilitas')
          AND k.name != 'Penyesuaian Stok'
        GROUP BY k.id, k.name, k.code, dk.id, dk.name, dk.type
        ORDER BY dk.id, k.id
      `
    : prisma.$queryRaw`
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
        ) jd ON jd.kategori_id = k.id
        WHERE dk.type IN ('Aset', 'Liabilitas')
          AND k.name != 'Penyesuaian Stok'
        GROUP BY k.id, k.name, k.code, dk.id, dk.name, dk.type
        ORDER BY dk.id, k.id
      `;

  const nonClientRows = await dateCond;

  const flatAset = {};
  const flatLiabilitas = {};

  for (const r of nonClientRows) {
    if (r.group_type === 'Aset') {
      flatAset[r.kategori_name] = Number(r.saldo || 0);
    } else {
      flatLiabilitas[r.kategori_name] = Number(r.saldo || 0);
    }
  }

  // 2. Client balances
  let clientBalances = [];
  if (!isHistorical) {
    clientBalances = await prisma.$queryRaw`
      SELECT id, name, type, saldo_piutang, saldo_hutang
      FROM clients
    `;
  } else {
    // Back-calculate from current balances using delta transactions after asOfDate
    const txsAfter = await prisma.transaksi.findMany({
      where: {
        status: 'SELESAI',
        tanggal: { gt: asOfDate }
      },
      select: {
        id: true,
        type: true,
        paymentMethod: true,
        clientId: true,
        total: true,
        details: {
          select: {
            subtotal: true,
            kategori: { select: { id: true, name: true, detailKategori: { select: { name: true, type: true } } } }
          }
        }
      }
    });

    const deltaHutang = new Map();
    const deltaPiutang = new Map();

    for (const t of txsAfter) {
      if (!t.clientId) continue;
      const cId = t.clientId.toString();

      if (t.type === 'PEMBELIAN' && t.paymentMethod === 'KREDIT_BON') {
        deltaHutang.set(cId, (deltaHutang.get(cId) || 0) + Number(t.total));
      } else if (t.type === 'PENJUALAN' && t.paymentMethod === 'KREDIT_BON') {
        deltaPiutang.set(cId, (deltaPiutang.get(cId) || 0) + Number(t.total));
      } else if (t.type === 'KAS_KELUAR') {
        for (const d of t.details) {
          const dType = d.kategori?.detailKategori?.type;
          const sub = Number(d.subtotal);
          if (dType === 'Liabilitas' || d.kategori?.name?.includes('Hutang') || d.kategori?.name?.includes('Saldo')) {
            deltaHutang.set(cId, (deltaHutang.get(cId) || 0) - sub);
          } else if (dType === 'Aset' || d.kategori?.name?.includes('Piutang')) {
            deltaPiutang.set(cId, (deltaPiutang.get(cId) || 0) + sub);
          } else {
            deltaHutang.set(cId, (deltaHutang.get(cId) || 0) - sub);
          }
        }
      } else if (t.type === 'KAS_MASUK') {
        for (const d of t.details) {
          const dType = d.kategori?.detailKategori?.type;
          const sub = Number(d.subtotal);
          if (dType === 'Aset' || d.kategori?.name?.includes('Piutang')) {
            deltaPiutang.set(cId, (deltaPiutang.get(cId) || 0) - sub);
          } else if (dType === 'Liabilitas' || d.kategori?.name?.includes('Hutang') || d.kategori?.name?.includes('Saldo')) {
            deltaHutang.set(cId, (deltaHutang.get(cId) || 0) + sub);
          } else {
            deltaPiutang.set(cId, (deltaPiutang.get(cId) || 0) - sub);
          }
        }
      }
    }

    const allClients = await prisma.client.findMany({
      select: { id: true, name: true, type: true, saldoPiutang: true, saldoHutang: true }
    });

    clientBalances = allClients.map(c => {
      const cId = c.id.toString();
      const dH = deltaHutang.get(cId) || 0;
      const dP = deltaPiutang.get(cId) || 0;
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        saldo_piutang: Math.max(0, Number(c.saldoPiutang) - dP),
        saldo_hutang: Math.max(0, Number(c.saldoHutang) - dH),
      };
    });
  }

  const piutangNet = {
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

  const hutangNet = {
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

  for (const c of clientBalances) {
    const p = Number(c.saldo_piutang || 0);
    const h = Number(c.saldo_hutang || 0);
    const saldo = p - h;

    if (saldo === 0) continue;

    if (saldo > 0) {
      if (c.type === 'Peternak') piutangNet['Piutang Peternak'] += saldo;
      else if (c.type === 'Pedagang') piutangNet['Piutang Pedagang'] += saldo;
      else if (c.type === 'Karyawan') piutangNet['Piutang Karyawan'] += saldo;
      else if (c.type === 'Supplier') {
        for (const k in piutangNet) {
          if (k.includes(c.name)) piutangNet[k] += saldo;
        }
      }
    } else {
      const nilai = Math.abs(saldo);
      if (c.type === 'Peternak') hutangNet['Hutang Peternak'] += nilai;
      else if (c.type === 'Pedagang') hutangNet['Hutang Pedagang'] += nilai;
      else if (c.type === 'Karyawan') hutangNet['Hutang Karyawan'] += nilai;
      else if (c.type === 'Supplier') {
        for (const k in hutangNet) {
          if (k.includes(c.name)) hutangNet[k] += nilai;
        }
      }
    }
  }

  for (const k in piutangNet) flatAset[k] = piutangNet[k];
  for (const k in hutangNet) flatLiabilitas[k] = hutangNet[k];

  // Mapping
  const mapping = await prisma.$queryRaw`
    SELECT dk.id as dk_id, dk.name as group_name, dk.type as group_type, k.id as kat_id, k.code as kat_code, k.name as kat_name
    FROM detail_kategoris dk
    LEFT JOIN kategoris k ON k.detail_kategori_id = dk.id
    WHERE dk.type IN ('Aset', 'Liabilitas')
    ORDER BY dk.id, k.id
  `;

  let totalAset = 0;
  let totalLiabilitas = 0;

  for (const row of mapping) {
    const isAset = row.group_type === 'Aset';
    const flatSource = isAset ? flatAset : flatLiabilitas;
    const saldo = Number(flatSource[row.kat_name] || 0);
    if (isAset) totalAset += saldo;
    else totalLiabilitas += saldo;
  }

  console.log(`\n======================================================`);
  console.log(`SIMULATION: Cut-off ${cutoffDateStr || 'SEMUA WAKTU'}`);
  console.log(`======================================================`);
  console.log(`Total Aset      : Rp ${totalAset.toLocaleString('id-ID')}`);
  console.log(`Total Liabilitas: Rp ${totalLiabilitas.toLocaleString('id-ID')}`);
  console.log(`Modal Bersih    : Rp ${(totalAset - totalLiabilitas).toLocaleString('id-ID')}`);
  console.log(`Saldo Bp.Supriyadi: Rp ${(hutangNet['Saldo Bp.Supriyadi'] || 0).toLocaleString('id-ID')}`);
  console.log(`Hutang Peternak : Rp ${(hutangNet['Hutang Peternak'] || 0).toLocaleString('id-ID')}`);
  console.log(`Piutang Pedagang: Rp ${(piutangNet['Piutang Pedagang'] || 0).toLocaleString('id-ID')}`);
  console.log(`Kas Deby        : Rp ${(flatAset['Kas Deby'] || 0).toLocaleString('id-ID')}`);
  console.log(`Stok Telur      : Rp ${(flatAset['Stok Telur'] || 0).toLocaleString('id-ID')}`);
  console.log(`Stok Curah      : Rp ${(flatAset['Stok Curah'] || 0).toLocaleString('id-ID')}`);
}

async function main() {
  await simulateLaporanAset(null); // Semua waktu
  await simulateLaporanAset('2026-11-07'); // Hari ini
  await simulateLaporanAset('2026-10-31'); // 31 Okt
}

main().catch(console.error).finally(() => prisma.$disconnect());
