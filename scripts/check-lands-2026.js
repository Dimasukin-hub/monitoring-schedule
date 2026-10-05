const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const lands = await prisma.land.findMany({
    where: { year: 2026 },
    select: {
      lokasi: true,
      luasNetto: true,
      rencBkr: true,
      realBkr: true,
      rencBajak: true,
      realBajak: true,
      bulanSn: true,
      bulanTanam: true
    }
  });

  console.log('Total lands with year 2026:', lands.length);
  console.log('Sample 3 lands:', lands.slice(0, 3));

  // Let's check dates of bongkar and bajak
  const sampleWithBkr = lands.filter(l => l.realBkr || l.rencBkr);
  console.log('Lands with bongkar date:', sampleWithBkr.length);
  console.log('Sample bongkar dates:', sampleWithBkr.slice(0, 5).map(l => ({ lokasi: l.lokasi, rencBkr: l.rencBkr, realBkr: l.realBkr, luas: l.luasNetto })));

  const sampleWithBajak = lands.filter(l => l.realBajak || l.rencBajak);
  console.log('Lands with bajak date:', sampleWithBajak.length);
  console.log('Sample bajak dates:', sampleWithBajak.slice(0, 5).map(l => ({ lokasi: l.lokasi, rencBajak: l.rencBajak, realBajak: l.realBajak, luas: l.luasNetto })));
}

check().finally(() => prisma.$disconnect());
