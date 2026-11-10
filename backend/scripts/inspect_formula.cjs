const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pakPri = await prisma.client.findFirst({
    where: { name: { contains: 'Supriyadi' } }
  });

  // Check all transaksis for Pak Pri
  const txs = await prisma.transaksi.findMany({
    where: { clientId: pakPri.id, status: 'SELESAI' },
    select: {
      id: true,
      invoice: true,
      type: true,
      tanggal: true,
      paymentMethod: true,
      total: true
    }
  });

  console.log('Total tx count for Pak Pri:', txs.length);

  // Group by type
  let sumBeli = 0;
  let sumJual = 0;
  let sumKasMasuk = 0;
  let sumKasKeluar = 0;
  let sumReturBeli = 0;
  let sumReturJual = 0;

  for (const t of txs) {
    const tot = Number(t.total);
    if (t.type === 'PEMBELIAN') sumBeli += tot;
    else if (t.type === 'PENJUALAN') sumJual += tot;
    else if (t.type === 'KAS_MASUK') sumKasMasuk += tot;
    else if (t.type === 'KAS_KELUAR') sumKasKeluar += tot;
    else if (t.type === 'RETUR_PEMBELIAN') sumReturBeli += tot;
    else if (t.type === 'RETUR_PENJUALAN') sumReturJual += tot;
  }

  console.log({
    sumBeli,
    sumJual,
    sumKasMasuk,
    sumKasKeluar,
    sumReturBeli,
    sumReturJual
  });

  console.log('Test 1: sumBeli - sumReturBeli + sumKasMasuk - sumKasKeluar =', (sumBeli - sumReturBeli + sumKasMasuk - sumKasKeluar));
  console.log('Test 2: sumBeli - sumReturBeli - (sumKasKeluar - sumKasMasuk) =', (sumBeli - sumReturBeli - (sumKasKeluar - sumKasMasuk)));
  console.log('Current saldoHutang in DB =', pakPri.saldoHutang);

  // Let's check how migration script calculated it from sourceConn!
  // In migration.service.ts line 775:
  // SELECT t.client_id, SUM(CASE WHEN LOWER(t.type) = 'kredit' THEN dt.sub_total ELSE -dt.sub_total END) as total_hutang
  // FROM transaksis t JOIN detail_transaksis dt ON dt.transaksi_id = t.id JOIN kategoris k ON k.id = dt.kategori_id
  // WHERE k.name LIKE 'Hutang%' AND t.client_id IS NOT NULL AND LOWER(t.status) = 'selesai'
  // Let's run that exact query on v2 database!

  const aggHutang = await prisma.$queryRaw`
    SELECT 
      SUM(CASE WHEN LOWER(t.type) IN ('kredit', 'pembelian', 'kas_masuk') THEN dt.subtotal ELSE -dt.subtotal END) as v1,
      SUM(CASE WHEN k.name LIKE 'Hutang%' OR k.name LIKE 'Saldo%' THEN 
        CASE WHEN t.type IN ('PEMBELIAN', 'KAS_MASUK') THEN dt.subtotal ELSE -dt.subtotal END
      ELSE 0 END) as v2
    FROM transaksis t
    JOIN detail_transaksis dt ON dt.transaksi_id = t.id
    JOIN kategoris k ON k.id = dt.kategori_id
    WHERE t.client_id = ${pakPri.id} AND t.status = 'SELESAI'
  `;
  console.log('Agg hutang queries on dt:', aggHutang);

  // Let's check all dt for pak pri where k.name LIKE '%Hutang%' or '%Saldo%' or '%Supplier%'
  const katDtls = await prisma.$queryRaw`
    SELECT 
      t.type,
      k.name as kat_name,
      SUM(dt.subtotal) as subtotal
    FROM transaksis t
    JOIN detail_transaksis dt ON dt.transaksi_id = t.id
    JOIN kategoris k ON k.id = dt.kategori_id
    WHERE t.client_id = ${pakPri.id} AND t.status = 'SELESAI'
    GROUP BY t.type, k.name
  `;
  console.log('Kat details for pak pri:');
  console.table(katDtls);
}

main().catch(console.error).finally(() => prisma.$disconnect());
