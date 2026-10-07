const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const lands = await prisma.land.findMany({ select: { id: true, lokasi: true, year: true, status: true, wilayah: true } });
  console.log('Total lands in DB:', lands.length);
  const map = new Map();
  lands.forEach(l => {
    const k = l.lokasi.toUpperCase();
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(l);
  });
  console.log('Total unique lokasi in DB:', map.size);
  let multiCount = 0;
  for (const [k, arr] of map.entries()) {
    if (arr.length > 1) {
      multiCount++;
      if (multiCount <= 5) {
        console.log(`Lokasi ${k} has ${arr.length} records:`, arr);
      }
    }
  }
  console.log('Lokasi with multiple records in DB:', multiCount);
  await prisma.$disconnect();
}
check().catch(console.error);
