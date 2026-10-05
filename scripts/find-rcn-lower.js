const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Rcn BERJLN Fsk'], cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

for (let r = 148; r <= 260; r++) {
  let rowVals = [];
  for (let c = 0; c <= 10; c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined) rowVals.push(`c${c+1}:${v}`);
  }
  if (rowVals.length) {
    console.log(`Row ${r+1}:`, rowVals.join(' | '));
  }
}
