const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const count = await prisma.land.count();
  console.log('Total Land in DB:', count);

  const wilayahs = await prisma.land.findMany({
    select: { wilayah: true },
    distinct: ['wilayah'],
    orderBy: { wilayah: 'asc' },
  });
  console.log('Distinct wilayahs (' + wilayahs.length + '):', wilayahs.map((w) => w.wilayah));

  const sample = await prisma.land.findFirst({
    where: { lokasi: '049C1' },
    include: { activities: { take: 10 } },
  });
  console.log('Sample 049C1 in DB:', JSON.stringify(sample, null, 2));

  // Check sample with activities up to selesai tanam
  const actSample = await prisma.landActivity.findMany({
    where: { landId: sample.id },
    select: { code: true, name: true, rencanaDate: true, realisasiDate: true, status: true },
    orderBy: { stepOrder: 'asc' }
  });
  console.log('Sample activities for 049C1:', actSample);

  await prisma.$disconnect();
}
run();
