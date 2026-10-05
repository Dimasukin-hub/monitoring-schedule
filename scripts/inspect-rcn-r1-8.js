const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

console.log('--- Rcn BERJLN Fsk Rows 1-8 all columns ---');
for (let r = 0; r <= 8; r++) {
  let rowVals = [];
  for (let c = 0; c <= 50; c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined) {
      rowVals.push(`c${c+1}(${xlsx.utils.encode_col(c)}):${v}`);
    }
  }
  console.log(`Row ${r+1}:`, rowVals.join(' | '));
}
