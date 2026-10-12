const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { parseDateToMonth } = require('../lib/stageStockCalculator');

const prisma = new PrismaClient();

async function run() {
  const lands = await prisma.land.findMany({
    where: { year: 2026 },
    select: {
      id: true,
      lokasi: true,
      luasNetto: true,
      realBkr: true,
      realBajak: true,
      bulanSn: true,
      rencBkr: true,
      rencBajak: true,
      aplikasiDetails: true,
    },
    orderBy: { lokasi: 'asc' },
  });

  console.log(`Found ${lands.length} lands in DB for 2026.`);

  const result = {};

  for (const land of lands) {
    const lok = land.lokasi.trim();
    const details = (typeof land.aplikasiDetails === 'object' && land.aplikasiDetails !== null) ? land.aplikasiDetails : {};

    const effectiveRealBkr = land.realBkr || details.realChopper || details.realRh1 || null;
    const effectiveRealBajak =
      land.realBajak ||
      details.realBajak ||
      details.realBajakAwalMb5Btr ||
      details.realBajakAwalMb25 ||
      details.realBajakAwalHoward ||
      details.realBajakAwalNardi ||
      details.realHrEksMb ||
      null;
    const effectiveRealSn = land.bulanSn || details.realSiapTanam || null;

    const baseRealBkrMonth = parseDateToMonth(effectiveRealBkr, 2026);
    const baseRealBajakMonth = parseDateToMonth(effectiveRealBajak, 2026);
    const baseRealSnMonth = parseDateToMonth(effectiveRealSn, 2026);

    result[lok] = {
      netto: Number(land.luasNetto) || 0,
      baseRealBkr: effectiveRealBkr,
      baseRealBajak: effectiveRealBajak,
      baseBulanSn: effectiveRealSn,
      baseRealBkrMonth,
      baseRealBajakMonth,
      baseRealSnMonth,
      rencBkr: land.rencBkr,
      rencBajak: land.rencBajak,
    };
  }

  const outPath = path.join(__dirname, '..', 'lib', 'lands2026Baselines.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Successfully generated ${Object.keys(result).length} lands in ${outPath}`);
  console.log('003D Baseline Snapshot:', result['003D']);

  await prisma.$disconnect();
}

run().catch(console.error);
