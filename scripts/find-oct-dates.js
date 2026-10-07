const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelDir = path.join(__dirname, '..', 'excel');
const files = fs.readdirSync(excelDir).filter(f => f.endsWith('.xlsx'));

console.log('Searching in Excel files:', files);

// Excel serial dates:
// 1 Oct 2026 = 46296
// 2 Oct 2026 = 46297
// 3 Oct 2026 = 46298
// 4 Oct 2026 = 46299
// 5 Oct 2026 = 46300
// 6 Oct 2026 = 46301

for (const file of files) {
  const wb = xlsx.readFile(path.join(excelDir, file));
  console.log(`\n=== File: ${file} ===`);
  for (const sName of wb.SheetNames) {
    const ws = wb.Sheets[sName];
    if (!ws['!ref']) continue;
    const range = xlsx.utils.decode_range(ws['!ref']);
    let matches = [];
    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= Math.min(range.e.c, 120); c++) {
        const val = ws[xlsx.utils.encode_cell({ r, c })]?.v;
        if (typeof val === 'number' && val >= 46296 && val <= 46305) {
          matches.push({ r: r + 1, c: xlsx.utils.encode_col(c), val });
        } else if (typeof val === 'string' && (val.includes('/10/2026') || val.includes('/10/26') || val.includes('-10-2026'))) {
          matches.push({ r: r + 1, c: xlsx.utils.encode_col(c), val });
        }
      }
    }
    if (matches.length > 0) {
      console.log(`Sheet '${sName}' has ${matches.length} matches for 1-6 Oct 2026. Samples:`, matches.slice(0, 5));
    }
  }
}
