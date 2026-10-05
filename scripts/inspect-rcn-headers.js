const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

console.log('--- Rcn BERJLN Fsk ROWS 5-10 FOR COLS 1 to 50 ---');
for (let c = 0; c <= 50; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  let vals = [];
  for (let r = 4; r <= 9; r++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined && String(v).trim() !== '') {
      vals.push(`R${r+1}:"${String(v).trim()}"`);
    }
  }
  if (vals.length > 0) {
    console.log(`Col ${c+1} (${colLetter}): ${vals.join(', ')}`);
  }
}
