const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];

console.log('=== COLUMNS 180 TO 260 IN MASTER ===');
for (let c = 180; c <= 260; c++) {
  let labels = [];
  for (let r = 5; r <= 9; r++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined && v !== '') labels.push(`r${r+1}:${v}`);
  }
  if (labels.length) {
    console.log(`c=${c} (Col ${c+1}, ${xlsx.utils.encode_col(c)}): ${labels.join(' | ')}`);
  }
}
