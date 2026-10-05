const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Rcn BERJLN Fsk', 'Master'], cellDates: false });

console.log('--- SHEET: Rcn BERJLN Fsk ---');
const wsRcn = wb.Sheets['Rcn BERJLN Fsk'];
for (let r = 0; r <= 15; r++) {
  let rowVals = [];
  for (let c = 0; c <= 55; c++) {
    const v = wsRcn[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined) {
      rowVals.push(`[c${c+1}|${xlsx.utils.encode_col(c)}:${v}]`);
    }
  }
  if (rowVals.length) {
    console.log(`Row ${r+1}:`, rowVals.slice(0, 15).join(' '));
  }
}
