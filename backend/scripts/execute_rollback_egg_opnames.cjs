const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_OPNAMES = [
  'OPN-20261102-TLR-EXSB',
  'OPN-20261102-TLR-T228',
  'OPN-20261102-TLR-OPMB',
  'OPN-20261102-TLR-MI7R',
  'OPN-20261102-TLR-KB75',
  'OPN-20261102-TLR-SJAT',
  'OPN-20261102-TLR-6ORE',
  'OPN-20261102-TLR-27AY',
  'OPN-20261102-TLR-6Z6B',
  'OPN-20261102-TLR-N79V'
];

async function main() {
  console.log('=== MEMULAI SAFE ROLLBACK 10 OPNAME TELUR 02 NOV 2026 ===\n');

  const opnames = await prisma.stokOpname.findMany({
    where: { nomorOpname: { in: TARGET_OPNAMES } },
    include: {
      jurnal: { include: { details: true } },
      barang: true
    }
  });

  console.log(`Ditemukan ${opnames.length} opname untuk di-rollback.`);
  const opnameIds = opnames.map(o => o.id);
  const jurnalIds = opnames.map(o => o.jurnalId).filter(Boolean);

  console.log(`Opname IDs:`, opnameIds.map(id => id.toString()));
  console.log(`Jurnal IDs:`, jurnalIds.map(id => id.toString()));

  await prisma.$transaction(async (tx) => {
    // 1. Hapus Jurnal Details
    if (jurnalIds.length > 0) {
      const delDetails = await tx.jurnalDetail.deleteMany({
        where: { jurnalId: { in: jurnalIds } }
      });
      console.log(`✓ Berhasil menghapus ${delDetails.count} baris jurnal_details.`);

      // 2. Hapus Jurnal Umums
      const delJurnals = await tx.jurnalUmum.deleteMany({
        where: { id: { in: jurnalIds } }
      });
      console.log(`✓ Berhasil menghapus ${delJurnals.count} baris jurnal_umums.`);
    }

    // 3. Hapus batch tambahan yang dibuat oleh opname BK (+691) jika ada
    const delBatches = await tx.stokBatch.deleteMany({
      where: {
        barangId: 2n,
        detailTransaksiId: null,
        qtyMasuk: 691,
        qtySisa: 691
      }
    });
    console.log(`✓ Berhasil menghapus ${delBatches.count} batch tambahan dari opname BK.`);

    // 4. Hapus data Stok Opname
    const delOpnames = await tx.stokOpname.deleteMany({
      where: { id: { in: opnameIds } }
    });
    console.log(`✓ Berhasil menghapus ${delOpnames.count} data stok_opnames.`);

    // 5. Cek Saldo Baru Stok Telur (Kategori 59)
    const katTelur = await tx.$queryRaw`
      SELECT 
        k.id, k.name,
        SUM(CASE WHEN dk.type = 'Aset' THEN jd.debit - jd.kredit ELSE jd.kredit - jd.debit END) as saldo_baru
      FROM detail_kategoris dk
      JOIN kategoris k ON k.detail_kategori_id = dk.id
      LEFT JOIN (
        SELECT jd.kategori_id, jd.debit, jd.kredit
        FROM jurnal_details jd
        JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
        LEFT JOIN transaksis t ON t.id = ju.transaksi_id
        WHERE (t.status IS NULL OR t.status != 'BATAL')
      ) jd ON jd.kategori_id = k.id
      WHERE k.name = 'Stok Telur'
      GROUP BY k.id, k.name
    `;

    console.log('\n================ HASIL ROLLBACK ================');
    console.log(`Saldo Akun Stok Telur di Laporan Aset SEKARANG: Rp ${Number(katTelur[0]?.saldo_baru || 0).toLocaleString('id-ID')}`);
    console.log('================================================');
  });

  console.log('\nSafe Rollback 10 Opname Telur SELESAI DENGAN SUKSES!');
}

main().catch(err => {
  console.error("Rollback error:", err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
