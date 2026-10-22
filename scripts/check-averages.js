const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const all = await prisma.planting.findMany();
  
  // 1. All locations
  let sumLuasAll = 0, sumRealAll = 0, sumProgAll = 0;
  let leadSumAll = 0, leadCountAll = 0;
  
  for (const p of all) {
    sumLuasAll += p.luas || 0;
    sumRealAll += p.realTanam || 0;
    sumProgAll += p.progress || 0;
    if (p.leadtime !== null && p.leadtime !== undefined) {
      leadSumAll += p.leadtime;
      leadCountAll++;
    }
  }

  // 2. Only PROSES (or status != 'SELESAI')
  const prosesOnly = all.filter(p => p.status === 'PROSES');
  let sumLuasProses = 0, sumRealProses = 0, sumProgProses = 0;
  let leadSumProses = 0, leadCountProses = 0;

  for (const p of prosesOnly) {
    sumLuasProses += p.luas || 0;
    sumRealProses += p.realTanam || 0;
    sumProgProses += p.progress || 0;
    if (p.leadtime !== null && p.leadtime !== undefined) {
      leadSumProses += p.leadtime;
      leadCountProses++;
    }
  }

  console.log('--- ALL LOCATIONS (363) ---');
  console.log('Count:', all.length);
  console.log('Total Luas:', sumLuasAll.toFixed(2));
  console.log('Total Real:', sumRealAll.toFixed(2));
  console.log('Weighted Progress (Real/Luas):', ((sumRealAll / sumLuasAll) * 100).toFixed(2) + '%');
  console.log('Simple Avg Progress:', (sumProgAll / all.length).toFixed(2) + '%');
  console.log('Leadtime Count:', leadCountAll, 'Leadtime Sum:', leadSumAll, 'Avg Leadtime:', (leadSumAll / leadCountAll).toFixed(1) + ' hari');

  console.log('\n--- PROSES ONLY (10) ---');
  console.log('Count:', prosesOnly.length);
  console.log('Total Luas:', sumLuasProses.toFixed(2));
  console.log('Total Real:', sumRealProses.toFixed(2));
  console.log('Weighted Progress (Real/Luas):', ((sumRealProses / sumLuasProses) * 100).toFixed(2) + '%');
  console.log('Simple Avg Progress:', (sumProgProses / prosesOnly.length).toFixed(2) + '%');
  console.log('Leadtime Count:', leadCountProses, 'Leadtime Sum:', leadSumProses, 'Avg Leadtime:', (leadSumProses / leadCountProses).toFixed(1) + ' hari');
}
check();
