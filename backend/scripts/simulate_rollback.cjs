const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const trayOpnameIds = [6403n, 6404n, 6409n, 6411n, 6415n, 6416n];
  const opnames = await prisma.stokOpname.findMany({
    where: { id: { in: trayOpnameIds } }
  });
  const jurnalIds = opnames.map(o => o.jurnalId).filter(Boolean);

  console.log("Opname IDs:", trayOpnameIds);
  console.log("Jurnal IDs to remove:", jurnalIds);

  // Calculate current saldo of Kat 62 (Stok Tray)
  const currentSaldo = await prisma.$queryRaw`
    SELECT 
      SUM(jd.debit) as deb,
      SUM(jd.kredit) as kre,
      SUM(jd.debit - jd.kredit) as net
    FROM jurnal_details jd
    WHERE jd.kategori_id = 62
  `;
  console.log("Current Saldo Kat 62 (Tray):", currentSaldo);

  // Calculate saldo of Kat 62 WITHOUT these 6 opname journals
  const withoutOpname = await prisma.$queryRaw`
    SELECT 
      SUM(jd.debit) as deb,
      SUM(jd.kredit) as kre,
      SUM(jd.debit - jd.kredit) as net
    FROM jurnal_details jd
    WHERE jd.kategori_id = 62
      AND jd.jurnal_id NOT IN (${Prisma.join(jurnalIds)})
  `;
  console.log("Saldo Kat 62 (Tray) AFTER deleting 6 opnames:", withoutOpname);

  // Check Beban Penyesuaian Stok (Kat 88)
  const kat88Current = await prisma.$queryRaw`
    SELECT 
      SUM(jd.debit) as deb,
      SUM(jd.kredit) as kre,
      SUM(jd.debit - jd.kredit) as net
    FROM jurnal_details jd
    WHERE jd.kategori_id = 88
  `;
  const kat88After = await prisma.$queryRaw`
    SELECT 
      SUM(jd.debit) as deb,
      SUM(jd.kredit) as kre,
      SUM(jd.debit - jd.kredit) as net
    FROM jurnal_details jd
    WHERE jd.kategori_id = 88
      AND jd.jurnal_id NOT IN (${Prisma.join(jurnalIds)})
  `;
  console.log("Kat 88 (Penyesuaian Stok) current:", kat88Current);
  console.log("Kat 88 (Penyesuaian Stok) after:", kat88After);
}

main().finally(() => prisma.$disconnect());
