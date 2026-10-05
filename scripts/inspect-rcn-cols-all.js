const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Rcn BERJLN Fsk'], cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

console.log('--- ALL COLUMNS IN Rcn BERJLN Fsk (rows 4 to 8) ---');
for (let c = 0; c <= 55; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  const r4 = ws[xlsx.utils.encode_cell({ r: 3, c })]?.v ?? '';
  const r5 = ws[xlsx.utils.encode_cell({ r: 4, c })]?.v ?? '';
  const r6 = ws[xlsx.utils.encode_cell({ r: 5, c })]?.v ?? '';
  const r7 = ws[xlsx.utils.encode_cell({ r: 6, c })]?.v ?? '';
  const r8 = ws[xlsx.utils.encode_cell({ r: 7, c })]?.v ?? '';
  console.log(`Col ${c+1} (${colLetter}): r4="${r4}" | r6="${r6}" | r7="${r7}" | r8="${r8}"`);
}
