const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const query = `
    SELECT 
      b.id,
      b.code,
      b.name,
      j.name as jenis_name,
      s.name as satuan_name,
      b.is_active,
      (SELECT COALESCE(SUM(sb_old.qty_sisa), 0) FROM bimapratama.stok_batches sb_old WHERE sb_old.barang_id = b.id) AS old_stok,
      (SELECT COALESCE(SUM(sb_new.qty_sisa), 0) FROM bimapratama_v2.stok_batches sb_new WHERE sb_new.barang_id = b.id) AS new_stok
    FROM bimapratama_v2.barangs b
    LEFT JOIN bimapratama_v2.jenis_barangs j ON b.jenis_id = j.id
    LEFT JOIN bimapratama_v2.satuans s ON b.satuan_id = s.id
    ORDER BY j.name ASC, b.name ASC
  `;

  const rows = await prisma.$queryRawUnsafe(query);

  const categories = {};
  for (const r of rows) {
    const cat = r.jenis_name || 'Lainnya';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({
      id: Number(r.id),
      code: r.code,
      name: r.name,
      satuan: r.satuan_name || '-',
      stok: Number(r.new_stok),
      old_stok: Number(r.old_stok),
      is_match: Math.abs(Number(r.new_stok) - Number(r.old_stok)) < 0.001,
    });
  }

  console.log(`TOTAL BARANG DIPERIKSA: ${rows.length}\n`);
  for (const [cat, items] of Object.entries(categories)) {
    console.log(`=== ${cat.toUpperCase()} (${items.length} Barang) ===`);
    const totalStok = items.reduce((s, it) => s + it.stok, 0);
    console.log(`Total Stok Kategori: ${totalStok.toLocaleString('id-ID')}`);
    console.table(items.map(it => ({
      ID: it.id,
      Kode: it.code,
      Nama: it.name,
      Satuan: it.satuan,
      'Stok Lama': it.old_stok,
      'Stok Baru': it.stok,
      Status: it.is_match ? '✅ MATCH' : '❌ MISMATCH'
    })));
    console.log('\n');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
