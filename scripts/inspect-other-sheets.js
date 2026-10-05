const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Update', 'Stok Lahan', 'Interval Bk-Bjk-Sn'], cellDates: false });

for (const name of ['Update', 'Stok Lahan', 'Interval Bk-Bjk-Sn']) {
  const ws = wb.Sheets[name];
  console.log(`\n=== SHEET: ${name} ===`);
  for (let r = 0; r <= 10; r++) {
    let rowVals = [];
    for (let c = 0; c <= 25; c++) {
      const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
      if (v !== undefined) rowVals.push(`c${c+1}:${v}`);
    }
    if (rowVals.length) console.log(`Row ${r+1}:`, rowVals.slice(0, 10).join(' | '));
  }
}
