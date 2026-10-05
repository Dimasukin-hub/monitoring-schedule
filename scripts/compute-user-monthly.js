const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');

const months = ['Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26'];

// Calculate using user's exact column range:
// Bongkar: Chopper (13) to Kompos (22) for Rencana; 74 to 83 for Realisasi
// Bajak: MB 5 BTR (25) to Ridger (43) for Rencana; 84 to 101 for Realisasi
// Siap Tanam: Jalan & Sal (44) for Rencana; 102 for Realisasi

let res = {
  bongkar: { renc: Array(12).fill(0), real: Array(12).fill(0) },
  bajak: { renc: Array(12).fill(0), real: Array(12).fill(0) },
  siapTanam: { renc: Array(12).fill(0), real: Array(12).fill(0) },
};

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

const BONGKAR_RENC_COLS = []; for (let c = 13; c <= 22; c++) BONGKAR_RENC_COLS.push(c);
const BONGKAR_REAL_COLS = []; for (let c = 74; c <= 83; c++) BONGKAR_REAL_COLS.push(c);

const BAJAK_RENC_COLS = []; for (let c = 25; c <= 43; c++) BAJAK_RENC_COLS.push(c);
const BAJAK_REAL_COLS = []; for (let c = 84; c <= 101; c++) BAJAK_REAL_COLS.push(c);

const SN_RENC_COLS = [44];
const SN_REAL_COLS = [102];

for (let r = 11; r <= range.e.r; r++) {
  const netto = parseFloat(ws[xlsx.utils.encode_cell({ r, c: 5 })]?.v) || 0;
  if (netto <= 0) continue;

  // Bongkar
  const bkR = getMinDate(r, BONGKAR_RENC_COLS);
  const bkA = getMinDate(r, BONGKAR_REAL_COLS);
  if (bkR && bkR.y === 2026) res.bongkar.renc[bkR.m - 1] += netto;
  if (bkA && bkA.y === 2026) res.bongkar.real[bkA.m - 1] += netto;

  // Bajak
  const bjR = getMinDate(r, BAJAK_RENC_COLS);
  const bjA = getMinDate(r, BAJAK_REAL_COLS);
  if (bjR && bjR.y === 2026) res.bajak.renc[bjR.m - 1] += netto;
  if (bjA && bjA.y === 2026) res.bajak.real[bjA.m - 1] += netto;

  // Siap Tanam
  const snR = getMinDate(r, SN_RENC_COLS);
  const snA = getMinDate(r, SN_REAL_COLS);
  if (snR && snR.y === 2026) res.siapTanam.renc[snR.m - 1] += netto;
  if (snA && snA.y === 2026) res.siapTanam.real[snA.m - 1] += netto;
}

console.log('=== SUMMARY OF EXACT USER COLUMNS (2026) ===');
console.log('\n--- BONGKAR ---');
console.table(months.map((m, i) => ({
  month: m,
  rencana: res.bongkar.renc[i].toFixed(2),
  realisasi: res.bongkar.real[i].toFixed(2),
  diff: (res.bongkar.real[i] - res.bongkar.renc[i]).toFixed(2),
})));

console.log('\n--- BAJAK ---');
console.table(months.map((m, i) => ({
  month: m,
  rencana: res.bajak.renc[i].toFixed(2),
  realisasi: res.bajak.real[i].toFixed(2),
  diff: (res.bajak.real[i] - res.bajak.renc[i]).toFixed(2),
})));

console.log('\n--- SIAP TANAM ---');
console.table(months.map((m, i) => ({
  month: m,
  rencana: res.siapTanam.renc[i].toFixed(2),
  realisasi: res.siapTanam.real[i].toFixed(2),
  diff: (res.siapTanam.real[i] - res.siapTanam.renc[i]).toFixed(2),
})));
