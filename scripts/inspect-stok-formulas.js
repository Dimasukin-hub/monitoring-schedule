const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
// Load with formulas!
const wb = xlsx.readFile(filePath, { cellFormula: true, cellDates: false });
const ws = wb.Sheets['Stok Lahan'];

console.log('=== FORMULAS IN STOK LAHAN ROWS 58-62 ===');
for (let r = 57; r <= 62; r++) {
  const cat = ws[xlsx.utils.encode_cell({ r, c: 1 })]?.v;
  console.log(`\nRow ${r+1} (${cat}):`);
  for (let c = 4; c <= 16; c++) {
    const colName = xlsx.utils.encode_col(c);
    const cell = ws[xlsx.utils.encode_cell({ r, c })];
    console.log(`  Col ${colName}: value=${cell?.v}, formula=${cell?.f}`);
  }
}
