const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mysql = require('mysql2/promise');

async function main() {
  console.log('=== INVESTIGATING KAS DEBY ===');

  // 1. Kategori Deby in v2
  const katDeby = await prisma.kategori.findFirst({
    where: { name: { contains: 'Deby' } },
    include: { detailKategori: true }
  });
  console.log('Kategori Deby in v2:', katDeby);

  // 2. Check journal balance for Kas Deby in v2 (kategori_id = 71)
  const jdDeby = await prisma.$queryRaw`
    SELECT 
      SUM(jd.debit) as total_debit,
      SUM(jd.kredit) as total_kredit,
      SUM(jd.debit - jd.kredit) as saldo_akhir
    FROM jurnal_details jd
    JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
    LEFT JOIN transaksis t ON t.id = ju.transaksi_id
    WHERE jd.kategori_id = ${katDeby.id}
      AND (t.status IS NULL OR t.status != 'BATAL')
  `;
  console.log('Jurnal Details for Kas Deby in v2:', jdDeby);

  // 3. Check all transactions where detail_transaksis has kategori_id = 71
  const dtDeby = await prisma.$queryRaw`
    SELECT 
      t.type,
      t.payment_method,
      COUNT(t.id) as count,
      SUM(dt.subtotal) as total
    FROM detail_transaksis dt
    JOIN transaksis t ON t.id = dt.transaksi_id
    WHERE dt.kategori_id = ${katDeby.id} AND t.status = 'SELESAI'
    GROUP BY t.type, t.payment_method
  `;
  console.log('Detail Transaksis for Kas Deby in v2:', dtDeby);

  // 4. Connect to SIM Lama (bimapratama)
  const oldConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bimapratama',
  });

  const [oldKats] = await oldConn.query(`SELECT * FROM kategoris WHERE name LIKE '%Deb%'`);
  console.log('Kategoris in SIM Lama:', oldKats);

  const oldKatId = oldKats[0].id;

  // Let's check old transaksis for oldKatId
  const [oldTxGroup] = await oldConn.query(`
    SELECT 
      t.type,
      COUNT(*) as count,
      SUM(dt.sub_total) as total
    FROM transaksis t
    JOIN detail_transaksis dt ON dt.transaksi_id = t.id
    WHERE dt.kategori_id = ?
    GROUP BY t.type
  `, [oldKatId]);
  console.log('Old SIM Transaksi Group for Kas Deby:', oldTxGroup);

  // Check how SIM lama calculates Kas Deby balance
  // In SIM lama, how was Kas Deby calculated?
  // Let's check jurnals or AssetReport or KasReport in SIM lama!
  const [oldTables] = await oldConn.query(`SHOW TABLES`);
  console.log('SIM Lama Tables count:', oldTables.length);

  await oldConn.end();
}

main().catch(console.error).finally(() => prisma.$disconnect());
