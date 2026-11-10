const mysql = require('mysql2/promise');

async function main() {
  const c = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'bimapratama' });
  const [users] = await c.query('SELECT id, name, email FROM users');
  console.log('SIM Lama users:');
  console.table(users);
  await c.end();
}

main().catch(console.error);
