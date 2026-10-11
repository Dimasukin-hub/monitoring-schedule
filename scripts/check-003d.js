const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const land = await prisma.land.findFirst({
    where: { lokasi: { equals: '003d', mode: 'insensitive' } },
    include: { activities: true }
  });
  console.log('DB Land 003d:', {
    id: land?.id,
    lokasi: land?.lokasi,
    wilayah: land?.wilayah,
    luasNetto: land?.luasNetto,
    status: land?.status,
    aplikasiTerakhir: land?.aplikasiTerakhir,
    realBkr: land?.realBkr,
    realBajak: land?.realBajak,
    bulanSn: land?.bulanSn,
  });
  if (land) {
    console.log('Activities:');
    land.activities.forEach(a => {
      console.log(`  ${a.code} [${a.name}]: renc=${a.rencanaDate}, real=${a.realisasiDate}, st=${a.status}`);
    });
  }

  const stokMaster = await prisma.stokLahanMaster.findFirst({
    where: { lokasi: { equals: '003d', mode: 'insensitive' } },
  });
  console.log('StokLahanMaster 003d:', stokMaster);
}

main().catch(console.error).finally(() => prisma.$disconnect());
