const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- RESTORING PLANTING MASTER TO OPTION 2 (10 LOKASI PROSES, 22.24 HA) ---');

  // Update 002A2
  await prisma.planting.updateMany({
    where: { lokasi: '002A2' },
    data: {
      luas: 6.02,
      realTanam: 5.69,
      sisa: 0.33,
      progress: 95.0,
      status: 'PROSES',
      awalTanam: '6-Sep-26',
      estSelesai: '23-Sep-26',
    },
  });

  // Update 078I
  await prisma.planting.updateMany({
    where: { lokasi: '078I' },
    data: {
      luas: 4.88,
      realTanam: 4.25,
      sisa: 0.63,
      progress: 87.1,
      status: 'PROSES',
      awalTanam: '11-Sep-26',
      estSelesai: '23-Sep-26',
    },
  });

  // Update 024B
  await prisma.planting.updateMany({
    where: { lokasi: '024B' },
    data: {
      luas: 8.76,
      realTanam: 7.11,
      sisa: 1.65,
      progress: 81.2,
      status: 'PROSES',
      awalTanam: '16-Sep-26',
      estSelesai: '28-Sep-26',
    },
  });

  // Update 002B2
  await prisma.planting.updateMany({
    where: { lokasi: '002B2' },
    data: {
      luas: 10.01,
      realTanam: 0.29,
      sisa: 9.72,
      progress: 2.9,
      status: 'PROSES',
      awalTanam: '19-Sep-26',
      estSelesai: '7-Nov-26',
    },
  });

  // Verify all 10 PROSES locations
  const prosesRows = await prisma.planting.findMany({
    where: { status: 'PROSES' },
    orderBy: { progress: 'desc' },
  });

  console.log(`Verified ${prosesRows.length} PROSES locations in Planting:`);
  let totSisa = 0;
  prosesRows.forEach((r, idx) => {
    const sisa = Math.max(0, (r.luas || 0) - (r.realTanam || 0));
    totSisa += sisa;
    console.log(`${idx + 1}. [${r.lokasi}] Luas: ${r.luas} | Real: ${r.realTanam} | Sisa: ${r.sisa} (calc: ${sisa.toFixed(2)}) | Prog: ${r.progress}% | Est: ${r.estSelesai}`);
  });

  console.log(`Total Sisa Proses: ${totSisa.toFixed(2)} Ha`);

  const selesaiCount = await prisma.planting.count({ where: { status: 'SELESAI' } });
  console.log(`Total SELESAI count: ${selesaiCount}`);
  console.log(`Total Grand (Proses + Selesai): ${prosesRows.length + selesaiCount}`);
}

main().finally(() => prisma.$disconnect());
