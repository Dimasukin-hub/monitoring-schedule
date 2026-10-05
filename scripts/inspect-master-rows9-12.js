const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];

console.log('=== ROWS 9 to 12 IN MASTER SHEET ===');
for (let r = 8; r <= 11; r++) {
  console.log(`\n--- Row ${r+1} ---`);
  for (let c = 0; c <= 55; c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined) {
      process.stdout.write(`[c${c+1}|${xlsx.utils.encode_col(c)}:${v}] `);
    }
  }
}
console.log();
