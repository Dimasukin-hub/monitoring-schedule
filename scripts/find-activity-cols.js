const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

console.log('Sheet names:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  if (!ws) continue;
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');
  console.log(`\n=== SHEET: ${name} (rows: ${range.e.r + 1}, cols: ${range.e.c + 1}) ===`);
  
  // Search for chopper, kompos, MB 5, ridger, Jalan & Sal
  for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
    let foundTerms = [];
    for (let c = 0; c <= Math.min(range.e.c, 60); c++) {
      const cell = ws[xlsx.utils.encode_cell({ r, c })];
      if (cell && cell.v) {
        const val = String(cell.v).toLowerCase();
        if (val.includes('chopper') || val.includes('kompos') || val.includes('ridger') || val.includes('mb 5') || val.includes('jalan')) {
          foundTerms.push(`c${c} (${xlsx.utils.encode_col(c)}): ${cell.v}`);
        }
      }
    }
    if (foundTerms.length > 0) {
      console.log(`  Row ${r + 1} matches:`, foundTerms.join(' | '));
    }
  }
}
