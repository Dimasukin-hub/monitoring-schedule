const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const currentYear = 2026;
  const currentMonthIdx = 10;
  const currentDay = 6;

  const mtdPlantingRecords = await prisma.plantingDetail.findMany({
    where: {
      aktivitas: { contains: 'Tanam' },
    },
  });

  let mtdRealHa = 0;
  let matchCount = 0;
  mtdPlantingRecords.forEach((rec) => {
    if (rec.tanggal) {
      const parts = rec.tanggal.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (y === currentYear && m === currentMonthIdx && d >= 1 && d <= currentDay) {
          mtdRealHa += (rec.total || 0);
          matchCount++;
        }
      }
    }
  });

  console.log('Matches:', matchCount, 'Total MTD Ha:', mtdRealHa);
  await prisma.$disconnect();
}

test().catch(console.error);
