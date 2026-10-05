const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Master'];

console.log('--- ALL COLUMNS IN Master (Cols 1 to 60) ---');
for (let c = 0; c <= 60; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  let rVals = [];
  for (let r = 0; r <= 10; r++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined && String(v).trim() !== '') {
      rVals.push(`r${r+1}:${v}`);
    }
  }
  if (rVals.length > 0) {
    console.log(`c=${c} | Col ${c+1} (${colLetter}): ${rVals.join(' | ')}`);
  }
}
