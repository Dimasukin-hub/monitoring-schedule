const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const active = await prisma.planting.findMany({
    where: { status: { in: ['PROSES', 'CEK SELESAI'] } },
    select: { lokasi: true, status: true, realTanam: true }
  });

  for (const a of active) {
    const count = await prisma.plantingDetail.count({ where: { lokasi: { equals: a.lokasi, mode: 'insensitive' } } });
    console.log('Lokasi ' + a.lokasi + ' (' + a.status + '): ' + count + ' detail rows in DB');
  }
}
check();
