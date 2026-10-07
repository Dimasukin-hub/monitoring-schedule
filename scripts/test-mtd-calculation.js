const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testMtd() {
  // Start of current month (1 Okt 2026) to today (6 Okt 2026)
  const startOfMonth = new Date(Date.UTC(2026, 9, 1, 0, 0, 0)); // 2026-10-01
  const endOfToday = new Date(Date.UTC(2026, 9, 6, 23, 59, 59));  // 2026-10-06

  const tanamDetails = await prisma.plantingDetail.findMany({
    where: {
      aktivitas: { contains: 'Tanam' },
      tanggalDate: {
        gte: startOfMonth,
        lte: endOfToday,
      },
    },
  });

  console.log('Total planting detail records in Oct 1-6:', tanamDetails.length);
  const totalMtdHa = tanamDetails.reduce((sum, item) => sum + (item.total || 0), 0);
  console.log('Total MTD Ha from PlantingDetail (Oct 1-6):', Math.round(totalMtdHa * 100) / 100);

  // Group by date
  const byDate = {};
  tanamDetails.forEach(item => {
    const dStr = item.tanggal || (item.tanggalDate ? item.tanggalDate.toISOString().slice(0, 10) : 'unknown');
    byDate[dStr] = (byDate[dStr] || 0) + (item.total || 0);
  });
  console.log('Breakdown by date:', byDate);

  // Also check October target in MonthlySummary
  const octMonthly = await prisma.monthlySummary.findFirst({
    where: { category: 'Tanam', year: 2026, monthIndex: 10 }
  });
  console.log('October MonthlySummary:', octMonthly);

  await prisma.$disconnect();
}

testMtd().catch(console.error);
