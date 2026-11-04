const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Target opname IDs to rollback
  // 6403: Horen SB (-7635)
  // 6404: Puyuh DM (-4091.79)
  // 6405: Puyuh Second (-45)
  // 6406: Puyuh Tutup (-20)
  // 6409: Tray Asin (-934.27)
  // 6411: Horen DM (-7558)
  // 6412: Horen Cempaka (-249)
  // 6415: KK (-2152.48)
  // 6416: Horen Jordan (-3226)
  const targetOpnameIds = [6403n, 6404n, 6405n, 6406n, 6409n, 6411n, 6412n, 6415n, 6416n];

  console.log(`Starting safe rollback for ${targetOpnameIds.length} Tray Opnames...`);

  await prisma.$transaction(async (tx) => {
    // 1. Fetch opname records
    const opnames = await tx.stokOpname.findMany({
      where: { id: { in: targetOpnameIds } },
      include: {
        barang: true,
        jurnal: { include: { details: true } }
      }
    });

    console.log(`Found ${opnames.length} opnames to rollback.`);
    const jurnalIds = opnames.map(o => o.jurnalId).filter(Boolean);
    console.log(`Associated Jurnal IDs (${jurnalIds.length}):`, jurnalIds);

    // 2. Delete Jurnal Details
    if (jurnalIds.length > 0) {
      const delDetails = await tx.jurnalDetail.deleteMany({
        where: { jurnalId: { in: jurnalIds } }
      });
      console.log(`Deleted ${delDetails.count} rows from jurnal_details.`);

      // 3. Delete Jurnal Umums
      const delJurnals = await tx.jurnalUmum.deleteMany({
        where: { id: { in: jurnalIds } }
      });
      console.log(`Deleted ${delJurnals.count} rows from jurnal_umums.`);
    }

    // 4. Delete the Stok Opname records
    const delOpnames = await tx.stokOpname.deleteMany({
      where: { id: { in: targetOpnameIds } }
    });
    console.log(`Deleted ${delOpnames.count} rows from stok_opnames.`);

    // 5. Check Saldo Kat 62 (Stok Tray) immediately
    const checkSaldo = await tx.$queryRaw`
      SELECT 
        SUM(jd.debit) as total_debit,
        SUM(jd.kredit) as total_kredit,
        SUM(jd.debit - jd.kredit) as saldo_aset
      FROM jurnal_details jd
      WHERE jd.kategori_id = 62
    `;
    console.log("New Saldo Kat 62 (Stok Tray) in Jurnal:", checkSaldo);
  });

  console.log("Safe rollback completed successfully!");
}

main()
  .catch((e) => {
    console.error("Rollback failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
