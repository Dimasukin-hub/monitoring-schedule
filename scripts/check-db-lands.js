const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.land.count();
  console.log('Total lands in DB:', total);

  const byYear = await prisma.land.groupBy({
    by: ['year'],
    _count: { id: true },
    orderBy: { year: 'asc' },
  });
  console.log('DB Year distribution:', byYear);

  const byWil = await prisma.land.groupBy({
    by: ['wilayah'],
    _count: { id: true },
    orderBy: { wilayah: 'asc' },
  });
  console.log('DB Wilayah distribution:', byWil);
}

main().finally(() => prisma.$disconnect());
