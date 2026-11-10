const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pakPri = await prisma.client.findFirst({
    where: { name: { contains: 'Supriyadi' } }
  });

  console.log('Current Pak Pri in clients table:');
  console.log('saldoHutang:', pakPri.saldoHutang);
  console.log('saldoPiutang:', pakPri.saldoPiutang);

  // Transactions for Pak Pri AFTER 2026-10-31
  const txAfterOct31 = await prisma.transaksi.findMany({
    where: {
      clientId: pakPri.id,
      status: 'SELESAI',
      tanggal: { gt: new Date('2026-10-31 23:59:59') }
    },
    include: { details: { include: { kategori: true } } }
  });

  console.log('\nTransactions for Pak Pri AFTER 31 Oct 2026:', txAfterOct31.length);
  for (const t of txAfterOct31) {
    console.log(`- [${t.tanggal.toISOString().slice(0, 10)}] ${t.invoice} ${t.type} (${t.paymentMethod}) Total: Rp ${Number(t.total).toLocaleString('id-ID')}`);
    for (const d of t.details) {
      console.log(`    kat: ${d.kategori?.name} (id: ${d.kategoriId}), subtotal: Rp ${Number(d.subtotal).toLocaleString('id-ID')}`);
    }
  }

  // Also check all transactions after 31 Oct in entire system
  const countAfter = await prisma.transaksi.count({
    where: { tanggal: { gt: new Date('2026-10-31 23:59:59') }, status: 'SELESAI' }
  });
  console.log('\nTotal transactions in system after 31 Oct 2026:', countAfter);
}

main().catch(console.error).finally(() => prisma.$disconnect());
