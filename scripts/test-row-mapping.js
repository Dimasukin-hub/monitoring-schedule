const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseYear(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  if (typeof val === 'number') {
    if (val > 40000 && val < 60000) {
      return xlsx.SSF.parse_date_code(val).y;
    }
    const str = String(val);
    const m = str.match(/^(\d{1,2})(20\d{2})$/);
    if (m) return parseInt(m[2], 10);
    return null;
  }
  const s = String(val).trim();
  const mMatch = s.match(/^(\d{1,2})(20\d{2})$/);
  if (mMatch) return parseInt(mMatch[2], 10);
  const m = s.match(/(20\d{2})/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function parseYearFromStatus(val) {
  if (!val || typeof val !== 'string') return null;
  const m = val.match(/(\d{2})/);
  if (m) {
    const yy = parseInt(m[1], 10);
    if (yy >= 15 && yy <= 35) return 2000 + yy;
  }
  return null;
}

async function testRowMapping() {
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(sheet['!ref']);
  const getCell = (r, c) => sheet[xlsx.utils.encode_cell({ r, c })]?.v;

  const validRows = [];
  for (let r = 11; r <= range.e.r; r++) {
    const rawLokasi = getCell(r, 3);
    if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
    if (rawLokasi === 1 || rawLokasi === '1') continue;

    const bt = parseYear(getCell(r, 53));
    const slsReal = parseYear(getCell(105));
    const slsRenc = parseYear(getCell(48));
    const mliReal = parseYear(getCell(104));
    const mliRenc = parseYear(getCell(47));
    const bkrReal = parseYear(getCell(72));
    const bkrRenc = parseYear(getCell(11));
    const stsRaw = getCell(r, 6);
    const stsYear = parseYearFromStatus(stsRaw);
    const snYear = parseYear(getCell(1)) || parseYear(getCell(52));

    const cycleYear = bt || slsReal || slsRenc || mliReal || mliRenc || stsYear || bkrReal || bkrRenc || snYear;
    if (!cycleYear || cycleYear < 2021 || cycleYear > 2028) continue;

    validRows.push({
      excelRow: r + 1,
      lokasi: String(rawLokasi).trim(),
      wilayah: getCell(r, 2) ? String(getCell(r, 2)).trim() : null,
      bruto: getCell(r, 4),
      netto: getCell(r, 5),
      sts: getCell(r, 6),
      eks: getCell(r, 7),
      sejarah: getCell(r, 8),
      phBk: getCell(r, 9),
      phSn: getCell(r, 10),
    });
  }

  console.log('Valid rows from Excel filter 2021-2028:', validRows.length);
  const dbLands = await prisma.land.findMany({ orderBy: { id: 'asc' } });
  console.log('Total DB lands:', dbLands.length);

  // Compare 1-to-1 by order index
  let matchingByIndex = 0;
  for (let i = 0; i < Math.min(validRows.length, dbLands.length); i++) {
    if (validRows[i].lokasi === dbLands[i].lokasi) {
      matchingByIndex++;
    }
  }
  console.log('Matching 1-to-1 by index:', matchingByIndex, 'out of', validRows.length);

  if (matchingByIndex === validRows.length) {
    console.log('PERFECT! DB Land table maps 100% row-for-row to Excel Sheet Master valid rows!');
  }

  await prisma.$disconnect();
}

testRowMapping().catch(console.error);
