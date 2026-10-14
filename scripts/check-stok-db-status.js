const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  const stokMasterCount = await prisma.stokLahanMaster.count();
  const landCount = await prisma.land.count();

  console.log('--- DATABASE STATUS ---');
  console.log('Total StokLahanMaster:', stokMasterCount);
  console.log('Total Land:', landCount);

  // Periksa kategori di StokLahanMaster
  const categories = await prisma.stokLahanMaster.groupBy({
    by: ['category'],
    _count: { id: true },
    _sum: { luasNetto: true }
  });
  console.log('\n--- StokLahanMaster by Category ---');
  console.log(categories);

  // Periksa keberadaan data realBkr, realBajak, realSn di StokLahanMaster
  const sampleBkr = await prisma.stokLahanMaster.findMany({
    where: { category: 'BK' },
    select: { lokasi: true, wilayah: true, realBkr: true, realBajak: true, realSn: true, aplikasiTerakhir: true },
    take: 5
  });
  console.log('\n--- Sample BK in StokLahanMaster ---');
  console.log(sampleBkr);

  const sampleBjk = await prisma.stokLahanMaster.findMany({
    where: { category: 'BJK' },
    select: { lokasi: true, wilayah: true, realBkr: true, realBajak: true, realSn: true, aplikasiTerakhir: true },
    take: 5
  });
  console.log('\n--- Sample BJK in StokLahanMaster ---');
  console.log(sampleBjk);

  const sampleSn = await prisma.stokLahanMaster.findMany({
    where: { category: 'SN' },
    select: { lokasi: true, wilayah: true, realBkr: true, realBajak: true, realSn: true, aplikasiTerakhir: true },
    take: 5
  });
  console.log('\n--- Sample SN in StokLahanMaster ---');
  console.log(sampleSn);

  // Periksa tahun di tabel Land
  const landYears = await prisma.land.groupBy({
    by: ['year'],
    _count: { id: true }
  });
  console.log('\n--- Land by Year ---');
  console.log(landYears);

  // Cek apakah ada record di StokLahanMaster dengan realBkr !== null
  const bkrFilled = await prisma.stokLahanMaster.count({
    where: { realBkr: { not: null } }
  });
  const bjkFilled = await prisma.stokLahanMaster.count({
    where: { realBajak: { not: null } }
  });
  const snFilled = await prisma.stokLahanMaster.count({
    where: { realSn: { not: null } }
  });
  console.log('\n--- Date Fields Filled in StokLahanMaster ---');
  console.log({ bkrFilled, bjkFilled, snFilled });

  await prisma.$disconnect();
}

checkDb().catch(console.error);
