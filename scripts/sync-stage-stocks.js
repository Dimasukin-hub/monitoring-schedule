const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTH_COLS = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

async function main() {
  console.log('🚀 Membaca sheet "Stok Lahan" dari Schedule 2026 Update 09.xlsx...');
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellDates: false });
  const ws = wb.Sheets['Stok Lahan'];

  if (!ws) {
    throw new Error('Sheet "Stok Lahan" tidak ditemukan di file Excel!');
  }

  // Baris Excel literal (1-indexed) untuk setiap tahun:
  // Row Bongkar, Row Stok Bongkar
  const yearBlocks = [
    { year: 2022, bkrRow: 7,  stokBkrRow: 12 },
    { year: 2023, bkrRow: 20, stokBkrRow: 25 },
    { year: 2024, bkrRow: 33, stokBkrRow: 38 },
    { year: 2025, bkrRow: 46, stokBkrRow: 51 },
    { year: 2026, bkrRow: 59, stokBkrRow: 64 },
  ];

  let totalUpserted = 0;

  for (const block of yearBlocks) {
    const { year, bkrRow, stokBkrRow } = block;

    // Saldo awal tahun (Kolom C)
    const initBk = Number(ws['C' + stokBkrRow]?.v) || 0;
    const initBjk = Number(ws['C' + (stokBkrRow + 1)]?.v) || 0;
    const initSN = Number(ws['C' + (stokBkrRow + 2)]?.v) || 0;

    console.log(`\n📅 Memproses Tahun ${year} (Saldo Awal: BK=${initBk.toFixed(2)}, BJK=${initBjk.toFixed(2)}, SN=${initSN.toFixed(2)} Ha)...`);

    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const col = MONTH_COLS[mIdx];
      const monthName = MONTH_NAMES[mIdx];
      const monthYear = `${monthName}-${String(year).slice(2)}`;

      const bongkar = Number(ws[col + bkrRow]?.v) || 0;
      const bajak = Number(ws[col + (bkrRow + 1)]?.v) || 0;
      const sn = Number(ws[col + (bkrRow + 2)]?.v) || 0;
      const tanam = Number(ws[col + (bkrRow + 3)]?.v) || 0;

      const stokBongkar = Number(ws[col + stokBkrRow]?.v) || 0;
      const stokBajak = Number(ws[col + (stokBkrRow + 1)]?.v) || 0;
      const stokSN = Number(ws[col + (stokBkrRow + 2)]?.v) || 0;
      const totalStok = Number(ws[col + (stokBkrRow + 3)]?.v) || (stokBongkar + stokBajak + stokSN);

      await prisma.stageStockSummary.upsert({
        where: {
          year_monthIndex: {
            year,
            monthIndex: mIdx + 1,
          },
        },
        update: {
          month: monthName,
          monthYear,
          bongkar: Math.round(bongkar * 100) / 100,
          bajak: Math.round(bajak * 100) / 100,
          sn: Math.round(sn * 100) / 100,
          tanam: Math.round(tanam * 100) / 100,
          stokBongkar: Math.round(stokBongkar * 100) / 100,
          stokBajak: Math.round(stokBajak * 100) / 100,
          stokSN: Math.round(stokSN * 100) / 100,
          totalStok: Math.round(totalStok * 100) / 100,
          initialCarryoverBongkar: initBk,
          initialCarryoverBajak: initBjk,
          initialCarryoverSN: initSN,
        },
        create: {
          year,
          month: monthName,
          monthIndex: mIdx + 1,
          monthYear,
          bongkar: Math.round(bongkar * 100) / 100,
          bajak: Math.round(bajak * 100) / 100,
          sn: Math.round(sn * 100) / 100,
          tanam: Math.round(tanam * 100) / 100,
          stokBongkar: Math.round(stokBongkar * 100) / 100,
          stokBajak: Math.round(stokBajak * 100) / 100,
          stokSN: Math.round(stokSN * 100) / 100,
          totalStok: Math.round(totalStok * 100) / 100,
          initialCarryoverBongkar: initBk,
          initialCarryoverBajak: initBjk,
          initialCarryoverSN: initSN,
        },
      });

      totalUpserted++;
    }
  }

  console.log(`\n🎉 SELESAI! Berhasil memasukkan ${totalUpserted} bulan data ke tabel StageStockSummary PostgreSQL.`);

  // Validasi posisi Oktober 2026 dan Desember 2026
  const okt26 = await prisma.stageStockSummary.findFirst({
    where: { year: 2026, monthIndex: 10 },
  });
  const des26 = await prisma.stageStockSummary.findFirst({
    where: { year: 2026, monthIndex: 12 },
  });

  console.log('\n📊 Validasi Posisi Okt 2026 di Database:');
  console.log({
    Bulan: okt26?.monthYear,
    'Stok Bongkar': `${okt26?.stokBongkar} Ha`,
    'Stok Bajak': `${okt26?.stokBajak} Ha`,
    'Stok SN': `${okt26?.stokSN} Ha`,
    'Total Stok': `${okt26?.totalStok} Ha`,
  });

  console.log('\n📊 Validasi Posisi Des 2026 di Database:');
  console.log({
    Bulan: des26?.monthYear,
    'Stok Bongkar': `${des26?.stokBongkar} Ha`,
    'Stok Bajak': `${des26?.stokBajak} Ha`,
    'Stok SN': `${des26?.stokSN} Ha`,
    'Total Stok': `${des26?.totalStok} Ha`,
  });
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat sinkronisasi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
