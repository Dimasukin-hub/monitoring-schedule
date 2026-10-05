const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Rcn BERJLN Fsk'], cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

console.log('=== Rcn BERJLN Fsk: Rows 136-148 for Chopper, Kompos, MB 5, Ridger, Jalan & Sal ===');
for (let r = 135; r <= 147; r++) {
  const monthLabel = ws[xlsx.utils.encode_cell({ r, c: 0 })]?.v;
  let vals = [];
  for (let c = 3; c <= 41; c++) {
    const actName = ws[xlsx.utils.encode_cell({ r: 6, c })]?.v;
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined && v !== 0 && v !== '0') {
      vals.push(`${actName}(c${c+1}):${v}`);
    }
  }
  console.log(`Row ${r+1} (${monthLabel}):`, vals.slice(0, 10).join(' | '));
}
