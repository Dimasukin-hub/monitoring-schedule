const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tanam = await prisma.plantingDetail.findMany({
    where: { aktivitas: 'Tanam Bibit' },
    orderBy: { id: 'desc' },
    take: 20
  });
  tanam.forEach(t => console.log('id:', t.id, 'tgl:', t.tanggal, 'tglDate:', t.tanggalDate, 'lok:', t.lokasi, 'tot:', t.total));
  await prisma.$disconnect();
}
check().catch(console.error);
