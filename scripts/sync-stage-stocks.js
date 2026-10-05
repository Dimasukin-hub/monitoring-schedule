const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

async function main() {
  console.log('🚀 Membaca sheet "Stok Lahan" dari Schedule 2026 Update 09.xlsx...');
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellDates: false });
  const ws = wb.Sheets['Stok Lahan'];

  if (!ws) {
    throw new Error('Sheet "Stok Lahan" tidak ditemukan di file Excel!');
  }

  // Definisi blok baris tiap tahun di sheet Stok Lahan
  const yearBlocks = [
    { year: 2022, actStart: 6,  stokStart: 11 }, // Bongkar r7, Bajak r8, SN r9, Tnm r10, StokBk r12, StokBjk r13, StokSN r14, Tot r15
    { year: 2023, actStart: 19, stokStart: 24 }, // Bongkar r20, Bajak r21, SN r22, Tnm r23, StokBk r25, StokBjk r26, StokSN r27, Tot r28
    { year: 2024, actStart: 32, stokStart: 37 }, // Bongkar r33, Bajak r34, SN r35, Tnm r36, StokBk r38, StokBjk r39, StokSN r40, Tot r41
    { year: 2025, actStart: 45, stokStart: 50 }, // Bongkar r46, Bajak r47, SN r48, Tnm r49, StokBk r51, StokBjk r52, StokSN r53, Tot r54
    { year: 2026, actStart: 58, stokStart: 63 }, // Bongkar r59, Bajak r60, SN r61, Tnm r62, StokBk r64, StokBjk r65, StokSN r66, Tot r67
  ];

  let totalUpserted = 0;

  for (const block of yearBlocks) {
    const { year, actStart, stokStart } = block;

    // Saldo awal tahun (Kolom C, index 2)
    const initBk = ws[xlsx.utils.encode_cell({ r: stokStart, c: 2 })]?.v || 0;
    const initBjk = ws[xlsx.utils.encode_cell({ r: stokStart + 1, c: 2 })]?.v || 0;
    const initSN = ws[xlsx.utils.encode_cell({ r: stokStart + 2, c: 2 })]?.v || 0;

    console.log(`\n📅 Memproses Tahun ${year} (Saldo Awal: BK=${Number(initBk).toFixed(2)}, BJK=${Number(initBjk).toFixed(2)}, SN=${Number(initSN).toFixed(2)} Ha)...`);

    // Kolom E (idx 4) s/d Kolom P (idx 15) untuk Jan s/d Des
    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const c = 4 + mIdx;
      const monthName = MONTH_NAMES[mIdx];
      const monthYear = `${monthName}-${String(year).slice(2)}`;

      const bongkar = Number(ws[xlsx.utils.encode_cell({ r: actStart, c })]?.v) || 0;
      const bajak = Number(ws[xlsx.utils.encode_cell({ r: actStart + 1, c })]?.v) || 0;
      const sn = Number(ws[xlsx.utils.encode_cell({ r: actStart + 2, c })]?.v) || 0;
      const tanam = Number(ws[xlsx.utils.encode_cell({ r: actStart + 3, c })]?.v) || 0;

      const stokBongkar = Number(ws[xlsx.utils.encode_cell({ r: stokStart, c })]?.v) || 0;
      const stokBajak = Number(ws[xlsx.utils.encode_cell({ r: stokStart + 1, c })]?.v) || 0;
      const stokSN = Number(ws[xlsx.utils.encode_cell({ r: stokStart + 2, c })]?.v) || 0;
      const totalStok = Number(ws[xlsx.utils.encode_cell({ r: stokStart + 3, c })]?.v) || (stokBongkar + stokBajak + stokSN);

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
          initialCarryoverBongkar: Number(initBk),
          initialCarryoverBajak: Number(initBjk),
          initialCarryoverSN: Number(initSN),
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
          initialCarryoverBongkar: Number(initBk),
          initialCarryoverBajak: Number(initBjk),
          initialCarryoverSN: Number(initSN),
        },
      });

      totalUpserted++;
    }
  }

  console.log(`\n🎉 SELESAI! Berhasil memasukkan ${totalUpserted} bulan data ke tabel StageStockSummary PostgreSQL.`);

  // Verifikasi Posisi Akhir 2026
  const sample2026 = await prisma.stageStockSummary.findUnique({
    where: {
      year_monthIndex: {
        year: 2026,
        monthIndex: 12,
      },
    },
  });

  console.log('\n📊 Validasi Posisi Akhir Des 2026 di PostgreSQL Database:');
  console.log({
    Bulan: sample2026.monthYear,
    'Stok Bongkar': `${sample2026.stokBongkar} Ha`,
    'Stok Bajak': `${sample2026.stokBajak} Ha`,
    'Stok SN': `${sample2026.stokSN} Ha`,
    'Total Stok Operasional': `${sample2026.totalStok} Ha`,
    'Saldo Awal Tahun': `BK: ${sample2026.initialCarryoverBongkar?.toFixed(1)} Ha, BJK: ${sample2026.initialCarryoverBajak?.toFixed(1)} Ha, SN: ${sample2026.initialCarryoverSN?.toFixed(1)} Ha`,
  });
}

main()
  .catch((e) => {
    console.error('❌ Gagal sinkronisasi data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
