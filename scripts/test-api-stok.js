const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getLandStokCategory } = require('../lib/landClassification');

async function test() {
  const lands = await prisma.land.findMany({
    select: {
      id: true,
      lokasi: true,
      wilayah: true,
      luasBruto: true,
      luasNetto: true,
      status: true,
      eks: true,
      sejarah: true,
      phBk: true,
      phSn: true,
      aplikasiTerakhir: true,
      statusAplikasi: true,
      realMulaiTanam: true,
      realSelesaiTanam: true,
      progressTanam: true,
      activities: { select: { code: true, status: true, realisasiDate: true } },
    },
    take: 10,
    orderBy: { lokasi: 'asc' },
  });

  console.log('Sample 5 lands in Stok:');
  for (const l of lands.slice(0, 5)) {
    const cat = getLandStokCategory(l);
    console.log({
      lokasi: l.lokasi,
      wilayah: l.wilayah,
      bruto: l.luasBruto,
      netto: l.luasNetto,
      status: l.status,
      eks: l.eks,
      sejarah: l.sejarah,
      phBk: l.phBk,
      phSn: l.phSn,
      cat,
    });
  }

  // Count by category
  const allLands = await prisma.land.findMany({
    select: {
      aplikasiTerakhir: true,
      statusAplikasi: true,
      realMulaiTanam: true,
      realSelesaiTanam: true,
      progressTanam: true,
      luasNetto: true,
      activities: { select: { code: true, status: true, realisasiDate: true } },
    },
  });

  const catCounts = { BK: 0, BJK: 0, SN: 0, PROSES: 0, SELESAI: 0 };
  const catNetto = { BK: 0, BJK: 0, SN: 0, PROSES: 0, SELESAI: 0 };

  for (const l of allLands) {
    const c = getLandStokCategory(l);
    catCounts[c]++;
    catNetto[c] += l.luasNetto || 0;
  }

  console.log('\nCategory Statistics in DB:');
  for (const k of ['BK', 'BJK', 'SN', 'PROSES', 'SELESAI']) {
    console.log(`  ${k}: ${catCounts[k]} petak (${catNetto[k].toFixed(2)} Ha)`);
  }

  await prisma.$disconnect();
}

test().catch(console.error);
