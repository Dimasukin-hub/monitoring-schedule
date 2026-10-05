const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];

console.log('=== ROW 1 to 9 IN MASTER SHEET ===');
for (let c = 0; c <= 60; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  const r1 = ws[xlsx.utils.encode_cell({ r: 0, c })]?.v;
  const r2 = ws[xlsx.utils.encode_cell({ r: 1, c })]?.v;
  const r8 = ws[xlsx.utils.encode_cell({ r: 7, c })]?.v;
  const r9 = ws[xlsx.utils.encode_cell({ r: 8, c })]?.v;
  console.log(`Col ${c+1} (${colLetter}): r1="${r1 ?? ''}" | r8="${r8 ?? ''}" | r9="${r9 ?? ''}"`);
}
