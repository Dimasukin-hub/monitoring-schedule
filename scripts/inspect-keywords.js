const xlsx = require('xlsx');
const wb = xlsx.readFile('excel/Monitor Schedule - 2026.xlsx');

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  if (!ws['!ref']) continue;
  const range = xlsx.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[xlsx.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'string') {
        const val = cell.v.toLowerCase();
        if (val.includes('leadtime') || val.includes('progress') || val.includes('rerata') || val.includes('rata')) {
          console.log('[' + sheetName + '] ' + xlsx.utils.encode_cell({ r, c }) + ': ' + cell.v);
        }
      }
    }
  }
}
