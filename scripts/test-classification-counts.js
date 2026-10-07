const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getLandStokCategory(land) {
  const app = (land.aplikasiTerakhir || land.statusAplikasi || '').trim();
  const appLower = app.toLowerCase();

  if (
    app.includes('24.Sls Tanam') ||
    appLower.includes('sls tanam') ||
    appLower.includes('selesai tanam') ||
    land.realSelesaiTanam ||
    land.progressTanam === 100 ||
    land.activities?.some(
      (a) => a.code === '24.SLS_TANAM' && a.realisasiDate && a.realisasiDate !== '-' && a.realisasiDate !== '0'
    )
  ) {
    return 'SELESAI';
  }

  if (
    app.includes('23.Proses Tnm') ||
    appLower.includes('proses tnm') ||
    appLower.includes('proses tanam') ||
    (land.realMulaiTanam && !land.realSelesaiTanam) ||
    land.progressTanam === 50 ||
    land.activities?.some(
      (a) => a.code === '23.PROSES_TNM' && a.realisasiDate && a.realisasiDate !== '-' && a.realisasiDate !== '0'
    )
  ) {
    return 'PROSES';
  }

  if (
    app.includes('22.Siap Tanam') ||
    appLower.includes('siap tanam') ||
    app.includes('22.JALAN & SAL') ||
    appLower.includes('jalan & sal') ||
    appLower.includes('jalan dan sal') ||
    land.activities?.some(
      (a) =>
        (a.code === '22.SIAP_TANAM' || a.code === '22.JALAN_SAL') &&
        a.realisasiDate &&
        a.realisasiDate !== '-' &&
        a.realisasiDate !== '0'
    )
  ) {
    return 'SN';
  }

  const bjkCodes = [
    '11.BAJAK_AWAL',
    '17.SUBSOILER',
    '18.FINISHING_HARROW',
    '19.FINISHING_ROTARY',
    '20.ROTARY_FH2',
    '21.RIDGER',
  ];
  if (
    land.activities?.some(
      (a) => bjkCodes.includes(a.code) && a.realisasiDate && a.realisasiDate !== '-' && a.realisasiDate !== '0'
    )
  ) {
    return 'BJK';
  }

  return 'BK';
}

async function test() {
  const lands = await prisma.land.findMany({
    include: { activities: true }
  });
  console.log('Total lands in DB:', lands.length);
  const catCounts = { BK: 0, BJK: 0, SN: 0, PROSES: 0, SELESAI: 0 };
  lands.forEach(l => {
    const cat = getLandStokCategory(l);
    catCounts[cat]++;
  });
  console.log('Category counts across all DB records:', catCounts);
  await prisma.$disconnect();
}
test().catch(console.error);
