const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const plantings = await prisma.planting.findMany({
    select: { lokasi: true, status: true, jenisBibit: true, kelasBibit: true, realTanam: true }
  });
  const details = await prisma.plantingDetail.findMany({
    select: { lokasi: true, jenisBibit: true, besar: true, sedang: true, kecil: true, extraKecil: true, standar: true, total: true }
  });

  const detailMap = new Map();
  for (const d of details) {
    const loc = d.lokasi.trim().toUpperCase();
    if (!detailMap.has(loc)) detailMap.set(loc, []);
    detailMap.get(loc).push(d);
  }

  let hasDetail = 0;
  let noDetail = 0;
  let noDetailByStatus = {};

  for (const p of plantings) {
    const loc = p.lokasi.trim().toUpperCase();
    if (detailMap.has(loc)) {
      hasDetail++;
    } else {
      noDetail++;
      noDetailByStatus[p.status] = (noDetailByStatus[p.status] || 0) + 1;
    }
  }

  console.log('Plantings with detail rows in DB:', hasDetail);
  console.log('Plantings WITHOUT detail rows in DB:', noDetail);
  console.log('No detail by status:', noDetailByStatus);

  const activePetaks = plantings.filter(p => p.status !== 'SELESAI');
  console.log('\n--- NON-SELESAI PETAKS CHECK ---');
  activePetaks.forEach(p => {
    const loc = p.lokasi.trim().toUpperCase();
    const dList = detailMap.get(loc) || [];
    console.log(`Petak [${p.lokasi}] status: ${p.status} | Real: ${p.realTanam} | Detail count: ${dList.length}`);
  });

  await prisma.$disconnect();
}
check();
