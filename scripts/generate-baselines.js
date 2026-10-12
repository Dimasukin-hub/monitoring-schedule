const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6,
  jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12
};

function parseDateToMonth(val, targetYear = 2026) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    if (val.getFullYear() === targetYear) return val.getMonth() + 1;
    return null;
  }
  const s = String(val).trim();
  if (!s || s === '-' || s === '0' || s.toLowerCase() === 'null') return null;

  // DD/MM/YYYY
  const pSlash = s.split('/');
  if (pSlash.length === 3) {
    const m = parseInt(pSlash[1], 10);
    let y = parseInt(pSlash[2], 10);
    if (y < 100) y += 2000;
    if (y === targetYear && m >= 1 && m <= 12) return m;
  }

  // YYYY-MM-DD
  const pDash = s.split('-');
  if (pDash.length === 3 && pDash[0].length === 4) {
    const y = parseInt(pDash[0], 10);
    const m = parseInt(pDash[1], 10);
    if (y === targetYear && m >= 1 && m <= 12) return m;
  }

  // MMM-YY (e.g. Nov-26)
  if (pDash.length === 2) {
    const mStr = pDash[0].toLowerCase().slice(0, 3);
    let y = parseInt(pDash[1], 10);
    if (y < 100) y += 2000;
    if (y === targetYear && MONTH_MAP[mStr]) return MONTH_MAP[mStr];
  }

  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + num * 86400000);
    if (d.getFullYear() === targetYear) return d.getMonth() + 1;
  }

  return null;
}

async function run() {
  console.log('Reading Schedule 2026 Update 09.xlsx...');
  const wb = XLSX.readFile('excel/Schedule 2026 Update 09.xlsx');
  const sheet = wb.Sheets['Master'];

  const lands = await prisma.land.findMany({
    where: { year: 2026 },
    select: { id: true, lokasi: true, luasNetto: true, rencBkr: true, rencBajak: true, bulanSn: true, realBkr: true, realBajak: true },
    orderBy: { lokasi: 'asc' },
  });

  console.log(`Found ${lands.length} lands in DB for 2026.`);

  const result = {};

  for (const land of lands) {
    const lok = land.lokasi.trim();
    let bestRow = null;
    let candidateRows = [];

    // Search Master for matching row
    for (let r = 11; r <= 2600; r++) {
      const cellLok = sheet['D' + r]?.v;
      if (cellLok && String(cellLok).trim() === lok) {
        candidateRows.push(r);
      }
    }

    // Pick the row where year is 2026
    for (const r of candidateRows) {
      const ds = String(sheet['DS' + r]?.v || '');
      const dt = String(sheet['DT' + r]?.v || '');
      const du = String(sheet['DU' + r]?.v || '');
      const netto = Number(sheet['F' + r]?.v) || 0;

      if (ds.endsWith('2026') || dt.endsWith('2026') || du.endsWith('2026')) {
        bestRow = r;
        break;
      }
    }

    if (!bestRow && candidateRows.length > 0) {
      // Pick the row with closest netto or highest row number (later planting cycle)
      bestRow = candidateRows[candidateRows.length - 1];
    }

    let netto = land.luasNetto || 0;
    let baseRealBkr = null;
    let baseRealBajak = null;
    let baseBulanSn = null;
    let rencBkr = land.rencBkr || null;
    let rencBajak = land.rencBajak || null;
    let ds = '';
    let dt = '';
    let du = '';

    if (bestRow) {
      netto = Number(sheet['F' + bestRow]?.v) || netto;
      baseRealBkr = sheet['BU' + bestRow]?.v || null;
      baseRealBajak = sheet['BV' + bestRow]?.v || null;
      baseBulanSn = sheet['B' + bestRow]?.v || null;
      rencBkr = sheet['L' + bestRow]?.v || rencBkr;
      rencBajak = sheet['M' + bestRow]?.v || rencBajak;
      ds = String(sheet['DS' + bestRow]?.v || '');
      dt = String(sheet['DT' + bestRow]?.v || '');
      du = String(sheet['DU' + bestRow]?.v || '');
    }

    const baseRealBkrMonth = parseDateToMonth(baseRealBkr);
    const baseRealBajakMonth = parseDateToMonth(baseRealBajak);
    const baseRealSnMonth = parseDateToMonth(baseBulanSn);

    result[lok] = {
      netto: Math.round(netto * 100) / 100,
      baseRealBkr,
      baseRealBajak,
      baseBulanSn,
      baseRealBkrMonth,
      baseRealBajakMonth,
      baseRealSnMonth,
      rencBkr,
      rencBajak,
      ds,
      dt,
      du,
    };
  }

  const outPath = path.join(__dirname, '..', 'lib', 'lands2026Baselines.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`Saved ${Object.keys(result).length} lands to ${outPath}`);

  // Test 003D
  console.log('003D baseline:', result['003D']);
  await prisma.$disconnect();
}

run().catch(console.error);
