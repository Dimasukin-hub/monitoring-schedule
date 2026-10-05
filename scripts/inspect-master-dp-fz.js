const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Master'];

console.log('--- MASTER COLUMNS DP to FZ (headers and formulas in row 12) ---');
for (let c = 118; c <= 165; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  const r8 = ws[xlsx.utils.encode_cell({ r: 7, c })]?.v;
  const r9 = ws[xlsx.utils.encode_cell({ r: 8, c })]?.v;
  const cell12 = ws[xlsx.utils.encode_cell({ r: 11, c })];
  const f12 = cell12?.f;
  const v12 = cell12?.v;
  console.log(`Col ${c+1} (${colLetter}): Header='${r8 || ''}' / '${r9 || ''}' | Cell12=[val:${v12}, formula:${f12 || 'none'}]`);
}
