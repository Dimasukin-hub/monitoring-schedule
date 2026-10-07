const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellFormula: true });
const ws = wb.Sheets['Master'];

console.log('=== ROW 1552 DETAILS ===');
for (let c = 0; c <= 12; c++) {
  const addr = xlsx.utils.encode_cell({ r: 1551, c });
  const cell = ws[addr];
  console.log(`${addr} (${xlsx.utils.encode_col(c)}): val=${cell?.v}, f=${cell?.f}`);
}

console.log('\n=== ROWS 2618-2625 DETAILS ===');
for (let r = 2617; r <= 2624; r++) {
  const rowVals = [];
  for (let c = 2; c <= 10; c++) {
    const addr = xlsx.utils.encode_cell({ r, c });
    const cell = ws[addr];
    rowVals.push(`${xlsx.utils.encode_col(c)}:${cell?.v}${cell?.f ? ' [f:' + cell.f + ']' : ''}`);
  }
  console.log(`Row ${r+1}: ${rowVals.join(' | ')}`);
}
