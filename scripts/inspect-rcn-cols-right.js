const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Rcn BERJLN Fsk'], cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

console.log('=== COLUMNS 56-110 in Rcn BERJLN Fsk ===');
for (let c = 55; c <= 110; c++) {
  let labels = [];
  for (let r = 1; r <= 7; r++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined && v !== '') labels.push(`r${r+1}:${v}`);
  }
  if (labels.length) {
    console.log(`c=${c} (Col ${c+1}, ${xlsx.utils.encode_col(c)}): ${labels.join(' | ')}`);
  }
}
