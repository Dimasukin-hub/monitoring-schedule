const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Stok Lahan'], cellDates: false });
const ws = wb.Sheets['Stok Lahan'];

const range = xlsx.utils.decode_range(ws['!ref']);
console.log(`=== STOK LAHAN (rows: ${range.e.r + 1}, cols: ${range.e.c + 1}) ===`);

for (let r = 0; r <= range.e.r; r++) {
  let rowVals = [];
  for (let c = 0; c <= Math.min(range.e.c, 25); c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined) rowVals.push(`c${c+1}:${v}`);
  }
  if (rowVals.length) {
    console.log(`Row ${r+1}:`, rowVals.slice(0, 10).join(' | '));
  }
}
