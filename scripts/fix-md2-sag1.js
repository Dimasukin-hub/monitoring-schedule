const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  console.log('Memperbaiki wilayah MD2 dan SAG1 di database ke W04...');

  const update096F = await prisma.land.updateMany({
    where: {
      lokasi: '096F',
      wilayah: 'MD2',
    },
    data: {
      wilayah: 'W04',
      year: 2026, // Block 096 operational schedule
    },
  });
  console.log(`Updated 096F: ${update096F.count} record (MD2 -> W04).`);

  const update042A1 = await prisma.land.updateMany({
    where: {
      lokasi: '042A1',
      wilayah: 'SAG1',
    },
    data: {
      wilayah: 'W04',
    },
  });
  console.log(`Updated 042A1: ${update042A1.count} record (SAG1 -> W04).`);

  // Verify no MD2 or SAG1 remains in Land
  const remaining = await prisma.land.findMany({
    where: {
      wilayah: { in: ['MD2', 'SAG1'] },
    },
  });
  console.log(`Remaining MD2 or SAG1 records in DB: ${remaining.length}`);

  // List all distinct wilayah in DB
  const distinctWil = await prisma.land.findMany({
    select: { wilayah: true },
    distinct: ['wilayah'],
    orderBy: { wilayah: 'asc' },
  });
  console.log('Distinct wilayah in DB sekarang:', distinctWil.map(w => w.wilayah));

  await prisma.$disconnect();
}

fix().catch(console.error);
