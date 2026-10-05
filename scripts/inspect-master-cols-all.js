const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];

console.log('--- ALL COLUMNS IN Master (rows 8 and 9) ---');
for (let c = 0; c <= 55; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  const r8 = ws[xlsx.utils.encode_cell({ r: 7, c })]?.v ?? '';
  const r9 = ws[xlsx.utils.encode_cell({ r: 8, c })]?.v ?? '';
  const r10 = ws[xlsx.utils.encode_cell({ r: 9, c })]?.v ?? '';
  console.log(`Col ${c+1} (${colLetter}): r8="${r8}" | r9="${r9}" | r10="${r10}"`);
}
