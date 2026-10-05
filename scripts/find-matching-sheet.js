const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  if (!ws) continue;
  console.log(`\n================ SHEET: ${name} ================`);
  for (let r = 0; r <= 25; r++) {
    // Check col 10 (c=10 or c=11), col 19 (c=19 or c=20), col 22 (c=22 or c=23), col 40 (c=40 or c=41), col 41 (c=41 or c=42)
    // Check both 0-indexed and 1-indexed
    let rowVals = {};
    for (let c = 0; c <= 60; c++) {
      const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
      if (v !== undefined) {
        rowVals[c] = String(v).trim();
      }
    }
    // Check if this row mentions chopper/kompos/mb/ridger
    const str = Object.values(rowVals).join(' ').toLowerCase();
    if (str.includes('chopper') || str.includes('kompos') || str.includes('ridger') || str.includes('jalan')) {
      console.log(`Row ${r+1}:`);
      [10, 11, 12, 13, 14, 19, 20, 21, 22, 23, 24, 40, 41, 42, 43].forEach(c => {
        if (rowVals[c] !== undefined) {
          console.log(`  Col index ${c} (Col ${c+1}, ${xlsx.utils.encode_col(c)}): "${rowVals[c]}"`);
        }
      });
    }
  }
}
