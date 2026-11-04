const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_NOMOR = [
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
  console.log('=== ANALISIS 10 OPNAME TELUR 02 NOV 2026 ===\n');

  const opnames = await prisma.stokOpname.findMany({
    where: {
      nomorOpname: { in: TARGET_NOMOR }
    },
    include: {
      barang: { include: { satuan: true } },
      user: true,
      jurnal: {
        include: {
          details: {
            include: { kategori: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Ditemukan ${opnames.length} opname sesuai screenshot:`);
  let totalPenguranganStokTelur = 0;
  let totalPenambahanStokTelur = 0;

  for (const op of opnames) {
    const selisih = Number(op.stokFisik) - Number(op.stokSistem);
    console.log(`- ${op.nomorOpname} | ${op.barang.name}: Sistem ${op.stokSistem} -> Fisik ${op.stokFisik} (${selisih} ${op.barang.satuan?.name})`);
    
    if (op.jurnal) {
      for (const d of op.jurnal.details) {
        if (d.kategori.name.toLowerCase().includes('telur')) {
          if (Number(d.kredit) > 0) {
            console.log(`    Kredit Akun Telur: Rp ${Number(d.kredit).toLocaleString('id-ID')}`);
            totalPenguranganStokTelur += Number(d.kredit);
          }
          if (Number(d.debit) > 0) {
            console.log(`    Debit Akun Telur: Rp ${Number(d.debit).toLocaleString('id-ID')}`);
            totalPenambahanStokTelur += Number(d.debit);
          }
        }
      }
    }
  }

  const netDampak = totalPenambahanStokTelur - totalPenguranganStokTelur;
  console.log('\n----------------------------------------------');
  console.log(`Total Kredit (Pengurangan) Akun Telur: Rp ${totalPenguranganStokTelur.toLocaleString('id-ID')}`);
  console.log(`Total Debit (Penambahan) Akun Telur   : Rp ${totalPenambahanStokTelur.toLocaleString('id-ID')}`);
  console.log(`Net Dampak 10 Opname ke Aset Telur   : Rp ${netDampak.toLocaleString('id-ID')}`);

  // Hitung saldo aset sekarang vs tanpa 10 opname ini
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

  const jurnalIds = opnames.map(o => o.jurnalId).filter(Boolean).map(id => id.toString());
  const katTelurSimulasi = await prisma.$queryRawUnsafe(`
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
        AND ju.id NOT IN (${jurnalIds.join(',')})
    ) jd ON jd.kategori_id = k.id
    WHERE k.name = 'Stok Telur'
    GROUP BY k.id, k.name
  `);
  const saldoSimulasi = Number(katTelurSimulasi[0]?.saldo_simulasi || 0);

  console.log(`\n================ HASIL PEMBUKTIAN ================`);
  console.log(`Saldo Laporan Aset (Stok Telur) SEKARANG: Rp ${saldoSekarang.toLocaleString('id-ID')}`);
  console.log(`Net Pengurangan dari 10 Opname ini     : Rp ${netDampak.toLocaleString('id-ID')}`);
  console.log(`Saldo Laporan Aset (Stok Telur) JIKA 10 OPNAME INI DICABUT: Rp ${saldoSimulasi.toLocaleString('id-ID')}`);
  console.log(`==================================================`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
