const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
    for (let c = 0; c <= Math.min(range.e.c, 60); c++) {
      const v = String(ws[xlsx.utils.encode_cell({ r, c })]?.v || '').trim();
      if (v.toLowerCase() === 'chopper') {
        console.log(`Sheet "${name}", row ${r+1}, col ${c+1} (${xlsx.utils.encode_col(c)}): "${v}"`);
      }
    }
  }
}
