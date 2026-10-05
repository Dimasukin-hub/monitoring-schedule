const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
    for (let c = 0; c <= Math.min(range.e.c, 100); c++) {
      const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
      if (v === 11 || v === '11') {
        // check nearby cells in this col or row
        let colCells = [];
        for (let r2 = 0; r2 <= Math.min(range.e.r, 15); r2++) {
          const v2 = ws[xlsx.utils.encode_cell({ r: r2, c })]?.v;
          if (v2 !== undefined) colCells.push(`r${r2+1}:${v2}`);
        }
        console.log(`Sheet "${name}", col ${c+1} (${xlsx.utils.encode_col(c)}), row ${r+1} has 11: ${colCells.join(' | ')}`);
      }
    }
  }
}
