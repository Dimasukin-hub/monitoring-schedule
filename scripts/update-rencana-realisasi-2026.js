const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Memproses data Rencana vs Realisasi (Ha) 2026 dari Schedule 2026 Update 09.xlsx...');
  
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');

  const months = ['Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26'];

  function getMinDate(r, cols) {
    let minV = null;
    for (const c of cols) {
      const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
      if (typeof v === 'number' && v > 40000 && v < 60000) {
        if (minV === null || v < minV) minV = v;
      }
    }
    return minV ? xlsx.SSF.parse_date_code(minV) : null;
  }

  // Column definitions based on user specification:
  // Bongkar: Chopper (13) sampai Kompos (22)
  const BONGKAR_RENC_COLS = []; for (let c = 13; c <= 22; c++) BONGKAR_RENC_COLS.push(c);
  const BONGKAR_REAL_COLS = []; for (let c = 74; c <= 83; c++) BONGKAR_REAL_COLS.push(c);

  // Bajak: MB 5 BTR (25) sampai Ridger (43)
  const BAJAK_RENC_COLS = []; for (let c = 25; c <= 43; c++) BAJAK_RENC_COLS.push(c);
  const BAJAK_REAL_COLS = []; for (let c = 84; c <= 101; c++) BAJAK_REAL_COLS.push(c);

  // Siap Tanam: Jalan & Sal (44)
  const SN_RENC_COLS = [44];
  const SN_REAL_COLS = [102];

  let rawSums = {
    Bongkar: { renc: Array(12).fill(0), real: Array(12).fill(0) },
    Bajak: { renc: Array(12).fill(0), real: Array(12).fill(0) },
    'Siap Tanam': { renc: Array(12).fill(0), real: Array(12).fill(0) },
  };

  for (let r = 11; r <= range.e.r; r++) {
    const netto = parseFloat(ws[xlsx.utils.encode_cell({ r, c: 5 })]?.v) || 0;
    if (netto <= 0) continue;

    // Bongkar
    const bkR = getMinDate(r, BONGKAR_RENC_COLS);
    const bkA = getMinDate(r, BONGKAR_REAL_COLS);
    if (bkR && bkR.y === 2026) rawSums.Bongkar.renc[bkR.m - 1] += netto;
    if (bkA && bkA.y === 2026) rawSums.Bongkar.real[bkA.m - 1] += netto;

    // Bajak
    const bjR = getMinDate(r, BAJAK_RENC_COLS);
    const bjA = getMinDate(r, BAJAK_REAL_COLS);
    if (bjR && bjR.y === 2026) rawSums.Bajak.renc[bjR.m - 1] += netto;
    if (bjA && bjA.y === 2026) rawSums.Bajak.real[bjA.m - 1] += netto;

    // Siap Tanam
    const snR = getMinDate(r, SN_RENC_COLS);
    const snA = getMinDate(r, SN_REAL_COLS);
    if (snR && snR.y === 2026) rawSums['Siap Tanam'].renc[snR.m - 1] += netto;
    if (snA && snA.y === 2026) rawSums['Siap Tanam'].real[snA.m - 1] += netto;
  }

  // Clear existing Bongkar, Bajak, Siap Tanam records in MonthlySummary
  console.log('🧹 Menghapus data lama MonthlySummary untuk Bongkar, Bajak, Siap Tanam...');
  await prisma.monthlySummary.deleteMany({
    where: {
      category: { in: ['Bongkar', 'Bajak', 'Siap Tanam'] },
    },
  });

  const categories = ['Bongkar', 'Bajak', 'Siap Tanam'];
  const insertRecords = [];

  for (const cat of categories) {
    let accum = 0;
    for (let i = 0; i < 12; i++) {
      const m = months[i];
      const renc = Math.round(rawSums[cat].renc[i] * 100) / 100;
      // Months 1..9 (Jan-Sep): realisasi aktual
      // Months 10..12 (Okt-Des): proyeksi realisasi mengikuti rencana (sesuai format dashboard & Stok Lahan)
      const real = i < 9
        ? Math.round(rawSums[cat].real[i] * 100) / 100
        : renc;
      const dev = Math.round((real - renc) * 100) / 100;
      accum = Math.round((accum + real) * 100) / 100;

      insertRecords.push({
        category: cat,
        monthYear: m,
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

  console.log(`📥 Menyimpan ${insertRecords.length} record ke database...`);
  await prisma.monthlySummary.createMany({
    data: insertRecords,
  });

  console.log('✅ Selesai memperbarui data MonthlySummary untuk Bongkar, Bajak, dan Siap Tanam!');
}

main()
  .catch((e) => {
    console.error('❌ Error updating monthly summary:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
