const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeWilayah(w) {
  if (!w) return 'W01';
  const clean = String(w).trim().toUpperCase();
  if (clean === 'ARS1') return 'W07';
  if (clean === 'SAG1' || clean === 'MD2') return 'W04';
  if (clean.startsWith('AW0')) return 'W0' + clean.slice(3);
  if (clean.startsWith('AW')) {
    const num = clean.slice(2);
    return num.length === 1 ? 'W0' + num : 'W' + num;
  }
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

  console.log(`Updated ${updatedCount} lands in DB.`);

  const after = await prisma.land.groupBy({
    by: ['wilayah'],
    _count: { id: true },
    orderBy: { wilayah: 'asc' }
  });
  console.log('Wilayah summary after normalization:', after);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
