const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');

console.log('--- ALL COLUMNS IN MASTER SHEET (0 to ' + range.e.c + ') ---');
for (let c = 0; c <= range.e.c; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  const r7 = ws[xlsx.utils.encode_cell({ r: 6, c })]?.v;
  const r8 = ws[xlsx.utils.encode_cell({ r: 7, c })]?.v;
  const r9 = ws[xlsx.utils.encode_cell({ r: 8, c })]?.v;
  if (r7 || r8 || r9) {
    console.log(`c=${c} | Col ${c+1} (${colLetter}): r7="${r7 || ''}" | r8="${r8 || ''}" | r9="${r9 || ''}"`);
  }
}
