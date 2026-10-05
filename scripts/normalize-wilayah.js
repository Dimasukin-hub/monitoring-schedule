const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeWilayah(w) {
  if (!w) return 'UNKNOWN';
  const clean = String(w).trim().toUpperCase();
  if (clean === 'ARS1') return 'W07';
  if (clean === 'SAG1') return 'W04';
  if (clean.startsWith('AW0')) return 'W0' + clean.slice(3);
  if (clean.startsWith('AW')) return 'W' + clean.slice(2);
  return clean;
}

async function main() {
  const lands = await prisma.land.findMany({
    select: { id: true, wilayah: true }
  });

  let updatedCount = 0;
  for (const land of lands) {
    const norm = normalizeWilayah(land.wilayah);
    if (norm !== land.wilayah) {
      await prisma.land.update({
        where: { id: land.id },
        data: { wilayah: norm }
      });
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} lands.`);

  const after = await prisma.land.groupBy({
    by: ['wilayah'],
    _count: { id: true },
    orderBy: { wilayah: 'asc' }
  });
  console.log('Wilayah summary after normalization:', after);
}

main().finally(() => prisma.$disconnect());
