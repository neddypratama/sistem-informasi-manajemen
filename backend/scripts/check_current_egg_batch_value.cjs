const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== NILAI FISIK BATCH TELUR SAAT INI ===");

  const eggBatches = await prisma.stokBatch.findMany({
    where: {
      barang: {
        jenis: {
          name: { contains: 'Telur' }
        }
      },
      qtySisa: { gt: 0 }
    },
    include: {
      barang: true
    }
  });

  let totalNilaiFisik = 0;
  const perBarang = {};

  for (const b of eggBatches) {
    const nilai = Number(b.qtySisa) * Number(b.hargaBeli);
    totalNilaiFisik += nilai;
    if (!perBarang[b.barang.name]) {
      perBarang[b.barang.name] = { qty: 0, nilai: 0 };
    }
    perBarang[b.barang.name].qty += Number(b.qtySisa);
    perBarang[b.barang.name].nilai += nilai;
  }

  console.log("Rincian per Telur:");
  for (const [name, data] of Object.entries(perBarang)) {
    console.log(`- ${name}: Sisa Qty = ${data.qty.toLocaleString('id-ID')}, Total Nilai = Rp ${data.nilai.toLocaleString('id-ID')}`);
  }

  console.log(`\nTOTAL NILAI FISIK SEMUA BATCH TELUR SAAT INI: Rp ${totalNilaiFisik.toLocaleString('id-ID')}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
