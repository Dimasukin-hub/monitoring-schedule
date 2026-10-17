const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('=== REMOVING 061E2 FROM PLANTING MASTER ===');
  const deleted = await prisma.planting.deleteMany({
    where: {
      lokasi: {
        equals: '061E2',
        mode: 'insensitive'
      }
    }
  });
  console.log('Deleted 061E2 from Planting count:', deleted.count);

  const totalPlanting = await prisma.planting.count();
  console.log('Total remaining rows in Planting:', totalPlanting);

  const lastPlanting = await prisma.planting.findMany({
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log('Last 5 rows in Planting:', lastPlanting);

  process.exit(0);
}

run()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
