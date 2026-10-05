const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Stok Lahan'];

console.log('--- STOK LAHAN ROWS 56-65 ---');
for (let r = 55; r <= 65; r++) {
  let rowVals = [];
  for (let c = 0; c <= 18; c++) {
    const cell = ws[xlsx.utils.encode_cell({ r, c })];
    if (cell) {
      rowVals.push(`c${c+1}(${xlsx.utils.encode_col(c)}):[val=${cell.v}, f=${cell.f || ''}]`);
    }
  }
  console.log(`Row ${r+1}:`, rowVals.join(' | '));
}
