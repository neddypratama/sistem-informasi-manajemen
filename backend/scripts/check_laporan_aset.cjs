const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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
    ) jd ON jd.kategori_id = k.id
    WHERE dk.type IN ('Aset', 'Liabilitas')
      AND k.name != 'Penyesuaian Stok'
    GROUP BY k.id, k.name, k.code, dk.id, dk.name, dk.type
    ORDER BY dk.id, k.id
  `;

  console.log("=== KATEGORI DENGAN SALDO NEGATIF ATAU TERKAIT TRAY ===");
  for (const r of nonClientRows) {
    const s = Number(r.saldo);
    if (s < 0 || r.kategori_name.toLowerCase().includes('tray') || r.group_name.toLowerCase().includes('tray') || r.group_name.toLowerCase().includes('persediaan') || r.group_name.toLowerCase().includes('stok')) {
      console.log(`[${r.group_name}] (Kat ${r.kategori_id}) ${r.kategori_name}: Rp ${s.toLocaleString('id-ID')}`);
    }
  }

  // Also check old db bimapratama for same query
  console.log("\n=== OLD DB BIMAPRATAMA SAMA QUERY ===");
  const oldRows = await prisma.$queryRawUnsafe(`
    SELECT 
      k.id as kategori_id,
      k.name as kategori_name,
      dk.name as group_name,
      COALESCE(
        SUM(
          CASE 
            WHEN dk.type = 'Aset' THEN jd.debit - jd.kredit
            ELSE jd.kredit - jd.debit
          END
        ), 0
      ) as saldo
    FROM bimapratama.detail_kategoris dk
    JOIN bimapratama.kategoris k ON k.detail_kategori_id = dk.id
    LEFT JOIN (
      SELECT jd.kategori_id, jd.debit, jd.kredit
      FROM bimapratama.jurnal_details jd
      JOIN bimapratama.jurnal_umums ju ON ju.id = jd.jurnal_id
      LEFT JOIN bimapratama.transaksis t ON t.id = ju.transaksi_id
      WHERE (t.status IS NULL OR t.status != 'BATAL')
    ) jd ON jd.kategori_id = k.id
    WHERE dk.type IN ('Aset', 'Liabilitas')
      AND k.name != 'Penyesuaian Stok'
    GROUP BY k.id, k.name, dk.id, dk.name, dk.type
    ORDER BY dk.id, k.id
  `);

  for (const r of oldRows) {
    const s = Number(r.saldo);
    if (s < 0 || r.kategori_name.toLowerCase().includes('tray') || r.group_name.toLowerCase().includes('tray') || r.group_name.toLowerCase().includes('persediaan') || r.group_name.toLowerCase().includes('stok')) {
      console.log(`[OLD] [${r.group_name}] (Kat ${r.kategori_id}) ${r.kategori_name}: Rp ${s.toLocaleString('id-ID')}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
