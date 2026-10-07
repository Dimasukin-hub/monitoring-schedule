const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const countPD = await prisma.plantingDetail.count();
  console.log('PlantingDetail count:', countPD);
  if (countPD > 0) {
    const sample = await prisma.plantingDetail.findMany({
      where: { aktivitas: { contains: 'Tanam' } },
      orderBy: { tanggalDate: 'desc' },
      take: 5
    });
    console.log('Sample PlantingDetail Tanam:', sample);

    // Check min and max date
    const minDate = await prisma.plantingDetail.findFirst({
      where: { tanggalDate: { not: null } },
      orderBy: { tanggalDate: 'asc' },
      select: { tanggal: true, tanggalDate: true }
    });
    const maxDate = await prisma.plantingDetail.findFirst({
      where: { tanggalDate: { not: null } },
      orderBy: { tanggalDate: 'desc' },
      select: { tanggal: true, tanggalDate: true }
    });
    console.log('Date range in PlantingDetail:', minDate, 'to', maxDate);
  }

  const ms = await prisma.monthlySummary.findMany({
    where: { category: 'Tanam', year: 2026 },
    orderBy: { monthIndex: 'asc' }
  });
  console.log('MonthlySummary Tanam 2026:');
  ms.forEach(m => console.log(`${m.monthYear} (idx ${m.monthIndex}): realisasi=${m.realisasi}, rencana=${m.rencana}, rfc=${m.rfc}`));

  // Check overview API logic: how is realisasiTanamSummary calculated?
  await prisma.$disconnect();
}

check().catch(console.error);
