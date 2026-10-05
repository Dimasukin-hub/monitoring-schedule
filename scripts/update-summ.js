const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

function parseNumber(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  if (typeof val === 'number') return val;
  const str = String(val).trim().replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function parseMonthYearString(val) {
  if (val === undefined || val === null || val === '' || val === '-' || val === '#N/A') return null;
  const s = String(val).trim();
  const mMatch = s.match(/^(\d{1,2})(20\d{2})$/);
  if (mMatch) {
    const m = parseInt(mMatch[1], 10);
    const y = mMatch[2];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    if (m >= 1 && m <= 12) return `${months[m - 1]}-${y.slice(2)}`;
  }
  const num = typeof val === 'number' ? val : parseFloat(s);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = xlsx.SSF.parse_date_code(num);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${months[d.m - 1]}-${String(d.y).slice(2)}`;
  }
  return s;
}

async function main() {
  const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const summSheet = workbook.Sheets['Summ'];
  if (!summSheet) {
    console.error('Summ sheet not found!');
    return;
  }

  const rawSumm = xlsx.utils.sheet_to_json(summSheet, { header: 1, defval: '' });

  // Delete existing Bajak and Siap Tanam summaries to re-insert fresh
  await prisma.monthlySummary.deleteMany({
    where: { category: { in: ['Bajak', 'Siap Tanam'] } },
  });

  const categories = [
    { name: 'Bajak', offset: 23 },
    { name: 'Siap Tanam', offset: 46 },
  ];

  const summaries = [];

  for (const cat of categories) {
    // 2025: 3 months (cols offset+1 to offset+3)
    for (let c = cat.offset + 1; c <= cat.offset + 3; c++) {
      const rawHeader = rawSumm[2][c];
      const monthYear = parseMonthYearString(rawHeader);
      if (!monthYear) continue;

      const rfc = parseNumber(rawSumm[3][c]);
      const renc = parseNumber(rawSumm[4][c]);
      const real = parseNumber(rawSumm[5][c]);
      const dev = parseNumber(rawSumm[6][c]);
      const accum = parseNumber(rawSumm[7][c]);

      summaries.push({
        category: cat.name,
        monthYear,
        monthIndex: c - cat.offset,
        year: 2025,
        rfc,
        rencana: renc,
        realisasi: real,
        deviasi: dev,
        akumulasi: accum,
      });
    }

    // 2026: 12 months (cols offset+5 to offset+16)
    for (let c = cat.offset + 5; c <= cat.offset + 16; c++) {
      const rawHeader = rawSumm[2][c];
      const monthYear = parseMonthYearString(rawHeader);
      if (!monthYear) continue;

      const rfc = parseNumber(rawSumm[3][c]);
      const renc = parseNumber(rawSumm[4][c]);
      const real = parseNumber(rawSumm[5][c]);
      const dev = parseNumber(rawSumm[6][c]);
      const accum = parseNumber(rawSumm[7][c]);

      summaries.push({
        category: cat.name,
        monthYear,
        monthIndex: c - cat.offset - 4,
        year: 2026,
        rfc,
        rencana: renc,
        realisasi: real,
        deviasi: dev,
        akumulasi: accum,
      });
    }

    // 2027: 3 months (cols offset+19 to offset+21)
    for (let c = cat.offset + 19; c <= cat.offset + 21; c++) {
      const rawHeader = rawSumm[2][c];
      const monthYear = parseMonthYearString(rawHeader);
      if (!monthYear) continue;

      const rfc = parseNumber(rawSumm[3][c]);
      const renc = parseNumber(rawSumm[4][c]);
      const real = parseNumber(rawSumm[5][c]);
      const dev = parseNumber(rawSumm[6][c]);
      const accum = parseNumber(rawSumm[7][c]);

      summaries.push({
        category: cat.name,
        monthYear,
        monthIndex: c - cat.offset - 18,
        year: 2027,
        rfc,
        rencana: renc,
        realisasi: real,
        deviasi: dev,
        akumulasi: accum,
      });
    }
  }

  if (summaries.length > 0) {
    await prisma.monthlySummary.createMany({ data: summaries });
    console.log(`✅ Successfully added ${summaries.length} monthly summaries for Bajak and Siap Tanam.`);
  }

  const allCategories = await prisma.monthlySummary.groupBy({ by: ['category'] });
  console.log('Available categories now:', allCategories.map((c) => c.category));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
