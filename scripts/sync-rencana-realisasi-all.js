const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Memperbarui MonthlySummary 2026 untuk Bongkar, Bajak, dan Siap Tanam...');

  const months = ['Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26'];

  // Data resmi dari Schedule 2026 Update 09.xlsx (Sheet Stok Lahan & Summ)
  const data = {
    Bongkar: {
      rencana: [140.0, 120.0, 80.0, 90.0, 125.0, 60.0, 100.0, 115.0, 200.0, 170.0, 160.0, 165.0],
      realisasi: [137.64, 118.23, 76.10, 84.97, 124.54, 54.57, 96.22, 111.34, 205.65, 168.57, 160.79, 166.49],
    },
    Bajak: {
      rencana: [202.80, 333.99, 175.50, 182.07, 193.37, 151.25, 340.84, 84.57, 114.80, 164.65, 132.07, 194.51],
      realisasi: [45.07, 63.33, 115.08, 92.35, 83.20, 289.78, 194.15, 139.98, 133.11, 154.75, 147.23, 183.20],
    },
    'Siap Tanam': {
      rencana: [198.42, 124.93, 101.44, 200.44, 144.10, 165.78, 302.31, 175.06, 155.24, 107.15, 113.57, 139.36],
      realisasi: [40.88, 40.30, 96.92, 111.92, 111.09, 218.87, 189.48, 175.06, 126.34, 119.94, 100.72, 119.05],
    },
  };

  await prisma.monthlySummary.deleteMany({
    where: {
      year: 2026,
      category: { in: ['Bongkar', 'Bajak', 'Siap Tanam'] },
    },
  });

  const records = [];

  for (const [cat, val] of Object.entries(data)) {
    let accum = 0;
    for (let i = 0; i < 12; i++) {
      const renc = val.rencana[i];
      const real = val.realisasi[i];
      const dev = Math.round((real - renc) * 100) / 100;
      accum = Math.round((accum + real) * 100) / 100;

      records.push({
        category: cat,
        monthYear: months[i],
        monthIndex: i + 1,
        year: 2026,
        rfc: real,
        rencana: renc,
        realisasi: real,
        deviasi: dev,
        akumulasi: accum,
      });
    }
  }

  await prisma.monthlySummary.createMany({
    data: records,
  });

  console.log(`✅ Berhasil menyimpan ${records.length} data bulanan untuk Bongkar, Bajak, dan Siap Tanam!`);
}

main()
  .catch((err) => {
    console.error('❌ Terjadi kesalahan:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
