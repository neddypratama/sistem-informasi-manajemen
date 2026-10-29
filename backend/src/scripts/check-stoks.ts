import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bimapratama_v2',
  });

  const [telurs] = await conn.query(
    "SELECT b.id, b.name, j.name as jname, " +
    "(SELECT COUNT(*) FROM stok_batches sb WHERE sb.barang_id = b.id) as batch_count, " +
    "(SELECT MAX(harga_beli) FROM stok_batches sb WHERE sb.barang_id = b.id AND sb.harga_beli > 0) as max_hpp " +
    "FROM barangs b JOIN jenis_barangs j ON b.jenis_id = j.id WHERE j.name LIKE '%Telur%' AND b.id IN (SELECT DISTINCT barang_id FROM stok_batches WHERE harga_beli > 0) LIMIT 5"
  );
  console.log('Telur with batches:', telurs);

  await conn.end();
}

main().catch(console.error);

