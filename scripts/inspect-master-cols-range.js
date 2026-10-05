const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Master'];

console.log('--- MASTER SHEET ROWS 1-8 FOR COLS 15 to 55 ---');
for (let c = 15; c <= 55; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  let vals = [];
  for (let r = 0; r <= 7; r++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    vals.push(`R${r+1}:"${v !== undefined ? v : ''}"`);
  }
  console.log(`Col ${c+1} (${colLetter}): ${vals.join(', ')}`);
}
