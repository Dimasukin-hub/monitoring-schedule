const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check petaks in Land that have wilayah
  const lands = await prisma.land.findMany({
    select: { lokasi: true, wilayah: true }
  });
  console.log('Total Land with wilayah:', lands.length);

  // Group by first digit of lokasi vs wilayah
  const prefixWilayah = {};
  for (const l of lands) {
    if (!l.lokasi || !l.wilayah) continue;
    const prefix = l.lokasi.slice(0, 3);
    if (!prefixWilayah[l.wilayah]) prefixWilayah[l.wilayah] = new Set();
    prefixWilayah[l.wilayah].add(prefix);
  }

  for (const [w, prefs] of Object.entries(prefixWilayah)) {
    console.log(`Wilayah ${w} sample petak prefixes:`, Array.from(prefs).slice(0, 8).join(', '));
  }

  // Check petaks in PlantingDetail that have 'Barat' or 'Timur'
  const detailsBarat = await prisma.plantingDetail.findMany({
    where: { wilayah: 'Barat' },
    select: { lokasi: true },
    distinct: ['lokasi']
  });
  const detailsTimur = await prisma.plantingDetail.findMany({
    where: { wilayah: 'Timur' },
    select: { lokasi: true },
    distinct: ['lokasi']
  });

  const baratLocs = new Set(detailsBarat.map(d => d.lokasi));
  const timurLocs = new Set(detailsTimur.map(d => d.lokasi));

  console.log('\nCount of unique locations in Barat (Jul-Oct):', baratLocs.size);
  console.log('Count of unique locations in Timur (Jul-Oct):', timurLocs.size);

  // Cross check with W01-W07 from Jan-Jun
  for (let w = 1; w <= 7; w++) {
    const wCode = `W0${w}`;
    const wLocs = await prisma.plantingDetail.findMany({
      where: { wilayah: wCode },
      select: { lokasi: true },
      distinct: ['lokasi']
    });
    const locNames = wLocs.map(d => d.lokasi);
    
    // Check if these locations in Land have wilayah, or if they appear in Barat/Timur
    let inBarat = 0, inTimur = 0;
    for (const loc of locNames) {
      if (baratLocs.has(loc)) inBarat++;
      if (timurLocs.has(loc)) inTimur++;
    }
    console.log(`${wCode} (${locNames.length} locs): overlap with Barat=${inBarat}, overlap with Timur=${inTimur}, sample locs:`, locNames.slice(0, 5).join(', '));
  }
}
check();
