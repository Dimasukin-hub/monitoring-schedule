const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const lands = await prisma.land.findMany({
    include: { activities: true }
  });

  const bjkCodes = [
    '11.BAJAK_AWAL',
    '17.SUBSOILER',
    '18.FINISHING_HARROW',
    '19.FINISHING_ROTARY',
    '20.ROTARY_FH2',
    '21.RIDGER',
  ];

  function getCat(l) {
    const app = (l.aplikasiTerakhir || l.statusAplikasi || '').trim();
    if (app.includes('24.Sls Tanam') || l.realSelesaiTanam || l.progressTanam === 100) {
      return 'SELESAI';
    }
    if (app.includes('23.Proses Tnm') || l.realMulaiTanam || l.progressTanam === 50) {
      return 'PROSES';
    }
    if (app.includes('22.Siap Tanam') || app.includes('Jalan & Sal')) {
      return 'SN';
    }
    if (
      app.includes('MB') ||
      app.includes('Rotary') ||
      app.includes('SS1') ||
      app.includes('Ridger') ||
      app.includes('Finishing') ||
      app.includes('Bajak')
    ) {
      return 'BJK';
    }
    return 'BK';
  }

  const counts = {
    BK: { count: 0, netto: 0 },
    BJK: { count: 0, netto: 0 },
    SN: { count: 0, netto: 0 },
    PROSES: { count: 0, netto: 0 },
    SELESAI: { count: 0, netto: 0 }
  };

  for (const l of lands) {
    const c = getCat(l);
    counts[c].count++;
    counts[c].netto += l.luasNetto || 0;
  }

  console.log('Result aligned with Excel Col 1:');
  for (const [k, v] of Object.entries(counts)) {
    console.log(k + ': ' + v.count + ' lokasi, ' + v.netto.toFixed(2) + ' Ha');
  }
}

inspect().finally(() => prisma.$disconnect());
