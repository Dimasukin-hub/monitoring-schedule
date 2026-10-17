const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

async function run() {
  console.log('=== 1. UPDATE 061E2 IN PLANTING ===');
  const planting061 = await prisma.planting.findFirst({
    where: { lokasi: '061E2' }
  });
  console.log('Current planting 061E2:', planting061);
  if (planting061) {
    const updatedPlanting = await prisma.planting.update({
      where: { id: planting061.id },
      data: {
        jenisBibit: 'Crown',
        kelasBibit: 'Kecil'
      }
    });
    console.log('Updated planting 061E2:', updatedPlanting);
  }

  console.log('\n=== 2. UPDATE 098M and 098M1 (Jun-19 -> Jun-21) ===');
  const fix19 = await prisma.land.updateMany({
    where: { bulanTanam: 'Jun-19' },
    data: { bulanTanam: 'Jun-21' }
  });
  console.log('Updated Jun-19 records to Jun-21 count:', fix19.count);

  console.log('\n=== 3. SYNC BULAN TANAM FOR 2021 LANDS FROM REAL MULAI TANAM ===');
  const lands2021 = await prisma.land.findMany({
    where: {
      year: 2021,
      bulanTanam: null,
      realMulaiTanam: { not: null }
    }
  });
  console.log('Found lands with year 2021, bulanTanam null, but realMulaiTanam present:', lands2021.length);

  let updatedCount = 0;
  for (const land of lands2021) {
    const parts = land.realMulaiTanam.split('/');
    if (parts.length === 3) {
      const mIdx = parseInt(parts[1], 10) - 1;
      const yy = parts[2].slice(-2);
      if (mIdx >= 0 && mIdx < 12) {
        const bt = MONTHS[mIdx] + '-' + yy;
        await prisma.land.update({
          where: { id: land.id },
          data: { bulanTanam: bt }
        });
        updatedCount++;
      }
    }
  }
  console.log('Successfully updated bulanTanam for', updatedCount, 'lands.');

  console.log('\n=== 4. VERIFY DISTINCT BULAN TANAM FOR 2021 ===');
  const distinct2021 = await prisma.land.findMany({
    where: {
      year: 2021,
      bulanTanam: { not: null }
    },
    select: { bulanTanam: true },
    distinct: ['bulanTanam']
  });
  console.log('Distinct bulanTanam for 2021:', distinct2021.map(d => d.bulanTanam).sort());

  console.log('\n=== 5. CHECK IF ANY JUN-19 REMAINS ===');
  const count19 = await prisma.land.count({ where: { bulanTanam: 'Jun-19' } });
  console.log('Remaining Jun-19 count:', count19);

  process.exit(0);
}

run()
  .catch(err => {
    console.error('Error running script:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
