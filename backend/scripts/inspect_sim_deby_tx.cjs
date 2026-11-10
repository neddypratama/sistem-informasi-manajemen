const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'bimapratama' });
  const [txs] = await c.query(`
    SELECT 
      t.id,
      t.invoice,
      t.tanggal,
      t.name,
      t.type,
      t.user_id,
      u.name as user_name,
      t.total,
      dt.sub_total
    FROM transaksis t
    JOIN detail_transaksis dt ON dt.transaksi_id = t.id
    LEFT JOIN users u ON u.id = t.user_id
    WHERE dt.kategori_id = 71
    ORDER BY t.tanggal DESC, t.id DESC
    LIMIT 15
  `);
  console.log('Recent Kas Deby transactions in SIM Lama:');
  console.table(txs);
  await c.end();
}

main().catch(console.error);
