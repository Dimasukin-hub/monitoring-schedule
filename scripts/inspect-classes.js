const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const details = await prisma.plantingDetail.findMany({
    where: {
      aktivitas: 'Tanam Bibit',
    }
  });

  const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  const summaryByMonth = {};

  months.forEach(m => {
    const [yr, mo] = m.split('-');
    const recs = details.filter(d => {
      if (!d.tanggal) return false;
      const parts = d.tanggal.split('/');
      return parts[1] === mo && parts[2] === yr;
    });

    const groups = {};
    recs.forEach(d => {
      const jenis = (d.jenisBibit && d.jenisBibit.toLowerCase().includes('sucker')) ? 'Sucker' : 'Crown';
      const classes = [
        { code: 'B', name: 'Besar', val: d.besar || 0 },
        { code: 'S', name: 'Sedang', val: (d.sedang || 0) + (d.standar || 0) },
        { code: 'K', name: 'Kecil', val: d.kecil || 0 },
        { code: 'M', name: 'Extra Kecil', val: 0 }
      ];

      classes.forEach(c => {
        if (c.val > 0) {
          const key = `${jenis}_${c.code}`;
          if (!groups[key]) {
            groups[key] = {
              jenis,
              code: c.code,
              name: c.name,
              totalHa: 0,
              locations: {}
            };
          }
          groups[key].totalHa += c.val;
          groups[key].locations[d.lokasi] = (groups[key].locations[d.lokasi] || 0) + c.val;
        }
      });
    });

    summaryByMonth[m] = groups;
  });

  console.log(JSON.stringify(summaryByMonth['2026-10'], null, 2));

  await prisma.$disconnect();
}

main();
