const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellFormula: true });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref']);

console.log('Total rows:', range.e.r + 1);

const colsToCheck = [
  { c: 2, colLetter: 'C', name: 'WIL' },
  { c: 3, colLetter: 'D', name: 'LOKASI' },
  { c: 4, colLetter: 'E', name: 'LUAS BRUTO' },
  { c: 5, colLetter: 'F', name: 'LUAS NETTO' },
  { c: 6, colLetter: 'G', name: 'STS' },
  { c: 7, colLetter: 'H', name: 'Eks' },
  { c: 8, colLetter: 'I', name: 'Sejarah PS' },
  { c: 9, colLetter: 'J', name: 'pH BK' },
  { c: 10, colLetter: 'K', name: 'pH SN' },
];

const formulaSummary = {};
colsToCheck.forEach(col => {
  formulaSummary[col.colLetter] = { name: col.name, formulas: new Set(), sampleFormulas: [], countWithFormula: 0, countWithValue: 0 };
});

let validDataRowCount = 0;

for (let r = 11; r <= range.e.r; r++) {
  const lokasiCell = ws[xlsx.utils.encode_cell({ r, c: 3 })];
  if (!lokasiCell || lokasiCell.v === undefined || String(lokasiCell.v).trim() === '') {
    continue;
  }
  validDataRowCount++;

  for (const col of colsToCheck) {
    const addr = xlsx.utils.encode_cell({ r, c: col.c });
    const cell = ws[addr];
    if (cell && cell.v !== undefined) {
      formulaSummary[col.colLetter].countWithValue++;
      if (cell.f) {
        formulaSummary[col.colLetter].countWithFormula++;
        formulaSummary[col.colLetter].formulas.add(cell.f);
        if (formulaSummary[col.colLetter].sampleFormulas.length < 5) {
          formulaSummary[col.colLetter].sampleFormulas.push(`${addr}: ${cell.f} = ${cell.v}`);
        }
      }
    }
  }
}

console.log('Total valid data rows with LOKASI:', validDataRowCount);
console.log('\n=== FORMULA CHECK RESULT FOR COLS C TO K ===');
for (const col of colsToCheck) {
  const summary = formulaSummary[col.colLetter];
  console.log(`\nCol ${col.colLetter} [${summary.name}]:`);
  console.log(`  - Non-empty values: ${summary.countWithValue}`);
  console.log(`  - Rows with formulas: ${summary.countWithFormula}`);
  if (summary.countWithFormula > 0) {
    console.log(`  - Distinct formulas: ${summary.formulas.size}`);
    console.log(`  - Samples:`, summary.sampleFormulas);
  } else {
    console.log(`  - TIDAK ADA RUMUS (Semua nilai adalah raw static value / text / angka langsung)`);
  }
}
