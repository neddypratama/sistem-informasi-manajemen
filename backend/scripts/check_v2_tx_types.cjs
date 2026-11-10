const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.$queryRaw`
    SELECT type, payment_method, COUNT(*) as count, SUM(total) as sum_total
    FROM transaksis
    GROUP BY type, payment_method
  `;
  console.log("Transaction types & payment methods in V2:", types);

  // Cek transaksi Bp.Supriyadi di transaksis V2
  const supriTxs = await prisma.transaksi.findMany({
    where: { clientId: 241n },
    select: {
      id: true,
      invoice: true,
      tanggal: true,
      type: true,
      paymentMethod: true,
      total: true,
      status: true,
    },
    take: 20
  });
  console.log("Transaksi Bp.Supriyadi di V2 (sample 20):", supriTxs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
