const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== INVESTIGASI OPNAME TELUR 02 NOV 2026 ===\n');

  // 1. Ambil semua opname telur
  const opnames = await prisma.stokOpname.findMany({
    where: {
      jenisOpname: 'TELUR'
    },
    include: {
      barang: {
        include: { satuan: true, jenis: true }
      },
      user: { select: { name: true } },
      jurnal: {
        include: {
          details: {
            include: { kategori: true }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Total opname telur ditemukan: ${opnames.length}`);
  let totalPenguranganNilai = 0;
  let totalKreditKategoriTelur = 0;
  let totalDebitKategoriTelur = 0;

  for (const op of opnames) {
    const selisih = Number(op.stokFisik) - Number(op.stokSistem);
    const satuanName = op.barang.satuan?.name || '';
    console.log(`\nOpname: ${op.nomorOpname} | Barang: ${op.barang.name} | Tgl: ${op.tanggal.toISOString().split('T')[0]}`);
    console.log(`  Sistem: ${op.stokSistem} -> Fisik: ${op.stokFisik} | Selisih: ${selisih} ${satuanName} | HPP: ${op.hpp}`);
    console.log(`  Total Nilai: Rp ${Number(op.totalNilai).toLocaleString('id-ID')} | Petugas: ${op.user.name} | Ket: ${op.keterangan || '-'}`);
    
    if (op.jurnal) {
      console.log(`  Jurnal: ${op.jurnal.nomorJurnal}`);
      for (const d of op.jurnal.details) {
        console.log(`    [${d.kategoriId}] ${d.kategori.name}: Debit=${Number(d.debit).toLocaleString('id-ID')}, Kredit=${Number(d.kredit).toLocaleString('id-ID')}`);
        if (d.kategori.name.toLowerCase().includes('telur')) {
          totalKreditKategoriTelur += Number(d.kredit);
          totalDebitKategoriTelur += Number(d.debit);
        }
      }
    }
    totalPenguranganNilai += Number(op.totalNilai);
  }

  console.log('\n----------------------------------------');
  console.log(`Total Nilai Penyesuaian Opname Telur: Rp ${totalPenguranganNilai.toLocaleString('id-ID')}`);
  console.log(`Total Jurnal Telur: Debit = Rp ${totalDebitKategoriTelur.toLocaleString('id-ID')}, Kredit = Rp ${totalKreditKategoriTelur.toLocaleString('id-ID')}`);
  console.log(`Net Efek ke Akun Telur: Rp ${(totalDebitKategoriTelur - totalKreditKategoriTelur).toLocaleString('id-ID')}`);

  // 2. Cek Saldo Stok Telur Saat Ini di Laporan Aset (Kategori 59)
  const katTelur = await prisma.$queryRaw`
    SELECT 
      k.id, k.name,
      SUM(CASE WHEN dk.type = 'Aset' THEN jd.debit - jd.kredit ELSE jd.kredit - jd.debit END) as saldo_sekarang
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
  const saldoSekarang = Number(katTelur[0]?.saldo_sekarang || 0);
  console.log(`\nSaldo Akun 'Stok Telur' Saat Ini: Rp ${saldoSekarang.toLocaleString('id-ID')}`);
  
  // 3. Simulasi jika opname telur 02 Nov 2026 ditiadakan / di-rollback
  const opnameJurnalIds = opnames.map(o => o.jurnalId).filter(Boolean).map(id => id.toString());
  
  if (opnameJurnalIds.length > 0) {
    const idsSql = opnameJurnalIds.join(',');
    const katTelurWithoutOpnames = await prisma.$queryRawUnsafe(`
      SELECT 
        k.id, k.name,
        SUM(CASE WHEN dk.type = 'Aset' THEN jd.debit - jd.kredit ELSE jd.kredit - jd.debit END) as saldo_simulasi
      FROM detail_kategoris dk
      JOIN kategoris k ON k.detail_kategori_id = dk.id
      LEFT JOIN (
        SELECT jd.kategori_id, jd.debit, jd.kredit
        FROM jurnal_details jd
        JOIN jurnal_umums ju ON ju.id = jd.jurnal_id
        LEFT JOIN transaksis t ON t.id = ju.transaksi_id
        WHERE (t.status IS NULL OR t.status != 'BATAL')
          AND ju.id NOT IN (${idsSql})
      ) jd ON jd.kategori_id = k.id
      WHERE k.name = 'Stok Telur'
      GROUP BY k.id, k.name
    `);
    const saldoSimulasi = Number(katTelurWithoutOpnames[0]?.saldo_simulasi || 0);
    console.log(`Saldo Akun 'Stok Telur' JIKA Opname di-exclude: Rp ${saldoSimulasi.toLocaleString('id-ID')}`);
  }

  // 4. Periksa stok batch telur saat ini
  console.log('\n=== STATUS BATCH TELUR (5 BARANG DENGAN PENURUNAN TERBESAR) ===');
  for (const op of opnames.slice(0, 5)) {
    const barangId = op.barangId;
    const batches = await prisma.stokBatch.findMany({
      where: { barangId },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    console.log(`\nBarang [${op.barang.code || op.barang.id}] ${op.barang.name}:`);
    for (const b of batches) {
      console.log(`   Batch #${b.id} (${b.nomorBatch}): QtyAwal=${b.qtyAwal}, QtySisa=${b.qtySisa}, HPP=${b.hpp}, Tgl=${b.tanggal.toISOString().split('T')[0]}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
