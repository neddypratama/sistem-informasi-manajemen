const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'bimapratama' });
  const [nov] = await c.query('SELECT COUNT(*) as cnt, MIN(tanggal) as min_tgl, MAX(tanggal) as max_tgl FROM transaksis WHERE tanggal >= "2026-11-01"');
  console.log('SIM Lama transactions in November 2026:', nov);
  
  const [allNovTxs] = await c.query('SELECT t.id, t.invoice, t.tanggal, t.type, t.total FROM transaksis t WHERE t.tanggal >= "2026-11-01" ORDER BY t.tanggal DESC LIMIT 20');
  console.log('Sample SIM Lama November transactions:', allNovTxs);

  const [debyNov] = await c.query('SELECT dt.*, t.tanggal FROM detail_transaksis dt JOIN transaksis t ON t.id = dt.transaksi_id WHERE dt.kategori_id = 71 AND t.tanggal >= "2026-11-01"');
  console.log('SIM Lama Kas Deby transactions in November 2026:', debyNov);

  // Also check if there is another table in SIM Lama for Kas or Kasbon or something
  const [tables] = await c.query('SHOW TABLES');
  console.log('Tables in SIM Lama:', tables.map(t => Object.values(t)[0]));

  await c.end();
}

main().catch(console.error);
