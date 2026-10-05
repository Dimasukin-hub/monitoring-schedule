const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');

// Column mappings in Master (0-indexed)
// Rencana:
// Chopper (N: 13) to Kompos (W: 22)
// MB 5 BTR (Z: 25) to Ridger (AR: 43)
// Jalan & Sal (AS: 44)
const BONGKAR_RENC_COLS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22]; // N to W
const BAJAK_RENC_COLS = [];
for (let c = 25; c <= 43; c++) BAJAK_RENC_COLS.push(c); // Z to AR
const SN_RENC_COLS = [44]; // AS

// Realisasi:
// Chopper (BW: 74) to Kompos (CF: 83)
// MB 5 BTR (CG: 84) to Ridger (CX: 101)
// Jalan & Sal (CY: 102)
const BONGKAR_REAL_COLS = [74, 75, 76, 77, 78, 79, 80, 81, 82, 83];
const BAJAK_REAL_COLS = [];
for (let c = 84; c <= 101; c++) BAJAK_REAL_COLS.push(c);
const SN_REAL_COLS = [102];

function getDateObj(val) {
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    const d = xlsx.SSF.parse_date_code(val);
    return { y: d.y, m: d.m };
  }
  return null;
}

// How should multiple columns for a single location be combined?
// Does each location have ONE date for the phase (e.g. min or max date among the activities, or first activity date)?
// Let's test different approaches:
// Approach A: Earliest activity date in the phase for that location
// Approach B: Latest activity date in the phase for that location
// Approach C: Sum of each activity per month? (Wait, if 1 location has 10 activities, does it count 10 times? Usually not, or does it count per location?)
// Approach D: Specific milestone activity (e.g. Chopper for Bongkar, MB 5 BTR for Bajak, Jalan & Sal for SN)?

console.log('Total rows in Master:', range.e.r + 1);

// Let's check Approach D first (Chopper, MB 5 BTR, Jalan & Sal):
let monthlyD = {
  bongkar: { renc: Array(12).fill(0), real: Array(12).fill(0) },
  bajak: { renc: Array(12).fill(0), real: Array(12).fill(0) },
  sn: { renc: Array(12).fill(0), real: Array(12).fill(0) },
};

// Let's check Approach A (Min date among the columns for each row):
let monthlyMin = {
  bongkar: { renc: Array(12).fill(0), real: Array(12).fill(0) },
  bajak: { renc: Array(12).fill(0), real: Array(12).fill(0) },
  sn: { renc: Array(12).fill(0), real: Array(12).fill(0) },
};

// Let's check Approach B (Max date among the columns for each row):
let monthlyMax = {
  bongkar: { renc: Array(12).fill(0), real: Array(12).fill(0) },
  bajak: { renc: Array(12).fill(0), real: Array(12).fill(0) },
  sn: { renc: Array(12).fill(0), real: Array(12).fill(0) },
};

for (let r = 11; r <= range.e.r; r++) {
  const netto = parseFloat(ws[xlsx.utils.encode_cell({ r, c: 5 })]?.v); // Col F
  if (isNaN(netto) || netto <= 0) continue;

  // Approach D: Single Milestone
  const chR = getDateObj(ws[xlsx.utils.encode_cell({ r, c: 13 })]?.v);
  const chA = getDateObj(ws[xlsx.utils.encode_cell({ r, c: 74 })]?.v);
  if (chR && chR.y === 2026) monthlyD.bongkar.renc[chR.m - 1] += netto;
  if (chA && chA.y === 2026) monthlyD.bongkar.real[chA.m - 1] += netto;

  const mbR = getDateObj(ws[xlsx.utils.encode_cell({ r, c: 25 })]?.v);
  const mbA = getDateObj(ws[xlsx.utils.encode_cell({ r, c: 84 })]?.v);
  if (mbR && mbR.y === 2026) monthlyD.bajak.renc[mbR.m - 1] += netto;
  if (mbA && mbA.y === 2026) monthlyD.bajak.real[mbA.m - 1] += netto;

  const jsR = getDateObj(ws[xlsx.utils.encode_cell({ r, c: 44 })]?.v);
  const jsA = getDateObj(ws[xlsx.utils.encode_cell({ r, c: 102 })]?.v);
  if (jsR && jsR.y === 2026) monthlyD.sn.renc[jsR.m - 1] += netto;
  if (jsA && jsA.y === 2026) monthlyD.sn.real[jsA.m - 1] += netto;

  // Helper for phase min/max
  const getPhaseDate = (cols, mode) => {
    let bestVal = null;
    let bestDate = null;
    for (const c of cols) {
      const cellVal = ws[xlsx.utils.encode_cell({ r, c })]?.v;
      if (typeof cellVal === 'number' && cellVal > 40000 && cellVal < 60000) {
        if (bestVal === null || (mode === 'min' ? cellVal < bestVal : cellVal > bestVal)) {
          bestVal = cellVal;
          bestDate = xlsx.SSF.parse_date_code(cellVal);
        }
      }
    }
    return bestDate;
  };

  // Min dates
  const bkR_min = getPhaseDate(BONGKAR_RENC_COLS, 'min');
  const bkA_min = getPhaseDate(BONGKAR_REAL_COLS, 'min');
  if (bkR_min && bkR_min.y === 2026) monthlyMin.bongkar.renc[bkR_min.m - 1] += netto;
  if (bkA_min && bkA_min.y === 2026) monthlyMin.bongkar.real[bkA_min.m - 1] += netto;

  const bjR_min = getPhaseDate(BAJAK_RENC_COLS, 'min');
  const bjA_min = getPhaseDate(BAJAK_REAL_COLS, 'min');
  if (bjR_min && bjR_min.y === 2026) monthlyMin.bajak.renc[bjR_min.m - 1] += netto;
  if (bjA_min && bjA_min.y === 2026) monthlyMin.bajak.real[bjA_min.m - 1] += netto;

  const snR_min = getPhaseDate(SN_RENC_COLS, 'min');
  const snA_min = getPhaseDate(SN_REAL_COLS, 'min');
  if (snR_min && snR_min.y === 2026) monthlyMin.sn.renc[snR_min.m - 1] += netto;
  if (snA_min && snA_min.y === 2026) monthlyMin.sn.real[snA_min.m - 1] += netto;

  // Max dates
  const bkR_max = getPhaseDate(BONGKAR_RENC_COLS, 'max');
  const bkA_max = getPhaseDate(BONGKAR_REAL_COLS, 'max');
  if (bkR_max && bkR_max.y === 2026) monthlyMax.bongkar.renc[bkR_max.m - 1] += netto;
  if (bkA_max && bkA_max.y === 2026) monthlyMax.bongkar.real[bkA_max.m - 1] += netto;

  const bjR_max = getPhaseDate(BAJAK_RENC_COLS, 'max');
  const bjA_max = getPhaseDate(BAJAK_REAL_COLS, 'max');
  if (bjR_max && bjR_max.y === 2026) monthlyMax.bajak.renc[bjR_max.m - 1] += netto;
  if (bjA_max && bjA_max.y === 2026) monthlyMax.bajak.real[bjA_max.m - 1] += netto;
}

const months = ['Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26'];
console.log('\n--- APPROACH D: SINGLE MILESTONE (Chopper, MB 5 BTR, Jalan & Sal) ---');
console.table(months.map((m, i) => ({
  month: m,
  bk_renc: monthlyD.bongkar.renc[i].toFixed(2),
  bk_real: monthlyD.bongkar.real[i].toFixed(2),
  bj_renc: monthlyD.bajak.renc[i].toFixed(2),
  bj_real: monthlyD.bajak.real[i].toFixed(2),
  sn_renc: monthlyD.sn.renc[i].toFixed(2),
  sn_real: monthlyD.sn.real[i].toFixed(2),
})));

console.log('\n--- APPROACH A: MIN DATE IN RANGE (Chopper..Kompos, MB 5 BTR..Ridger, Jalan & Sal) ---');
console.table(months.map((m, i) => ({
  month: m,
  bk_renc: monthlyMin.bongkar.renc[i].toFixed(2),
  bk_real: monthlyMin.bongkar.real[i].toFixed(2),
  bj_renc: monthlyMin.bajak.renc[i].toFixed(2),
  bj_real: monthlyMin.bajak.real[i].toFixed(2),
  sn_renc: monthlyMin.sn.renc[i].toFixed(2),
  sn_real: monthlyMin.sn.real[i].toFixed(2),
})));

console.log('\n--- APPROACH B: MAX DATE IN RANGE ---');
console.table(months.map((m, i) => ({
  month: m,
  bk_renc: monthlyMax.bongkar.renc[i].toFixed(2),
  bk_real: monthlyMax.bongkar.real[i].toFixed(2),
  bj_renc: monthlyMax.bajak.renc[i].toFixed(2),
  bj_real: monthlyMax.bajak.real[i].toFixed(2),
})));
